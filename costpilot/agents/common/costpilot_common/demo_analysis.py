"""Demo analysis module — runs SQL-based analysis without LLM calls.
Used when ANTHROPIC_API_KEY is not set."""

import logging
from decimal import Decimal
from costpilot_common.database import SessionLocal
from sqlalchemy import text

logger = logging.getLogger(__name__)


def run_spend_analysis() -> list[dict]:
    """Analyze procurement data for anomalies, duplicates, and rate issues."""
    db = SessionLocal()
    findings = []
    try:
        # 1. Price anomalies — items priced >25% above average
        rows = db.execute(text("""
            SELECT po.vendor_id, v.name as vendor_name, po.item_description,
                   po.unit_price, sub.avg_price,
                   ROUND(((po.unit_price - sub.avg_price) / sub.avg_price * 100)::numeric, 1) as pct_above
            FROM purchase_orders po
            JOIN vendors v ON v.id = po.vendor_id
            JOIN (SELECT item_description, AVG(unit_price) as avg_price
                  FROM purchase_orders GROUP BY item_description HAVING COUNT(*) > 5) sub
                ON sub.item_description = po.item_description
            WHERE po.unit_price > sub.avg_price * 1.25
            ORDER BY (po.unit_price - sub.avg_price) * po.quantity DESC
            LIMIT 5
        """)).fetchall()
        for r in rows:
            findings.append({
                "type": "cost_anomaly",
                "vendor_id": r[0],
                "description": f"Vendor {r[1]} charges {r[5]}% above average for {r[2]} (${r[3]:.0f} vs avg ${r[4]:.0f})",
                "financial_impact": float((r[3] - r[4]) * 12),
                "confidence": 0.88,
            })

        # 2. Duplicate invoices
        rows = db.execute(text("""
            SELECT a.vendor_id, v.name, a.amount, COUNT(*) as dup_count
            FROM invoices a
            JOIN invoices b ON a.vendor_id = b.vendor_id AND a.amount = b.amount AND a.id < b.id
                AND ABS(a.invoice_date - b.invoice_date) < 30
            JOIN vendors v ON v.id = a.vendor_id
            GROUP BY a.vendor_id, v.name, a.amount
            ORDER BY a.amount DESC
            LIMIT 5
        """)).fetchall()
        for r in rows:
            findings.append({
                "type": "duplicate_cost",
                "vendor_id": r[0],
                "description": f"Duplicate invoice from {r[1]} — ${r[2]:,.0f} billed {r[3]} times within 30 days",
                "financial_impact": float(r[2] * (r[3] - 1)),
                "confidence": 0.95,
            })

        # 3. Vendor rates above market
        rows = db.execute(text("""
            SELECT vc.vendor_id, v.name, vc.service_category, vc.annual_cost,
                   mb.market_average,
                   ROUND(((vc.annual_cost - mb.market_average) / mb.market_average * 100)::numeric, 1) as pct_above
            FROM vendor_contracts vc
            JOIN vendors v ON v.id = vc.vendor_id
            JOIN market_benchmarks mb ON mb.service_category = vc.service_category
            WHERE vc.annual_cost > mb.market_average * 1.15
            ORDER BY (vc.annual_cost - mb.market_average) DESC
            LIMIT 5
        """)).fetchall()
        for r in rows:
            findings.append({
                "type": "rate_opportunity",
                "vendor_id": r[0],
                "description": f"Vendor {r[1]} charges {r[5]}% above market for {r[2]} (${r[3]:,.0f}/yr vs market ${r[4]:,.0f})",
                "financial_impact": float(r[3] - r[4]),
                "confidence": 0.85,
            })

    finally:
        db.close()

    logger.info("Spend analysis found %d findings", len(findings))
    return findings


