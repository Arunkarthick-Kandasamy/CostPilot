from crewai.tools import tool
from sqlalchemy import text
from costpilot_common.database import SessionLocal


@tool("Get Budget Variance")
def get_budget_variance() -> str:
    """Compare budget vs actual spending by department and category."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT b.department, b.category,
                   b.budgeted_amount, b.actual_amount,
                   (b.actual_amount - b.budgeted_amount) as variance,
                   ROUND(((b.actual_amount - b.budgeted_amount) / b.budgeted_amount * 100)::numeric, 1) as variance_pct,
                   b.period
            FROM budget_vs_actual b
            WHERE b.period = (SELECT MAX(period) FROM budget_vs_actual)
            ORDER BY ABS(b.actual_amount - b.budgeted_amount) DESC
        """))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()
