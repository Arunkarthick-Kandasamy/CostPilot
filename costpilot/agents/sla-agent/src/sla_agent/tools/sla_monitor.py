from crewai.tools import tool
from sqlalchemy import text
from costpilot_common.database import SessionLocal


@tool("Get SLA Metrics")
def get_sla_metrics(hours: int = 24) -> str:
    """Get current SLA metrics for all services over the specified time window."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT s.id as service_id, s.name as service_name,
                   s.sla_uptime_target, s.sla_response_time_ms, s.sla_resolution_hours,
                   AVG(m.uptime_pct) as avg_uptime,
                   AVG(m.response_time_ms) as avg_response_time,
                   AVG(m.resolution_hours) as avg_resolution,
                   COUNT(*) as data_points
            FROM services s
            JOIN sla_metrics m ON m.service_id = s.id
            WHERE m.recorded_at >= NOW() - INTERVAL ':hours hours'
            GROUP BY s.id, s.name, s.sla_uptime_target, s.sla_response_time_ms, s.sla_resolution_hours
        """).bindparams(hours=hours))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()


@tool("Get SLA Trend")
def get_sla_trend(service_id: int, days: int = 7) -> str:
    """Get SLA metric trend for a specific service over recent days."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT DATE(recorded_at) as date,
                   AVG(uptime_pct) as avg_uptime,
                   AVG(response_time_ms) as avg_response_time,
                   MIN(uptime_pct) as min_uptime,
                   MAX(response_time_ms) as max_response_time
            FROM sla_metrics
            WHERE service_id = :service_id
              AND recorded_at >= NOW() - INTERVAL ':days days'
            GROUP BY DATE(recorded_at)
            ORDER BY date
        """).bindparams(service_id=service_id, days=days))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()
