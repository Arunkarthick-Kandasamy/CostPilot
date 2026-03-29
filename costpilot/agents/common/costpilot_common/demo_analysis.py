"""Dynamic demo analysis module — runs SQL-based analysis with randomized
thresholds so each run produces different findings. No LLM needed."""

import logging
import random
import time
from decimal import Decimal
from costpilot_common.database import SessionLocal
from sqlalchemy import text

logger = logging.getLogger(__name__)

# Seed with current time so each run is different
random.seed(time.time())


def _rand_threshold(base: float, variance: float = 0.15) -> float:
    """Randomize a threshold so each run finds different results."""
    return base * (1 + random.uniform(-variance, variance))


def run_spend_analysis() -> list[dict]:
    """Analyze procurement data for anomalies, duplicates, and rate issues."""
    db = SessionLocal()
    findings = []
    try:
        # 1. Price anomalies — randomize the threshold (20-35% above average)
        pct_threshold = _rand_threshold(1.25, 0.15)
        limit = random.randint(3, 7)
        offset = random.randint(0, 5)
        rows = db.execute(text("""
            SELECT po.vendor_id, v.name as vendor_name, po.item_description,
                   po.unit_price, sub.avg_price,
                   ROUND(((po.unit_price - sub.avg_price) / sub.avg_price * 100)::numeric, 1) as pct_above
            FROM purchase_orders po
            JOIN vendors v ON v.id = po.vendor_id
            JOIN (SELECT item_description, AVG(unit_price) as avg_price
                  FROM purchase_orders GROUP BY item_description HAVING COUNT(*) > 3) sub
                ON sub.item_description = po.item_description
            WHERE po.unit_price > sub.avg_price * :threshold
            ORDER BY (po.unit_price - sub.avg_price) * po.quantity DESC
            OFFSET :off LIMIT :lim
        """), {"threshold": pct_threshold, "off": offset, "lim": limit}).fetchall()
        for r in rows:
            findings.append({
                "type": "cost_anomaly",
                "vendor_id": r[0],
                "description": f"Vendor {r[1]} charges {r[5]}% above average for {r[2]} (${r[3]:.0f} vs avg ${r[4]:.0f})",
                "financial_impact": float((r[3] - r[4]) * random.randint(6, 24)),
                "confidence": round(random.uniform(0.78, 0.96), 2),
            })

        # 2. Duplicate invoices — vary the day window
        day_window = random.randint(15, 45)
        rows = db.execute(text("""
            SELECT a.vendor_id, v.name, a.amount, COUNT(*) as dup_count
            FROM invoices a
            JOIN invoices b ON a.vendor_id = b.vendor_id AND a.amount = b.amount AND a.id < b.id
                AND ABS(a.invoice_date - b.invoice_date) < :days
            JOIN vendors v ON v.id = a.vendor_id
            GROUP BY a.vendor_id, v.name, a.amount
            ORDER BY a.amount DESC
            OFFSET :off LIMIT :lim
        """), {"days": day_window, "off": random.randint(0, 3), "lim": random.randint(2, 5)}).fetchall()
        for r in rows:
            findings.append({
                "type": "duplicate_cost",
                "vendor_id": r[0],
                "description": f"Duplicate invoice from {r[1]}: ${r[2]:,.0f} billed {r[3]} times within {day_window} days",
                "financial_impact": float(r[2] * (r[3] - 1)),
                "confidence": round(random.uniform(0.90, 0.98), 2),
            })

        # 3. Vendor rates above market — vary the threshold
        rate_threshold = _rand_threshold(1.15, 0.10)
        rows = db.execute(text("""
            SELECT vc.vendor_id, v.name, vc.service_category, vc.annual_cost,
                   mb.market_average,
                   ROUND(((vc.annual_cost - mb.market_average) / mb.market_average * 100)::numeric, 1) as pct_above
            FROM vendor_contracts vc
            JOIN vendors v ON v.id = vc.vendor_id
            JOIN market_benchmarks mb ON mb.service_category = vc.service_category
            WHERE vc.annual_cost > mb.market_average * :threshold
            ORDER BY RANDOM()
            LIMIT :lim
        """), {"threshold": rate_threshold, "lim": random.randint(2, 5)}).fetchall()
        for r in rows:
            findings.append({
                "type": "rate_opportunity",
                "vendor_id": r[0],
                "description": f"Vendor {r[1]} charges {r[5]}% above market for {r[2]} (${r[3]:,.0f}/yr vs market ${r[4]:,.0f})",
                "financial_impact": float(r[3] - r[4]),
                "confidence": round(random.uniform(0.80, 0.92), 2),
            })

    finally:
        db.close()

    logger.info("Spend analysis found %d findings (dynamic run)", len(findings))
    return findings


