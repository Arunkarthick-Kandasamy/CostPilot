from crewai.tools import tool
from sqlalchemy import text
from costpilot_common.database import SessionLocal


@tool("Find Duplicate Invoices")
def find_duplicate_invoices() -> str:
    """Find invoices with duplicate amounts from the same vendor within 30 days."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT a.id as invoice_a, b.id as invoice_b,
                   a.vendor_id, v.name as vendor_name,
                   a.amount, a.invoice_date as date_a, b.invoice_date as date_b
            FROM invoices a
            JOIN invoices b ON a.vendor_id = b.vendor_id
                AND a.amount = b.amount
                AND a.id < b.id
                AND ABS(EXTRACT(DAY FROM a.invoice_date - b.invoice_date)) < 30
            JOIN vendors v ON v.id = a.vendor_id
            ORDER BY a.amount DESC
            LIMIT 50
        """))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()


@tool("Find Overlapping Contracts")
def find_overlapping_contracts() -> str:
    """Find overlapping vendor contracts for similar service categories."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT a.id as contract_a, b.id as contract_b,
                   a.vendor_id as vendor_a, b.vendor_id as vendor_b,
                   va.name as vendor_a_name, vb.name as vendor_b_name,
                   a.service_category, a.annual_cost as cost_a, b.annual_cost as cost_b
            FROM vendor_contracts a
            JOIN vendor_contracts b ON a.service_category = b.service_category
                AND a.id < b.id
                AND a.end_date >= b.start_date
                AND a.start_date <= b.end_date
            JOIN vendors va ON va.id = a.vendor_id
            JOIN vendors vb ON vb.id = b.vendor_id
            ORDER BY (a.annual_cost + b.annual_cost) DESC
            LIMIT 50
        """))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()
