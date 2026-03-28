#!/usr/bin/env python3
"""Seed the CostPilot gateway tables with demo dashboard data."""

import os
import random
import uuid
from datetime import datetime, timedelta
import psycopg2

random.seed(42)

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/costpilot"
)

AGENTS = ["Spend", "Sla", "Resource", "Finops"]
RISK_LEVELS = ["Low", "Medium", "High", "Critical"]
SEVERITIES = ["Info", "Warning", "Critical"]

SPEND_FINDINGS = [
    ("Vendor Acme Corp charges 28% above market rate for cloud hosting", 47200, "High"),
    ("Duplicate invoice #INV-4521 from TechServe Inc — $8,200 billed twice", 8200, "Medium"),
    ("Redundant SaaS subscriptions: Slack + Teams used by same 40 users", 19200, "Low"),
    ("Vendor DataFlow pricing spike: 35% increase on data pipeline service", 62000, "High"),
    ("3 overlapping security audit contracts across vendors", 34500, "Medium"),
    ("Bulk purchase discount missed — 500 licenses bought in 5 separate orders", 12800, "Low"),
    ("Vendor CloudNine — contract auto-renewed at 20% higher rate", 28000, "High"),
    ("Procurement anomaly: $45K equipment order with no matching PO", 45000, "Critical"),
    ("Rate optimization: Switch from vendor A to B saves 15% on storage", 18500, "Low"),
    ("Duplicate maintenance contract for same server cluster", 22000, "Medium"),
]

SLA_FINDINGS = [
    ("Payment Gateway approaching SLA breach — uptime at 99.91% (target: 99.95%)", 150000, "Critical"),
    ("Order Processing response time trending up — breach predicted in 6 hours", 75000, "Critical"),
    ("Analytics Pipeline resolution time exceeded — shift 2 engineers from Team B", 50000, "High"),
    ("CDN performance degraded in EU region — reroute traffic to backup", 25000, "High"),
    ("Notification Service intermittent timeouts — scale up recommended", 10000, "Medium"),
    ("Database Cluster failover test overdue — compliance risk", 35000, "Medium"),
    ("Search Engine latency spike during peak hours — add caching layer", 20000, "Medium"),
    ("API Gateway rate limiting too aggressive — causing false SLA violations", 15000, "Low"),
]

RESOURCE_FINDINGS = [
    ("12 unused Jira licenses — cancel to save $2,400/month", 28800, "Low"),
    ("8 idle AWS EC2 instances (avg CPU < 5%) — decommission or downsize", 42000, "Medium"),
    ("Figma: 35 licenses allocated, only 18 active users", 7140, "Low"),
    ("3 development servers running 24/7 — schedule off-hours shutdown", 15600, "Low"),
    ("Snowflake warehouse over-provisioned — reduce from XL to L", 36000, "Medium"),
    ("Team Alpha has 30% lower utilization than peers — investigate", 0, "Low"),
    ("Duplicate monitoring: DataDog + Grafana covering same metrics", 24000, "Medium"),
    ("Legacy staging environment running unused for 90+ days", 8400, "Low"),
    ("Over-allocated GCP storage: 40TB provisioned, 12TB used", 19200, "Medium"),
    ("CircleCI plan upgrade unnecessary — usage within free tier limits", 14400, "Low"),
]

FINOPS_FINDINGS = [
    ("Budget variance: Engineering cloud spend 23% over budget ($180K over)", 180000, "High"),
    ("340 invoices auto-reconcilable — cut close cycle by 2 days", 0, "Low"),
    ("Unmatched invoice #7823 from Vendor Z — $12,500 discrepancy", 12500, "Medium"),
    ("Marketing department 18% under budget — reallocate to engineering", 45000, "Medium"),
    ("Q4 consulting spend 40% above forecast — 3 unplanned engagements", 95000, "High"),
    ("Travel budget variance: Sales team 55% over allocation", 32000, "Medium"),
    ("License true-up discrepancy: billed for 200, contracted for 150", 25000, "High"),
    ("Facilities cost spike: HVAC maintenance invoiced 3x in same month", 8500, "Medium"),
]

ALL_FINDINGS = {
    "Spend": SPEND_FINDINGS,
    "Sla": SLA_FINDINGS,
    "Resource": RESOURCE_FINDINGS,
    "Finops": FINOPS_FINDINGS,
}


