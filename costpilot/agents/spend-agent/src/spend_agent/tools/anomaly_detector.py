from crewai.tools import tool
from sqlalchemy import text
from costpilot_common.database import SessionLocal


@tool("Query Purchase Orders")
def query_purchase_orders(limit: int = 500) -> str:
    """Query recent purchase orders from the database. Returns JSON string of orders."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT po.id, po.vendor_id, v.name as vendor_name, po.item_description,
                   po.quantity, po.unit_price, po.total_amount, po.order_date
            FROM purchase_orders po
            JOIN vendors v ON v.id = po.vendor_id
            ORDER BY po.order_date DESC
            LIMIT :limit
        """), {"limit": limit})
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()


@tool("Get Price Statistics")
def get_price_statistics(item_description: str) -> str:
    """Get average price and std deviation for an item. Use to detect price spikes."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT item_description,
                   AVG(unit_price) as avg_price,
                   STDDEV(unit_price) as stddev_price,
                   MIN(unit_price) as min_price,
                   MAX(unit_price) as max_price,
                   COUNT(*) as order_count
            FROM purchase_orders
            WHERE item_description ILIKE :desc
            GROUP BY item_description
        """), {"desc": f"%{item_description}%"})
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()
