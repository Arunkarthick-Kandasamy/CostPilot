from crewai.tools import tool
from sqlalchemy import text
from costpilot_common.database import SessionLocal


@tool("Get Reconciliation Status")
def get_reconciliation_status() -> str:
    """Get current status of financial reconciliation -- matched vs unmatched counts."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT
                COUNT(*) FILTER (WHERE reconciled = true) as reconciled_count,
                COUNT(*) FILTER (WHERE reconciled = false) as unreconciled_count,
                SUM(amount) FILTER (WHERE reconciled = false) as unreconciled_amount
            FROM invoices
        """))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()