def seed_proposals(cursor):
    """Insert action proposals with realistic data spread over months."""
    print("  Seeding proposals...")
    base_date = datetime(2025, 7, 1)
    proposal_ids = []

    for agent_type, findings in ALL_FINDINGS.items():
        for i, (title, savings, risk) in enumerate(findings):
            pid = str(uuid.uuid4())
            created = base_date + timedelta(days=random.randint(0, 270), hours=random.randint(0, 23))

            # Distribute statuses realistically
            r = random.random()
            if r < 0.25:
                status = "Pending"
                approved_by = None
                approved_at = None
                executed_at = None
            elif r < 0.55:
                status = "Approved"
                approved_by = "11111111-1111-1111-1111-111111111111"
                approved_at = created + timedelta(days=random.randint(1, 5))
                executed_at = None
            elif r < 0.85:
                status = "Executed"
                approved_by = "11111111-1111-1111-1111-111111111111"
                approved_at = created + timedelta(days=random.randint(1, 3))
                executed_at = approved_at + timedelta(days=random.randint(1, 7))
            else:
                status = "Rejected"
                approved_by = "22222222-2222-2222-2222-222222222222"
                approved_at = created + timedelta(days=random.randint(1, 3))
                executed_at = None

            cursor.execute("""
                INSERT INTO "ActionProposals"
                ("Id", "AgentType", "Title", "Description", "EstimatedSavings", "RiskLevel",
                 "Status", "Evidence", "CreatedAt", "ApprovedBy", "ApprovedAt", "ExecutedAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                pid, agent_type, title,
                f"Detected by {agent_type} agent during automated analysis. {title}",
                savings, risk, status,
                '{"source": "automated_scan", "confidence": ' + str(round(random.uniform(0.7, 0.98), 2)) + '}',
                created, approved_by, approved_at, executed_at
            ))

            proposal_ids.append((pid, status, savings, executed_at, created))

    return proposal_ids


def seed_cost_impacts(cursor, proposal_ids):
    """Insert cost impacts for executed proposals."""
    print("  Seeding cost impacts...")
    for pid, status, savings, executed_at, created in proposal_ids:
        if status == "Executed" and savings > 0 and executed_at:
            actual = savings * random.uniform(0.7, 1.1)
            cursor.execute("""
                INSERT INTO "CostImpacts"
                ("Id", "ProposalId", "ActualSavings",
                 "MeasurementPeriodStart", "MeasurementPeriodEnd", "Evidence", "RecordedAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                str(uuid.uuid4()), pid, round(actual, 2),
                executed_at.date(),
                (executed_at + timedelta(days=30)).date(),
                '{"verification": "confirmed_by_finance"}',
                executed_at + timedelta(days=random.randint(7, 30))
            ))


