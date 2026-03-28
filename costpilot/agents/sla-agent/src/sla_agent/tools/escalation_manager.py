from crewai.tools import tool
from sqlalchemy import text
from costpilot_common.database import SessionLocal


@tool("Get Team Capacity")
def get_team_capacity() -> str:
    """Check current team capacity and resource availability for reallocation."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT t.id as team_id, t.name as team_name,
                   t.member_count, t.current_utilization_pct,
                   (100 - t.current_utilization_pct) as available_capacity_pct,
                   t.skills
            FROM teams t
            WHERE t.current_utilization_pct < 90
            ORDER BY t.current_utilization_pct ASC
        """))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()


@tool("Get Penalty Schedule")
def get_penalty_schedule() -> str:
    """Get financial penalty schedule for SLA breaches per service."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT s.name as service_name, p.breach_type,
                   p.penalty_amount, p.escalation_hours
            FROM sla_penalties p
            JOIN services s ON s.id = p.service_id
            ORDER BY p.penalty_amount DESC
        """))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()