def run_sla_analysis() -> list[dict]:
    """Analyze SLA metrics for breach risks."""
    db = SessionLocal()
    findings = []
    try:
        rows = db.execute(text("""
            WITH recent AS (
                SELECT service_id, AVG(uptime_pct) as avg_uptime, AVG(response_time_ms) as avg_response
                FROM sla_metrics WHERE recorded_at >= NOW() - INTERVAL '7 days'
                GROUP BY service_id
            )
            SELECT s.id, s.name, s.sla_uptime_target, r.avg_uptime, s.sla_response_time_ms, r.avg_response,
                   COALESCE(p.penalty_amount, 50000) as penalty
            FROM services s
            JOIN recent r ON r.service_id = s.id
            LEFT JOIN sla_penalties p ON p.service_id = s.id AND p.breach_type = 'uptime'
            WHERE r.avg_uptime < s.sla_uptime_target * 1.01
               OR r.avg_response > s.sla_response_time_ms * 0.9
            ORDER BY COALESCE(p.penalty_amount, 50000) DESC
            LIMIT 5
        """)).fetchall()
        for r in rows:
            findings.append({
                "type": "breach_warning",
                "service_id": r[0],
                "description": f"Service {r[1]} at risk — uptime {r[3]:.2f}% (target {r[2]}%), response {r[5]:.0f}ms (limit {r[4]}ms)",
                "financial_impact": float(r[6]),
                "confidence": 0.87,
            })
    finally:
        db.close()

    logger.info("SLA analysis found %d findings", len(findings))
    return findings


def run_resource_analysis() -> list[dict]:
    """Analyze resource utilization for waste."""
    db = SessionLocal()
    findings = []
    try:
        # Unused licenses
        rows = db.execute(text("""
            SELECT id, name, total_licenses, used_licenses, cost_per_license,
                   (total_licenses - used_licenses) as unused,
                   (total_licenses - used_licenses) * cost_per_license * 12 as annual_waste
            FROM software_tools
            WHERE used_licenses < total_licenses * 0.6
            ORDER BY (total_licenses - used_licenses) * cost_per_license DESC
            LIMIT 5
        """)).fetchall()
        for r in rows:
            findings.append({
                "type": "underutilized",
                "resource_id": r[0],
                "resource_type": "license",
                "description": f"{r[5]} unused {r[1]} licenses — cancel to save ${r[6]:,.0f}/year",
                "financial_impact": float(r[6]),
                "confidence": 0.95,
            })

        # Idle servers
        rows = db.execute(text("""
            SELECT s.id, s.name, s.monthly_cost, ROUND(AVG(m.cpu_pct)::numeric, 1) as avg_cpu
            FROM servers s
            JOIN server_metrics m ON m.server_id = s.id
            WHERE m.recorded_at >= NOW() - INTERVAL '7 days'
            GROUP BY s.id, s.name, s.monthly_cost
            HAVING AVG(m.cpu_pct) < 10
            ORDER BY s.monthly_cost DESC
            LIMIT 5
        """)).fetchall()
        for r in rows:
            findings.append({
                "type": "idle_capacity",
                "resource_id": r[0],
                "resource_type": "server",
                "description": f"Server {r[1]} idle (CPU {r[3]}%) — decommission to save ${r[2]*12:,.0f}/year",
                "financial_impact": float(r[2] * 12),
                "confidence": 0.92,
            })
    finally:
        db.close()

    logger.info("Resource analysis found %d findings", len(findings))
    return findings


def run_finops_analysis() -> list[dict]:
    """Analyze financial data for variances and discrepancies."""
    db = SessionLocal()
    findings = []
    try:
        # Budget variances >15%
        rows = db.execute(text("""
            SELECT department, category, budgeted_amount, actual_amount,
                   (actual_amount - budgeted_amount) as variance,
                   ROUND(((actual_amount - budgeted_amount) / budgeted_amount * 100)::numeric, 1) as pct
            FROM budget_vs_actual
            WHERE period = (SELECT MAX(period) FROM budget_vs_actual)
              AND actual_amount > budgeted_amount * 1.15
            ORDER BY (actual_amount - budgeted_amount) DESC
            LIMIT 5
        """)).fetchall()
        for r in rows:
            findings.append({
                "type": "variance_detected",
                "entity_type": "department",
                "department": r[0],
                "description": f"{r[0]} {r[1]} overspend: ${r[3]:,.0f} vs budget ${r[2]:,.0f} (+{r[5]}%)",
                "financial_impact": float(r[4]),
                "confidence": 0.93,
            })

        # Unreconciled invoices
        rows = db.execute(text("""
            SELECT COUNT(*) as cnt, SUM(amount) as total
            FROM invoices WHERE reconciled = false
        """)).fetchone()
        if rows and rows[0] > 0:
            findings.append({
                "type": "discrepancy",
                "entity_type": "invoice",
                "description": f"{rows[0]} unreconciled invoices totaling ${rows[1]:,.0f} — auto-reconcile to cut close cycle",
                "financial_impact": 0,
                "confidence": 0.90,
            })
    finally:
        db.close()

    logger.info("FinOps analysis found %d findings", len(findings))
    return findings
