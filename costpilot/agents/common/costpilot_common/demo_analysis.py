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
            vendor_id = r[0]
            vendor_name = r[1]
            impact = float((r[3] - r[4]) * random.randint(6, 24))
            findings.append({
                "type": "cost_anomaly",
                "vendor_id": vendor_id,
                "description": f"Vendor {vendor_name} charges {r[5]}% above average for {r[2]} (${r[3]:.0f} vs avg ${r[4]:.0f})",
                "financial_impact": impact,
                "confidence": round(random.uniform(0.78, 0.96), 2),
                "playbook": [
                    f"1. Flag vendor contract for {vendor_name} (vendor #{vendor_id}) for immediate review",
                    "2. Pull 12-month purchase history and compare unit price trends",
                    "3. Request competitive quotes from 3 alternative vendors",
                    "4. Schedule renegotiation meeting with procurement team",
                    f"5. Set price cap alert at ${r[4]:.0f} (current market avg) for future orders"
                ],
                "root_cause": f"Vendor {vendor_name} pricing has drifted {r[5]}% above market average, likely due to auto-renewed contract without competitive rebidding",
                "corrective_action": f"Flag contract for renegotiation and set price ceiling alert at market average (${r[4]:.0f})",
                "downstream_workflow": f"PROC-REVIEW: Procurement review ticket created for vendor #{vendor_id}, assigned to Finance team",
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
            vendor_id = r[0]
            vendor_name = r[1]
            dup_amount = r[2]
            dup_count = r[3]
            findings.append({
                "type": "duplicate_cost",
                "vendor_id": vendor_id,
                "description": f"Duplicate invoice from {vendor_name}: ${dup_amount:,.0f} billed {dup_count} times within {day_window} days",
                "financial_impact": float(dup_amount * (dup_count - 1)),
                "confidence": round(random.uniform(0.90, 0.98), 2),
                "playbook": [
                    f"1. Freeze duplicate payment of ${dup_amount:,.0f} to {vendor_name} pending review",
                    f"2. Submit credit memo request to {vendor_name} for {dup_count - 1} duplicate charge(s)",
                    "3. Add duplicate detection rule for same-vendor/same-amount invoices within 30 days",
                    "4. Reconcile all payments to this vendor for the current quarter"
                ],
                "root_cause": f"Duplicate invoice submitted by {vendor_name} — likely caused by AP automation ingesting both email and portal submissions",
                "corrective_action": f"Freeze duplicate payment and request credit memo for ${float(dup_amount * (dup_count - 1)):,.0f}",
                "downstream_workflow": f"AP-RECOVER: Credit memo request submitted to {vendor_name}, duplicate detection rule added to AP system",
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
            vendor_id = r[0]
            vendor_name = r[1]
            category = r[2]
            annual_cost = r[3]
            market_avg = r[4]
            findings.append({
                "type": "rate_opportunity",
                "vendor_id": vendor_id,
                "description": f"Vendor {vendor_name} charges {r[5]}% above market for {category} (${annual_cost:,.0f}/yr vs market ${market_avg:,.0f})",
                "financial_impact": float(annual_cost - market_avg),
                "confidence": round(random.uniform(0.80, 0.92), 2),
                "playbook": [
                    f"1. Run benchmark analysis for {category} across all current vendors",
                    f"2. Generate vendor scorecard for {vendor_name} (quality, delivery, pricing)",
                    f"3. Draft contract amendment targeting market rate of ${market_avg:,.0f}/yr",
                    f"4. Negotiate rate lock at market average with {vendor_name} for 24-month term",
                    "5. Set up quarterly rate review cadence for this service category"
                ],
                "root_cause": f"{vendor_name} rate for {category} has not been renegotiated since last contract renewal; market rates have dropped while contract price remained static",
                "corrective_action": f"Initiate contract amendment to align {category} rate with market average, saving ${float(annual_cost - market_avg):,.0f}/yr",
                "downstream_workflow": f"PROC-BENCH: Benchmark report generated for {category}, contract amendment drafted for vendor #{vendor_id}",
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
            service_name = r[1]
            service_id = r[0]
            penalty = float(r[6])
            findings.append({
                "type": "breach_warning",
                "service_id": service_id,
                "description": f"Service {service_name} at risk (last {days_window}d): uptime {r[3]:.2f}% (target {r[2]}%), response {r[5]:.0f}ms (limit {r[4]}ms). Min uptime: {r[7]:.2f}%. Predicted breach in ~{breach_hours}h.",
                "financial_impact": penalty,
                "confidence": round(random.uniform(0.75, 0.95), 2),
                "predicted_breach_hours": breach_hours,
                "playbook": [
                    f"1. Alert on-call SRE team for {service_name} — breach predicted in ~{breach_hours}h",
                    f"2. Scale up {service_name} capacity by 50% in primary region",
                    "3. Reroute traffic to backup region to reduce load on degraded instances",
                    f"4. Notify stakeholders: SLA penalty exposure is ${penalty:,.0f}",
                    f"5. Schedule post-mortem review within 24h of incident resolution"
                ],
                "root_cause": f"Service {service_name} performance degradation detected over {days_window}-day window — uptime trending below SLA target, likely due to increased load without corresponding capacity scaling",
                "corrective_action": f"Auto-scale {service_name} capacity and reroute traffic to backup region",
                "downstream_workflow": f"INCIDENT-ESC: Escalation ticket created for {service_name}, on-call paged, capacity auto-scaled to prevent ${penalty:,.0f} penalty",
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
            resource_id = r[0]
            tool_name = r[1]
            unused_count = r[5]
            annual_waste = r[6]
            util_pct = r[7]
            findings.append({
                "type": "underutilized",
                "resource_id": resource_id,
                "resource_type": "license",
                "name": tool_name,
                "description": f"{unused_count} unused {tool_name} licenses ({util_pct}% utilization) — cancel to save ${annual_waste:,.0f}/year",
                "financial_impact": float(annual_waste),
                "confidence": round(random.uniform(0.88, 0.99), 2),
                "playbook": [
                    f"1. Audit last-login dates for all {tool_name} license holders",
                    f"2. Notify license admin: {unused_count} seats unused for 60+ days",
                    f"3. Initiate cancellation of {unused_count} unused {tool_name} licenses effective next billing cycle",
                    f"4. Reallocate ${float(annual_waste):,.0f}/yr budget to approved backlog items"
                ],
                "root_cause": f"{tool_name} licenses over-provisioned — {unused_count} seats allocated but never activated, likely from bulk purchase without usage validation",
                "corrective_action": f"Cancel {unused_count} unused {tool_name} licenses effective next billing cycle, saving ${float(annual_waste):,.0f}/yr",
                "downstream_workflow": f"RES-OPT: License cancellation ticket created for {unused_count} {tool_name} seats, budget reallocation pending approval",
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
            resource_id = r[0]
            server_name = r[1]
            server_type = r[2]
            monthly_cost = r[3]
            avg_cpu = r[4]
            avg_mem = r[5]
            annual_savings = float(monthly_cost * 12)
            findings.append({
                "type": "idle_capacity",
                "resource_id": resource_id,
                "resource_type": "server",
                "name": server_name,
                "description": f"Server {server_name} ({server_type}) idle over {days}d: CPU {avg_cpu}%, Memory {avg_mem}% — decommission to save ${annual_savings:,.0f}/year",
                "financial_impact": annual_savings,
                "confidence": round(random.uniform(0.85, 0.97), 2),
                "playbook": [
                    f"1. Verify {server_name} has no active dependencies or scheduled jobs",
                    f"2. Schedule decommission of {server_name} for next maintenance window",
                    f"3. Archive data and snapshots from {server_name} to cold storage",
                    f"4. Release IP addresses and DNS entries associated with {server_name}",
                    f"5. Update CMDB and remove {server_name} from monitoring"
                ],
                "root_cause": f"Server {server_name} ({server_type}) averaging {avg_cpu}% CPU over {days} days — provisioned for a project that completed or migrated, but never decommissioned",
                "corrective_action": f"Schedule {server_name} decommission for next maintenance window, saving ${annual_savings:,.0f}/yr",
                "downstream_workflow": f"INFRA-DECOM: Decommission order created for {server_name}, archive job queued, IP release scheduled",
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
            department = r[0]
            category = r[1]
            budgeted = r[2]
            actual = r[3]
            variance = r[4]
            pct = r[5]
            findings.append({
                "type": "variance_detected",
                "entity_type": "department",
                "department": department,
                "description": f"{department} {category} overspend: ${actual:,.0f} vs budget ${budgeted:,.0f} (+{pct}%)",
                "financial_impact": float(variance),
                "confidence": round(random.uniform(0.85, 0.97), 2),
                "root_cause": f"Root cause: Unplanned {category.lower()} engagement in {department} approved without budget amendment — actual spend exceeded forecast by {pct}% (${float(variance):,.0f})",
                "playbook": [
                    f"1. Investigate {department} {category} spend: identify top 3 cost drivers",
                    f"2. Attribute overspend to specific cost center and project code",
                    f"3. Create budget amendment for ${float(variance):,.0f} variance in {department}",
                    f"4. Set threshold alert at 90% of budget for {department} {category}",
                    "5. Schedule monthly budget review cadence with department head"
                ],
                "corrective_action": f"Create budget amendment for {department} {category} and set 90% threshold alert to prevent future overruns",
                "downstream_workflow": f"FIN-AMEND: Budget amendment request created for {department} (+${float(variance):,.0f}), threshold alert configured at 90% of revised budget",
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
            vendor_name = r[0]
            invoice_count = r[1]
            total_amount = r[2]
            auto_match = int(invoice_count * random.uniform(0.85, 0.95))
            manual_review = invoice_count - auto_match
            findings.append({
                "type": "discrepancy",
                "entity_type": "invoice",
                "vendor": vendor_name,
                "description": f"{invoice_count} unreconciled invoices from {vendor_name} totaling ${total_amount:,.0f} — reconcile to accelerate close",
                "financial_impact": float(total_amount) * 0.02,  # 2% potential recovery
                "confidence": round(random.uniform(0.82, 0.95), 2),
                "root_cause": f"Invoices from {vendor_name} not matched to POs — likely caused by mismatched PO references or partial deliveries recorded in different systems",
                "playbook": [
                    f"1. Match {invoice_count} invoices from {vendor_name} against open POs using 3-way match",
                    f"2. Auto-reconcile {auto_match} matched transactions via rules engine",
                    f"3. Flag {manual_review} unmatched invoices for manual review",
                    "4. Request credit/debit memo for confirmed discrepancies",
                    "5. Update reconciliation rules to prevent future mismatches"
                ],
                "corrective_action": f"Auto-reconcile {auto_match} matched transactions and flag {manual_review} for manual review",
                "downstream_workflow": f"FIN-CLOSE: {auto_match} transactions auto-reconciled for {vendor_name}, close cycle reduced by estimated 2 days",
            })
    finally:
        db.close()

    logger.info("FinOps analysis found %d findings (dynamic run)", len(findings))
    return findings
