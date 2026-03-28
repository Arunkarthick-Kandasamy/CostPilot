from crewai.tools import tool
from sqlalchemy import text
from costpilot_common.database import SessionLocal


@tool("Compare Vendor Rates")
def compare_vendor_rates() -> str:
    """Compare current vendor contract rates against market benchmarks."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT vc.id as contract_id, v.name as vendor_name,
                   vc.service_category, vc.annual_cost,
                   mb.benchmark_rate, mb.market_average,
                   ROUND(((vc.annual_cost - mb.market_average) / mb.market_average * 100)::numeric, 1) as pct_above_market,
                   (vc.annual_cost - mb.market_average) as potential_savings
            FROM vendor_contracts vc
            JOIN vendors v ON v.id = vc.vendor_id
            JOIN market_benchmarks mb ON mb.service_category = vc.service_category
            WHERE vc.annual_cost > mb.market_average
            ORDER BY (vc.annual_cost - mb.market_average) DESC
            LIMIT 50
        """))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()
