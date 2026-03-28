from crewai.tools import tool
from sqlalchemy import text
from costpilot_common.database import SessionLocal


@tool("Predict SLA Breaches")
def predict_sla_breaches() -> str:
    """Analyze trending metrics to predict services approaching SLA breaches."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            WITH recent AS (
                SELECT service_id,
                       AVG(uptime_pct) as recent_uptime,
                       AVG(response_time_ms) as recent_response
                FROM sla_metrics
                WHERE recorded_at >= NOW() - INTERVAL '4 hours'
                GROUP BY service_id
            ),
            baseline AS (
                SELECT service_id,
                       AVG(uptime_pct) as baseline_uptime,
                       AVG(response_time_ms) as baseline_response
                FROM sla_metrics
                WHERE recorded_at >= NOW() - INTERVAL '7 days'
                  AND recorded_at < NOW() - INTERVAL '4 hours'
                GROUP BY service_id
            )
            SELECT s.id, s.name, s.sla_uptime_target,
                   r.recent_uptime, b.baseline_uptime,
                   r.recent_response, b.baseline_response,
                   s.sla_response_time_ms as target_response,
                   p.penalty_amount
            FROM services s
            JOIN recent r ON r.service_id = s.id
            JOIN baseline b ON b.service_id = s.id
            LEFT JOIN sla_penalties p ON p.service_id = s.id
            WHERE r.recent_uptime < s.sla_uptime_target * 1.05
               OR r.recent_response > s.sla_response_time_ms * 0.85
            ORDER BY p.penalty_amount DESC NULLS LAST
        """))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()
