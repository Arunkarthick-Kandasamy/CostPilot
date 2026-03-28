from crewai.tools import tool
from sqlalchemy import text
from costpilot_common.database import SessionLocal


@tool("Get Cost Allocation By Team")
def get_cost_allocation_by_team() -> str:
    """Get cost allocation breakdown by team and category."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT t.name as team_name, ca.category,
                   SUM(ca.amount) as total_cost
            FROM cost_allocations ca
            JOIN teams t ON t.id = ca.team_id
            GROUP BY t.name, ca.category
            ORDER BY SUM(ca.amount) DESC
        """))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()