def seed_alerts(cursor):
    """Insert agent alerts."""
    print("  Seeding alerts...")
    base_date = datetime(2025, 7, 1)
    alert_messages = {
        "Spend": [
            ("Anomaly scan completed", "Found 5 price anomalies totaling $142K", "Info"),
            ("Duplicate detection run", "Identified 3 potential duplicate invoices", "Info"),
            ("Rate analysis complete", "4 vendors priced above market benchmark", "Warning"),
            ("High-value anomaly detected", "Purchase order #8823 exceeds 3-sigma threshold", "Critical"),
            ("Vendor contract expiring", "CloudNine contract auto-renews in 14 days at +20%", "Warning"),
        ],
        "Sla": [
            ("SLA monitoring active", "All 20 services within compliance thresholds", "Info"),
            ("Uptime degradation detected", "Payment Gateway uptime dropped to 99.91%", "Critical"),
            ("Response time warning", "Order Processing P99 latency at 450ms (limit: 500ms)", "Warning"),
            ("Breach averted", "Resource reallocation prevented Analytics Pipeline SLA breach", "Info"),
            ("Escalation triggered", "CDN performance below threshold for 2 consecutive hours", "Critical"),
        ],
        "Resource": [
            ("Utilization scan complete", "Found 15% unused licenses across 6 tools", "Info"),
            ("Idle infrastructure detected", "8 servers with < 5% CPU over 7 days", "Warning"),
            ("License audit finished", "Potential savings of $95K in unused subscriptions", "Info"),
            ("Over-provisioned resource", "Snowflake XL warehouse averaging 20% utilization", "Warning"),
            ("Cost allocation updated", "Q1 allocation report generated for all 15 teams", "Info"),
        ],
        "Finops": [
            ("Reconciliation complete", "Matched 4,521 of 5,000 transactions automatically", "Info"),
            ("Variance analysis done", "3 departments over budget by > 15%", "Warning"),
            ("Discrepancy found", "Invoice-PO mismatch totaling $12,500", "Warning"),
            ("Close cycle accelerated", "Auto-reconciled 340 transactions, saving 2 days", "Info"),
            ("Budget alert", "Engineering cloud spend on track to exceed Q2 budget by $180K", "Critical"),
        ],
    }

    for agent_type, messages in alert_messages.items():
        for i, (title, message, severity) in enumerate(messages):
            created = base_date + timedelta(days=random.randint(0, 270), hours=random.randint(0, 23))
            cursor.execute("""
                INSERT INTO "AgentAlerts"
                ("Id", "AgentType", "Severity", "Title", "Message", "Acknowledged", "CreatedAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                str(uuid.uuid4()), agent_type, severity, title, message,
                random.random() > 0.4,  # 60% acknowledged
                created
            ))


def seed_insights(cursor):
    """Insert agent insights for cross-agent correlation."""
    print("  Seeding insights...")
    base_date = datetime(2025, 9, 1)
    insight_data = [
        ("Spend", "cost_anomaly", "vendor", "vendor_12", "Vendor TechServe overcharging by 28% on hosting", 47200, 0.92),
        ("Spend", "duplicate_cost", "invoice", "inv_4521", "Duplicate invoice detected from TechServe", 8200, 0.95),
        ("Spend", "rate_opportunity", "vendor", "vendor_8", "CloudNine contract above market rate", 28000, 0.88),
        ("Spend", "cost_anomaly", "vendor", "vendor_23", "DataFlow pricing spike detected", 62000, 0.85),
        ("Spend", "duplicate_cost", "contract", "contract_15", "Overlapping security audit contracts", 34500, 0.79),

        ("Sla", "breach_warning", "service", "svc_payment", "Payment Gateway trending toward SLA breach", 150000, 0.91),
        ("Sla", "breach_warning", "service", "svc_orders", "Order Processing response time degrading", 75000, 0.87),
        ("Sla", "resource_need", "service", "svc_analytics", "Analytics Pipeline needs additional capacity", 50000, 0.83),
        ("Sla", "breach_warning", "service", "svc_cdn", "CDN EU region performance degraded", 25000, 0.76),

        ("Resource", "underutilized", "license", "tool_jira", "12 unused Jira licenses detected", 28800, 0.97),
        ("Resource", "idle_capacity", "server", "srv_group_a", "8 EC2 instances idle for 7+ days", 42000, 0.94),
        ("Resource", "underutilized", "license", "tool_figma", "Figma: 17 of 35 licenses unused", 7140, 0.96),
        ("Resource", "underutilized", "infrastructure", "snowflake_wh", "Snowflake warehouse over-provisioned", 36000, 0.88),
        ("Resource", "idle_capacity", "server", "staging_env", "Legacy staging idle for 90+ days", 8400, 0.99),

        ("Finops", "variance_detected", "department", "dept_eng", "Engineering cloud spend 23% over budget", 180000, 0.93),
        ("Finops", "discrepancy", "invoice", "inv_7823", "Unmatched invoice from Vendor Z", 12500, 0.91),
        ("Finops", "variance_detected", "department", "dept_sales", "Travel budget 55% over allocation", 32000, 0.87),
        ("Finops", "discrepancy", "license", "lic_trueup", "License true-up: billed 200 vs contracted 150", 25000, 0.84),
    ]

    insight_ids = []
    for source, itype, etype, eid, summary, impact, confidence in insight_data:
        iid = str(uuid.uuid4())
        created = base_date + timedelta(days=random.randint(0, 200), hours=random.randint(0, 23))
        cursor.execute("""
            INSERT INTO "AgentInsights"
            ("Id", "SourceAgent", "InsightType", "EntityType", "EntityId",
             "Summary", "FinancialImpact", "Confidence", "RelatedData", "CreatedAt")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            iid, source, itype, etype, eid,
            summary, impact, confidence,
            '{"auto_detected": true}',
            created
        ))
        insight_ids.append((iid, source, summary, impact, confidence, created))

    return insight_ids


