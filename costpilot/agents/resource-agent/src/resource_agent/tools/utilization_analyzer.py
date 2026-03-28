from crewai.tools import tool
from sqlalchemy import text
from costpilot_common.database import SessionLocal


@tool("Get License Utilization")
def get_license_utilization() -> str:
    """Get software license utilization across teams. Identifies unused licenses."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT t.id as tool_id, t.name as tool_name,
                   t.total_licenses, t.used_licenses,
                   t.cost_per_license, t.annual_cost,
                   (t.total_licenses - t.used_licenses) as unused,
                   ROUND((t.used_licenses::numeric / t.total_licenses * 100), 1) as utilization_pct
            FROM software_tools t
            ORDER BY (t.total_licenses - t.used_licenses) * t.cost_per_license DESC
        """))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()


@tool("Get Infrastructure Utilization")
def get_infrastructure_utilization() -> str:
    """Get server/VM utilization metrics. Identifies idle infrastructure."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT s.id, s.name, s.type,
                   AVG(m.cpu_pct) as avg_cpu,
                   AVG(m.memory_pct) as avg_memory,
                   AVG(m.storage_pct) as avg_storage,
                   s.monthly_cost
            FROM servers s
            JOIN server_metrics m ON m.server_id = s.id
            WHERE m.recorded_at >= NOW() - INTERVAL '7 days'
            GROUP BY s.id, s.name, s.type, s.monthly_cost
            ORDER BY AVG(m.cpu_pct) ASC
        """))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()