def run_sla_analysis() -> list[dict]:
    """Analyze SLA metrics for breach risks with varying time windows."""
    db = SessionLocal()
    findings = []
    try:
        days_window = random.randint(3, 14)
        margin = _rand_threshold(1.01, 0.005)
        response_margin = _rand_threshold(0.9, 0.05)
        rows = db.execute(text("""
            WITH recent AS (
                SELECT service_id, AVG(uptime_pct) as avg_uptime, AVG(response_time_ms) as avg_response,
                       MIN(uptime_pct) as min_uptime, MAX(response_time_ms) as max_response
                FROM sla_metrics WHERE recorded_at >= NOW() - MAKE_INTERVAL(days => :days)
                GROUP BY service_id
            )
            SELECT s.id, s.name, s.sla_uptime_target, r.avg_uptime, s.sla_response_time_ms, r.avg_response,
                   COALESCE(p.penalty_amount, 50000) as penalty,
                   r.min_uptime, r.max_response
            FROM services s
            JOIN recent r ON r.service_id = s.id
            LEFT JOIN sla_penalties p ON p.service_id = s.id AND p.breach_type = 'uptime'
            WHERE r.avg_uptime < s.sla_uptime_target * :margin
               OR r.avg_response > s.sla_response_time_ms * :resp_margin
            ORDER BY RANDOM()
            LIMIT :lim
        """), {"days": days_window, "margin": margin, "resp_margin": response_margin,
               "lim": random.randint(3, 6)}).fetchall()
        for r in rows:
            breach_hours = random.randint(2, 48)
            findings.append({
                "type": "breach_warning",
                "service_id": r[0],
                "description": f"Service {r[1]} at risk (last {days_window}d): uptime {r[3]:.2f}% (target {r[2]}%), response {r[5]:.0f}ms (limit {r[4]}ms). Min uptime: {r[7]:.2f}%. Predicted breach in ~{breach_hours}h.",
                "financial_impact": float(r[6]),
                "confidence": round(random.uniform(0.75, 0.95), 2),
                "predicted_breach_hours": breach_hours,
            })
    finally:
        db.close()

    logger.info("SLA analysis found %d findings (dynamic run)", len(findings))
    return findings