def seed_correlated_findings(cursor, insight_ids):
    """Insert cross-agent correlated findings."""
    print("  Seeding correlated findings...")

    correlations = [
        # Spend + Resource: expensive vendor tool that's underutilized
        ([0, 10], ["Spend", "Resource"],
         "Cross-agent: TechServe hosting overpriced (Spend) AND servers underutilized (Resource) — cancel and consolidate",
         89200, 0.94),
        # SLA + Resource: SLA breach risk + idle capacity available
        ([5, 11], ["Sla", "Resource"],
         "Cross-agent: Payment Gateway at risk (SLA) — idle EC2 capacity available for reallocation (Resource)",
         192000, 0.91),
        # FinOps + Spend: budget variance traced to vendor pricing
        ([15, 3], ["Finops", "Spend"],
         "Cross-agent: Engineering overspend (FinOps) traced to DataFlow pricing spike (Spend)",
         242000, 0.89),
        # Resource + FinOps: unused licenses causing budget waste
        ([10, 17], ["Resource", "Finops"],
         "Cross-agent: Unused Jira licenses (Resource) contributing to license true-up discrepancy (FinOps)",
         53800, 0.92),
    ]

    for idx_list, agents, summary, impact, confidence in correlations:
        ids = [insight_ids[i][0] for i in idx_list if i < len(insight_ids)]
        cursor.execute("""
            INSERT INTO "CorrelatedFindings"
            ("Id", "InsightIds", "AgentsInvolved", "Summary", "CombinedImpact", "Confidence", "CreatedAt")
            VALUES (%s, %s::uuid[], %s, %s, %s, %s, %s)
        """, (
            str(uuid.uuid4()),
            ids,
            agents,
            summary,
            impact,
            confidence,
            datetime.utcnow() - timedelta(days=random.randint(1, 30))
        ))


def seed_audit_log(cursor):
    """Insert some audit log entries."""
    print("  Seeding audit log...")
    actions = [
        ("ActionProposal", "Approved", "11111111-1111-1111-1111-111111111111"),
        ("ActionProposal", "Rejected", "22222222-2222-2222-2222-222222222222"),
        ("ActionProposal", "Approved", "11111111-1111-1111-1111-111111111111"),
        ("AgentRun", "Triggered", "11111111-1111-1111-1111-111111111111"),
        ("ActionProposal", "Executed", None),
    ]

    for etype, action, user_id in actions:
        cursor.execute("""
            INSERT INTO "AuditLogs"
            ("Id", "EntityType", "EntityId", "Action", "UserId", "Details", "Timestamp")
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            str(uuid.uuid4()), etype, str(uuid.uuid4()), action,
            user_id, f'{{"action": "{action}"}}',
            datetime.utcnow() - timedelta(hours=random.randint(1, 720))
        ))


def main():
    print(f"Connecting to: {DATABASE_URL}")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cursor = conn.cursor()

    try:
        # Check if already seeded
        cursor.execute('SELECT COUNT(*) FROM "ActionProposals"')
        count = cursor.fetchone()[0]
        if count > 0:
            print(f"Dashboard already has {count} proposals. Use --force to reseed.")
            import sys
            if "--force" not in sys.argv:
                return
            print("Force reseeding — clearing existing data...")
            cursor.execute('DELETE FROM "AuditLogs"')
            cursor.execute('DELETE FROM "CorrelatedFindings"')
            cursor.execute('DELETE FROM "AgentInsights"')
            cursor.execute('DELETE FROM "CostImpacts"')
            cursor.execute('DELETE FROM "AgentAlerts"')
            cursor.execute('DELETE FROM "ActionProposals"')
            conn.commit()

        print("Seeding dashboard data...")
        proposal_ids = seed_proposals(cursor)
        seed_cost_impacts(cursor, proposal_ids)
        seed_alerts(cursor)
        insight_ids = seed_insights(cursor)
        seed_correlated_findings(cursor, insight_ids)
        seed_audit_log(cursor)

        conn.commit()

        # Print summary
        cursor.execute('SELECT COUNT(*) FROM "ActionProposals"')
        print(f"\n  Proposals:           {cursor.fetchone()[0]}")
        cursor.execute('SELECT COUNT(*) FROM "CostImpacts"')
        print(f"  Cost Impacts:        {cursor.fetchone()[0]}")
        cursor.execute('SELECT COUNT(*) FROM "AgentAlerts"')
        print(f"  Agent Alerts:        {cursor.fetchone()[0]}")
        cursor.execute('SELECT COUNT(*) FROM "AgentInsights"')
        print(f"  Agent Insights:      {cursor.fetchone()[0]}")
        cursor.execute('SELECT COUNT(*) FROM "CorrelatedFindings"')
        print(f"  Correlated Findings: {cursor.fetchone()[0]}")
        cursor.execute('SELECT COUNT(*) FROM "AuditLogs"')
        print(f"  Audit Logs:          {cursor.fetchone()[0]}")

        cursor.execute('SELECT SUM("EstimatedSavings") FROM "ActionProposals"')
        print(f"\n  Total Savings Identified: ${cursor.fetchone()[0]:,.0f}")
        cursor.execute('SELECT SUM("ActualSavings") FROM "CostImpacts"')
        val = cursor.fetchone()[0]
        print(f"  Total Savings Realized:   ${val:,.0f}" if val else "  Total Savings Realized:   $0")

        print("\nDashboard data seeded successfully!")

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
