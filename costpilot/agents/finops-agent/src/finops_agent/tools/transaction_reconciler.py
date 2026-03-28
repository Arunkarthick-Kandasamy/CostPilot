from crewai.tools import tool
from sqlalchemy import text
from costpilot_common.database import SessionLocal


@tool("Find Unmatched Transactions")
def find_unmatched_transactions() -> str:
    """Find transactions that don't match between invoices and purchase orders."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT i.id as invoice_id, i.invoice_number, i.vendor_id,
                   v.name as vendor_name, i.amount as invoice_amount,
                   po.id as po_id, po.total_amount as po_amount,
                   ABS(i.amount - po.total_amount) as variance,
                   i.invoice_date
            FROM invoices i
            JOIN vendors v ON v.id = i.vendor_id
            LEFT JOIN purchase_orders po ON po.vendor_id = i.vendor_id
                AND ABS(EXTRACT(DAY FROM i.invoice_date - po.order_date)) < 60
                AND ABS(i.amount - po.total_amount) < i.amount * 0.2
            WHERE po.id IS NULL
               OR ABS(i.amount - po.total_amount) > 100
            ORDER BY ABS(COALESCE(i.amount - po.total_amount, i.amount)) DESC
            LIMIT 50
        """))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()


@tool("Find Auto-Reconcilable Transactions")
def find_auto_reconcilable() -> str:
    """Find transactions that can be automatically reconciled (exact or near-matches)."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT i.id as invoice_id, po.id as po_id,
                   i.amount, po.total_amount,
                   ABS(i.amount - po.total_amount) as variance,
                   CASE WHEN i.amount = po.total_amount THEN 'exact'
                        ELSE 'near' END as match_type
            FROM invoices i
            JOIN purchase_orders po ON po.vendor_id = i.vendor_id
                AND ABS(i.amount - po.total_amount) < 50
                AND ABS(EXTRACT(DAY FROM i.invoice_date - po.order_date)) < 90
            WHERE i.reconciled = false
            ORDER BY i.amount DESC
        """))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()