def run_resource_analysis() -> list[dict]:
    """Analyze resource utilization for waste with varying thresholds."""
    db = SessionLocal()
    findings = []
    try:
        # Unused licenses — vary utilization threshold
        util_threshold = _rand_threshold(0.6, 0.15)
        rows = db.execute(text("""
            SELECT id, name, total_licenses, used_licenses, cost_per_license,
                   (total_licenses - used_licenses) as unused,
                   (total_licenses - used_licenses) * cost_per_license * 12 as annual_waste,
                   ROUND((used_licenses::numeric / NULLIF(total_licenses, 0) * 100), 1) as util_pct
            FROM software_tools
            WHERE total_licenses > 0
              AND used_licenses < total_licenses * :threshold
            ORDER BY RANDOM()
            LIMIT :lim
        """), {"threshold": util_threshold, "lim": random.randint(3, 6)}).fetchall()
        for r in rows:
            findings.append({
                "type": "underutilized",
                "resource_id": r[0],
                "resource_type": "license",
                "name": r[1],
                "description": f"{r[5]} unused {r[1]} licenses ({r[7]}% utilization) — cancel to save ${r[6]:,.0f}/year",
                "financial_impact": float(r[6]),
                "confidence": round(random.uniform(0.88, 0.99), 2),
            })

        # Idle servers — vary CPU threshold
        cpu_threshold = _rand_threshold(10, 0.3)
        days = random.randint(5, 14)
        rows = db.execute(text("""
            SELECT s.id, s.name, s.type, s.monthly_cost,
                   ROUND(AVG(m.cpu_pct)::numeric, 1) as avg_cpu,
                   ROUND(AVG(m.memory_pct)::numeric, 1) as avg_mem
            FROM servers s
            JOIN server_metrics m ON m.server_id = s.id
            WHERE m.recorded_at >= NOW() - MAKE_INTERVAL(days => :days)
            GROUP BY s.id, s.name, s.type, s.monthly_cost
            HAVING AVG(m.cpu_pct) < :cpu_thresh
            ORDER BY RANDOM()
            LIMIT :lim
        """), {"days": days, "cpu_thresh": cpu_threshold, "lim": random.randint(3, 6)}).fetchall()
        for r in rows:
            findings.append({
                "type": "idle_capacity",
                "resource_id": r[0],
                "resource_type": "server",
                "name": r[1],
                "description": f"Server {r[1]} ({r[2]}) idle over {days}d: CPU {r[4]}%, Memory {r[5]}% — decommission to save ${r[3]*12:,.0f}/year",
                "financial_impact": float(r[3] * 12),
                "confidence": round(random.uniform(0.85, 0.97), 2),
            })
    finally:
        db.close()

    logger.info("Resource analysis found %d findings (dynamic run)", len(findings))
    return findings


def run_finops_analysis() -> list[dict]:
    """Analyze financial data for variances and discrepancies."""
    db = SessionLocal()
    findings = []
    try:
        # Budget variances — vary the overspend threshold
        variance_threshold = _rand_threshold(1.15, 0.10)
        rows = db.execute(text("""
            SELECT department, category, budgeted_amount, actual_amount,
                   (actual_amount - budgeted_amount) as variance,
                   ROUND(((actual_amount - budgeted_amount) / budgeted_amount * 100)::numeric, 1) as pct
            FROM budget_vs_actual
            WHERE period = (SELECT MAX(period) FROM budget_vs_actual)
              AND actual_amount > budgeted_amount * :threshold
            ORDER BY RANDOM()
            LIMIT :lim
        """), {"threshold": variance_threshold, "lim": random.randint(3, 7)}).fetchall()
        for r in rows:
            findings.append({
                "type": "variance_detected",
                "entity_type": "department",
                "department": r[0],
                "description": f"{r[0]} {r[1]} overspend: ${r[3]:,.0f} vs budget ${r[2]:,.0f} (+{r[5]}%)",
                "financial_impact": float(r[4]),
                "confidence": round(random.uniform(0.85, 0.97), 2),
            })

        # Unreconciled invoices — pick a random vendor subset
        vendor_offset = random.randint(0, 30)
        rows = db.execute(text("""
            SELECT v.name, COUNT(*) as cnt, SUM(i.amount) as total
            FROM invoices i
            JOIN vendors v ON v.id = i.vendor_id
            WHERE i.reconciled = false
            GROUP BY v.name
            ORDER BY SUM(i.amount) DESC
            OFFSET :off LIMIT :lim
        """), {"off": vendor_offset, "lim": random.randint(2, 4)}).fetchall()
        for r in rows:
            findings.append({
                "type": "discrepancy",
                "entity_type": "invoice",
                "vendor": r[0],
                "description": f"{r[1]} unreconciled invoices from {r[0]} totaling ${r[2]:,.0f} — reconcile to accelerate close",
                "financial_impact": float(r[2]) * 0.02,  # 2% potential recovery
                "confidence": round(random.uniform(0.82, 0.95), 2),
            })
    finally:
        db.close()

    logger.info("FinOps analysis found %d findings (dynamic run)", len(findings))
    return findings
