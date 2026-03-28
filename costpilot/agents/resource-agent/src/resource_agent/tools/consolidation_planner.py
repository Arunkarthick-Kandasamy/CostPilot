from crewai.tools import tool
from sqlalchemy import text
from costpilot_common.database import SessionLocal


@tool("Find Consolidation Opportunities")
def find_consolidation_opportunities() -> str:
    """Identify resources that can be consolidated: idle servers, duplicate tools, underused licenses."""
    db = SessionLocal()
    try:
        # Idle servers (avg CPU < 10%)
        servers = db.execute(text("""
            SELECT s.id, s.name, s.monthly_cost,
                   AVG(m.cpu_pct) as avg_cpu, 'idle_server' as opportunity_type
            FROM servers s
            JOIN server_metrics m ON m.server_id = s.id
            WHERE m.recorded_at >= NOW() - INTERVAL '7 days'
            GROUP BY s.id, s.name, s.monthly_cost
            HAVING AVG(m.cpu_pct) < 10
        """))
        idle_servers = [dict(r._mapping) for r in servers]

        # Unused licenses
        licenses = db.execute(text("""
            SELECT t.id, t.name, t.cost_per_license,
                   (t.total_licenses - t.used_licenses) as unused_count,
                   (t.total_licenses - t.used_licenses) * t.cost_per_license as waste_amount,
                   'unused_license' as opportunity_type
            FROM software_tools t
            WHERE (t.total_licenses - t.used_licenses) > 0
        """))
        unused_licenses = [dict(r._mapping) for r in licenses]

        import json
        return json.dumps({"idle_servers": idle_servers, "unused_licenses": unused_licenses}, default=str)
    finally:
        db.close()
