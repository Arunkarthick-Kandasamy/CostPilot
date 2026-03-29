#!/usr/bin/env python3
"""
Seed realistic enterprise scenarios that demonstrate the FULL problem statement:
- AI detects real business problems (not random threshold breaches)
- Each finding has context, math, playbook, corrective action
- Shows the complete lifecycle: Detection → Analysis → Approval → Execution → Impact
"""

import os
import uuid
import json
import random
from datetime import datetime, timedelta
import psycopg2

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/costpilot")


# ============================================================
# REALISTIC ENTERPRISE SCENARIOS
# Each scenario is a complete story a judge can follow
# ============================================================

SCENARIOS = [
    # ============ SPEND INTELLIGENCE ============
    {
        "agent": "Spend",
        "title": "AWS hosting costs increased 42% QoQ without infrastructure growth",
        "description": "The Spend Intelligence agent detected that AWS cloud hosting costs rose from $84,000/month in Q3 to $119,280/month in Q4 — a 42% increase. However, infrastructure utilization (compute instances, storage, bandwidth) remained flat at ~65% capacity. This indicates cost leakage through misconfigured auto-scaling policies, orphaned resources, or rate plan misalignment.",
        "savings": 423360,
        "risk": "High",
        "confidence": 0.91,
        "root_cause": "Three root causes identified: (1) Auto-scaling policy on production cluster set to 'aggressive' after Black Friday, never reverted — spinning up 12 extra instances 24/7. (2) 8 development environments left running over holiday break. (3) Reserved Instance coverage dropped from 72% to 41% when 3-year RIs expired in October without renewal.",
        "playbook": [
            "1. Revert auto-scaling policy on prod-cluster-east to 'balanced' (saves $18K/mo immediately)",
            "2. Implement scheduled shutdown for 8 dev environments (M-F 8am-8pm only, saves $6K/mo)",
            "3. Purchase new 1-year Reserved Instances for stable workloads (saves $11K/mo vs on-demand)",
            "4. Deploy AWS Cost Anomaly Detection alerts with $5K daily threshold",
            "5. Schedule monthly FinOps review with Engineering leads"
        ],
        "corrective_action": "Auto-scaling policy reverted, dev environment schedules created, RI purchase order submitted to AWS",
        "downstream_workflow": "CLOUD-OPT-001: Jira ticket INFRA-4521 created for auto-scaling fix. AWS RI purchase order PO-2024-0892 submitted. Slack alert sent to #engineering-costs channel.",
        "math": [
            {"label": "Q3 monthly AWS cost", "value": 84000},
            {"label": "Q4 monthly AWS cost", "value": 119280, "red": True},
            {"label": "Monthly overspend", "value": 35280, "red": True},
            {"label": "Auto-scaling fix savings/yr", "value": 216000, "green": True},
            {"label": "Dev env scheduling savings/yr", "value": 72000, "green": True},
            {"label": "RI renewal savings/yr", "value": 135360, "green": True},
            {"label": "Total annual savings", "value": 423360, "green": True, "total": True, "highlight": True},
        ],
        "data_sources": [
            {"name": "AWS Cost Explorer API", "icon": "cloud", "records": 14500},
            {"name": "CloudWatch Metrics", "icon": "monitoring", "records": 86000},
            {"name": "Reserved Instance Inventory", "icon": "inventory", "records": 47},
            {"name": "Auto-Scaling Configurations", "icon": "settings", "records": 23},
        ],
    },
    {
        "agent": "Spend",
        "title": "Duplicate vendor payments to Accenture — $187K paid twice for same SOW",
        "description": "The Spend Intelligence agent identified that Statement of Work #ACN-2024-0156 from Accenture was invoiced and paid twice — once via the standard AP process (INV-78234, paid Nov 15) and again via an emergency payment request (INV-78234-R, paid Dec 3). The invoice amounts are identical ($187,400) and reference the same SOW for cloud migration consulting.",
        "savings": 187400,
        "risk": "Critical",
        "confidence": 0.97,
        "root_cause": "Accenture submitted the original invoice via their vendor portal (processed by AP automation). The project manager, not seeing payment confirmation after 2 weeks, submitted an emergency payment request manually. Both were approved by different approvers — the system lacks cross-channel duplicate detection.",
        "playbook": [
            "1. Immediately freeze payment on INV-78234-R ($187,400) — mark as duplicate in AP system",
            "2. Contact Accenture accounts receivable to initiate credit memo CM-ACN-2024-0892",
            "3. Verify no other duplicate payments to Accenture in last 12 months",
            "4. Add cross-channel duplicate detection rule: flag same-vendor invoices within 5% amount and 30 days",
            "5. Update AP policy: emergency payments require VP Finance approval + duplicate check"
        ],
        "corrective_action": "Payment freeze initiated on duplicate invoice. Credit memo request sent to Accenture. AP duplicate detection rule deployed.",
        "downstream_workflow": "AP-RECOVER-001: Credit memo CM-ACN-2024-0892 requested. SAP payment block set on INV-78234-R. Procurement policy update ticket POL-2024-0034 created.",
        "math": [
            {"label": "Original invoice (INV-78234)", "value": 187400},
            {"label": "Duplicate payment (INV-78234-R)", "value": 187400, "red": True},
            {"label": "Total paid to Accenture", "value": 374800},
            {"label": "Correct amount owed", "value": 187400},
            {"label": "Recoverable duplicate payment", "value": 187400, "green": True, "total": True, "highlight": True},
        ],
        "data_sources": [
            {"name": "Accounts Payable Ledger", "icon": "receipt_long", "records": 8000},
            {"name": "Vendor Invoice Portal", "icon": "description", "records": 3200},
            {"name": "Emergency Payment Requests", "icon": "priority_high", "records": 156},
            {"name": "Vendor Contracts (SOWs)", "icon": "handshake", "records": 97},
        ],
    },
    {
        "agent": "Spend",
        "title": "Salesforce contract renewal at 28% above market — renegotiation opportunity",
        "description": "Salesforce Enterprise license renewal (contract SF-ENT-2022) is priced at $185/user/month for 320 seats ($710,400/yr). Current market benchmark for equivalent CRM licenses is $144/user/month. The contract auto-renews in 45 days with a 3% annual escalator already applied. Immediate action needed before auto-renewal locks in above-market rates for another 2 years.",
        "savings": 157440,
        "risk": "High",
        "confidence": 0.89,
        "root_cause": "Original contract negotiated in 2022 when Salesforce had limited competition. Since then, HubSpot Enterprise and Microsoft Dynamics 365 have reached feature parity for our use case. The contract includes a 3% annual escalator that has compounded to 28% above current market rates. Procurement never benchmarked at renewal.",
        "playbook": [
            "1. Obtain competitive quotes from HubSpot Enterprise and Microsoft Dynamics 365 within 10 business days",
            "2. Conduct internal usage audit — 320 seats allocated but only 267 active users (83% utilization)",
            "3. Prepare negotiation brief: target $144/user/month for 280 seats (right-sized) = $483,840/yr",
            "4. Schedule negotiation call with Salesforce account executive before auto-renewal date",
            "5. If Salesforce won't match market rate, initiate RFP for CRM migration with 6-month timeline"
        ],
        "corrective_action": "Auto-renewal notification sent to Salesforce requesting rate review. RFQ issued to HubSpot and Microsoft. License audit initiated to right-size seat count.",
        "downstream_workflow": "PROC-NEGO-001: RFQ-2024-0456 issued to 3 vendors. Salesforce auto-renewal pause requested via portal. License audit assigned to IT Admin team.",
        "math": [
            {"label": "Current Salesforce rate", "value": 185, "suffix": "/user/month"},
            {"label": "Market benchmark rate", "value": 144, "suffix": "/user/month"},
            {"label": "Overcharge per user/month", "value": 41, "red": True, "suffix": "/user/month"},
            {"label": "Active users (right-sized)", "value": 280, "suffix": " seats"},
            {"label": "Current annual cost (320 seats)", "value": 710400},
            {"label": "Target annual cost (280 seats @ market)", "value": 483840},
            {"label": "Annual savings after renegotiation", "value": 157440, "green": True, "total": True, "highlight": True},
        ],
        "data_sources": [
            {"name": "Salesforce Admin Console", "icon": "cloud", "records": 320},
            {"name": "User Login Activity (90 days)", "icon": "login", "records": 48000},
            {"name": "Gartner CRM Benchmark 2024", "icon": "analytics", "records": 85},
            {"name": "Vendor Contract Repository", "icon": "folder", "records": 97},
        ],
    },

    # ============ SLA PREVENTION ============
    {
        "agent": "Sla",
        "title": "Payment Gateway uptime at 99.91% — SLA breach in ~6 hours triggers $150K penalty",
        "description": "The SLA Prevention agent detected that the Payment Gateway service uptime has degraded to 99.91% over the current measurement period (SLA target: 99.95%). At the current degradation rate, the service will breach SLA within approximately 6 hours, triggering a contractual penalty of $150,000 to our payment processing partner. The root cause is a memory leak in the v3.2.1 deployment that went live 48 hours ago.",
        "savings": 150000,
        "risk": "Critical",
        "confidence": 0.94,
        "root_cause": "Memory leak introduced in Payment Gateway v3.2.1 (deployed Tuesday 2:00 PM). Heap usage grows 2.3% per hour, causing garbage collection pauses that spike response times to 800ms+ every 4 hours. The QA load test missed this because it only runs for 2 hours — the leak manifests after 6+ hours of sustained traffic.",
        "playbook": [
            "1. IMMEDIATE: Scale Payment Gateway from 4 to 8 pods to absorb GC pauses (ETA: 5 minutes)",
            "2. IMMEDIATE: Enable circuit breaker to route 30% traffic to backup region us-west-2",
            "3. SHORT-TERM: Roll back to v3.2.0 during next maintenance window (tonight 2:00 AM)",
            "4. Alert on-call SRE team lead and VP Engineering via PagerDuty",
            "5. Post-incident: Add 8-hour soak test to CI/CD pipeline, update SLA monitoring thresholds"
        ],
        "corrective_action": "Kubernetes HPA scaled to 8 replicas. Circuit breaker activated routing 30% to us-west-2. PagerDuty incident INC-2024-0891 created. Rollback scheduled for 2:00 AM maintenance window.",
        "downstream_workflow": "INCIDENT-ESC-001: PagerDuty alert sent to on-call SRE. Kubernetes auto-scale triggered. StatusPage updated to 'Degraded Performance'. Rollback deployment pipeline queued.",
        "math": [
            {"label": "SLA target uptime", "value": 99.95, "suffix": "%"},
            {"label": "Current uptime", "value": 99.91, "suffix": "%", "red": True},
            {"label": "Remaining margin", "value": 0.04, "suffix": "% (critical)"},
            {"label": "Contractual penalty if breached", "value": 150000, "red": True},
            {"label": "Cost of scaling (8 pods for 24h)", "value": 2400},
            {"label": "Cost of circuit breaker routing", "value": 800},
            {"label": "Net savings (penalty avoided)", "value": 146800, "green": True, "total": True, "highlight": True},
        ],
        "data_sources": [
            {"name": "Datadog APM Metrics", "icon": "monitoring", "records": 21600},
            {"name": "Kubernetes Pod Metrics", "icon": "dns", "records": 8640},
            {"name": "SLA Contract Terms", "icon": "gavel", "records": 1},
            {"name": "Deployment History", "icon": "history", "records": 234},
        ],
    },
    {
        "agent": "Sla",
        "title": "Order Processing P99 latency trending toward breach — reroute to DR region",
        "description": "Order Processing service P99 latency has increased from 420ms to 890ms over the past 4 hours (SLA limit: 1000ms). At current trajectory, the service will breach the 1-second SLA within 3 hours. This is caused by a database connection pool exhaustion on the primary PostgreSQL cluster due to a long-running analytics query that was accidentally run against the production database.",
        "savings": 75000,
        "risk": "High",
        "confidence": 0.88,
        "root_cause": "A data analyst ran a full-table scan query against the production orders database at 2:15 PM, consuming 45 of 50 available database connections. This starved the Order Processing service of connections, causing request queuing and latency spikes. The production database lacks query governance — any user with read access can run unbounded queries.",
        "playbook": [
            "1. IMMEDIATE: Kill the long-running analytics query (PID 78234) on production PostgreSQL",
            "2. IMMEDIATE: Increase connection pool from 50 to 100 for Order Processing service",
            "3. SHORT-TERM: Set up read replica for analytics queries — redirect all BI tools to replica",
            "4. Add query timeout of 30 seconds for non-service accounts on production database",
            "5. Implement pg_stat_statements monitoring with alerting on queries exceeding 10 seconds"
        ],
        "corrective_action": "Long-running query terminated. Connection pool increased to 100. Read replica provisioning initiated. Database governance policy drafted.",
        "downstream_workflow": "INCIDENT-DB-001: DBA team notified via Slack #dba-alerts. Query killed via pg_terminate_backend(). Jira ticket DBA-892 created for read replica setup.",
        "math": [
            {"label": "Current P99 latency", "value": 890, "suffix": "ms", "red": True},
            {"label": "SLA latency limit", "value": 1000, "suffix": "ms"},
            {"label": "Remaining headroom", "value": 110, "suffix": "ms (critical)"},
            {"label": "Penalty if SLA breached", "value": 75000, "red": True},
            {"label": "Cost of connection pool increase", "value": 0},
            {"label": "Cost of read replica (monthly)", "value": 1200},
            {"label": "Net savings (penalty avoided)", "value": 73800, "green": True, "total": True, "highlight": True},
        ],
        "data_sources": [
            {"name": "Datadog APM (Order Processing)", "icon": "monitoring", "records": 54000},
            {"name": "PostgreSQL pg_stat_activity", "icon": "storage", "records": 50},
            {"name": "Connection Pool Metrics", "icon": "hub", "records": 7200},
            {"name": "SLA Performance History", "icon": "timeline", "records": 4380},
        ],
    },

    # ============ RESOURCE OPTIMIZATION ============
    {
        "agent": "Resource",
        "title": "141 unused Jira licenses at $50/seat — cancel to save $84,600/year",
        "description": "The Resource Optimization agent analyzed Jira Cloud login activity over the past 90 days and found that only 59 of 200 licensed seats have been active. 141 licenses ($50/seat/month) are being paid for but never used. This represents $84,600/year in waste. Many unused seats belong to former contractors and employees from teams that migrated to Linear 6 months ago.",
        "savings": 84600,
        "risk": "Low",
        "confidence": 0.97,
        "root_cause": "Three factors: (1) 47 licenses belong to deprovisioned contractors whose Jira access was never revoked. (2) 68 licenses belong to the Product and Design teams who migrated to Linear in Q2 but were never removed from Jira. (3) 26 licenses are test/service accounts that are no longer needed. IT Admin has no automated license reconciliation process.",
        "playbook": [
            "1. Export list of 141 inactive users with last login dates and team assignments",
            "2. Cross-reference with HR system to confirm 47 are terminated contractors",
            "3. Confirm with Product and Design leads that 68 migrated users can be deprovisioned",
            "4. Deactivate 141 unused accounts in Jira Admin Console",
            "5. Reduce Jira Cloud subscription from 200 to 65 seats (5 buffer) effective next billing cycle",
            "6. Set up quarterly license reconciliation automation via Okta SCIM"
        ],
        "corrective_action": "141 Jira accounts deactivated. Subscription downgraded from 200 to 65 seats. Okta SCIM provisioning configured for automatic license management.",
        "downstream_workflow": "RES-LIC-001: Atlassian subscription amendment submitted. 141 accounts deactivated in Jira Admin. Okta SCIM integration ticket IT-2024-0567 created. HR notified to update offboarding checklist.",
        "math": [
            {"label": "Total Jira licenses", "value": 200, "suffix": " seats"},
            {"label": "Active users (90-day login)", "value": 59, "suffix": " seats"},
            {"label": "Unused licenses", "value": 141, "suffix": " seats", "red": True},
            {"label": "Cost per seat per month", "value": 50, "suffix": "/seat/mo"},
            {"label": "Monthly waste (141 × $50)", "value": 7050, "red": True},
            {"label": "Annual savings", "value": 84600, "green": True, "total": True, "highlight": True},
        ],
        "data_sources": [
            {"name": "Jira Cloud Admin API", "icon": "apps", "records": 200},
            {"name": "User Login Activity (90 days)", "icon": "login", "records": 12400},
            {"name": "Okta User Directory", "icon": "people", "records": 850},
            {"name": "HR Employee Database", "icon": "badge", "records": 720},
        ],
    },
    {
        "agent": "Resource",
        "title": "12 idle AWS EC2 instances (avg CPU 3.2%) — decommission to save $52,000/year",
        "description": "12 EC2 instances in the us-east-1 region have averaged below 5% CPU utilization over the past 30 days. These are m5.xlarge instances ($0.192/hr each) that appear to be leftover development and staging environments from the Q2 microservices migration project. Total monthly cost: $4,331. None have received SSH connections or API traffic in 30+ days.",
        "savings": 51974,
        "risk": "Medium",
        "confidence": 0.94,
        "root_cause": "The microservices migration project (Project Phoenix) completed in June. The project team spun up 12 staging instances for testing but never decommissioned them. The instances are not tagged with a project or owner, so they were invisible to the monthly cost review. AWS doesn't auto-terminate idle instances without explicit lifecycle policies.",
        "playbook": [
            "1. Verify no active services depend on these 12 instances (check security groups, load balancers, DNS)",
            "2. Create AMI snapshots of all 12 instances as backup before decommission",
            "3. Stop instances (not terminate) for 7-day observation period",
            "4. If no alerts triggered after 7 days, terminate instances and release Elastic IPs",
            "5. Implement mandatory resource tagging policy (Owner, Project, Environment, Expiry)",
            "6. Deploy AWS Instance Scheduler for all non-production environments"
        ],
        "corrective_action": "12 EC2 instances stopped. AMI snapshots created. 7-day observation period started. Resource tagging policy drafted for Engineering review.",
        "downstream_workflow": "INFRA-DECOM-001: AWS instances stopped (not terminated). CloudWatch alarms set for observation period. Jira ticket INFRA-4567 for tagging policy. Slack notification to #infrastructure.",
        "math": [
            {"label": "Idle instances", "value": 12, "suffix": " × m5.xlarge"},
            {"label": "Cost per instance/hour", "value": 0.192, "suffix": "/hr"},
            {"label": "Hours per month", "value": 730, "suffix": " hrs"},
            {"label": "Monthly cost (12 instances)", "value": 4331, "red": True},
            {"label": "Annual waste", "value": 51974, "green": True, "total": True, "highlight": True},
        ],
        "data_sources": [
            {"name": "AWS EC2 CloudWatch Metrics", "icon": "cloud", "records": 86400},
            {"name": "AWS Cost & Usage Report", "icon": "receipt_long", "records": 14500},
            {"name": "VPC Flow Logs", "icon": "hub", "records": 0},
            {"name": "SSH Access Logs", "icon": "terminal", "records": 0},
        ],
    },

    # ============ FINOPS ============
    {
        "agent": "Finops",
        "title": "Engineering cloud spend 23% over budget — root cause: unplanned data pipeline migration",
        "description": "Engineering department cloud infrastructure spending for Q4 was $892,000 against a budget of $725,000 — a $167,000 (23%) overspend. The FinOps agent traced 78% of the variance to an unplanned Snowflake data pipeline migration that was approved via Slack by the VP of Engineering but never submitted as a budget amendment.",
        "savings": 167000,
        "risk": "High",
        "confidence": 0.93,
        "root_cause": "On October 15, the VP of Engineering approved a $130,000 Snowflake migration project via Slack message to the Data Engineering team lead. The project was never routed through Finance for budget approval. Additionally, the migration required $37,000 in temporary duplicate infrastructure (running both old and new pipelines in parallel for 6 weeks). The remaining 22% variance ($37K) comes from general compute growth aligned with product roadmap.",
        "playbook": [
            "1. Create retroactive budget amendment BA-2024-Q4-ENG for $130,000 (Snowflake migration)",
            "2. Decommission legacy data pipeline infrastructure (saves $8,500/mo going forward)",
            "3. Update spending approval policy: any commitment >$25K requires Finance sign-off within 48 hours",
            "4. Set up Slack-to-SAP integration for automated budget check on spending approvals",
            "5. Schedule monthly Engineering FinOps review (15th of each month) with VP Eng + Finance BP"
        ],
        "corrective_action": "Budget amendment BA-2024-Q4-ENG submitted. Legacy pipeline decommission scheduled. Spending policy updated to require Finance approval for commitments >$25K.",
        "downstream_workflow": "FIN-VAR-001: Budget amendment routed to CFO for approval. Legacy infra decommission ticket INFRA-4589 created. Policy update distributed via company-wide email. Monthly FinOps cadence added to VP Engineering calendar.",
        "math": [
            {"label": "Q4 Engineering budget", "value": 725000},
            {"label": "Q4 actual spend", "value": 892000, "red": True},
            {"label": "Total variance", "value": 167000, "red": True},
            {"label": "Snowflake migration (unplanned)", "value": 130000, "red": True},
            {"label": "Temporary parallel infrastructure", "value": 37000, "red": True},
            {"label": "Budget amendment (retroactive)", "value": 130000},
            {"label": "Legacy decommission savings/yr", "value": 102000, "green": True},
            {"label": "Net forward savings", "value": 167000, "green": True, "total": True, "highlight": True},
        ],
        "data_sources": [
            {"name": "SAP Budget vs Actual", "icon": "account_balance", "records": 768},
            {"name": "AWS/Snowflake Billing", "icon": "cloud", "records": 14500},
            {"name": "Purchase Order System", "icon": "receipt_long", "records": 10000},
            {"name": "Slack Approval Messages", "icon": "chat", "records": 89},
        ],
    },
    {
        "agent": "Finops",
        "title": "2,406 unreconciled invoices ($4.2M) — auto-reconcile to cut close cycle by 3 days",
        "description": "The FinOps agent identified 2,406 vendor invoices totaling $4.2M that remain unreconciled at month-end. Of these, 1,847 (77%) can be automatically matched to purchase orders using 3-way matching (invoice, PO, receiving report). The remaining 559 require manual review. Auto-reconciling the matchable invoices would reduce the monthly close cycle from 8 days to 5 days.",
        "savings": 0,
        "risk": "Medium",
        "confidence": 0.92,
        "root_cause": "The AP team manually reconciles all invoices regardless of match confidence. The current ERP system (SAP) supports auto-reconciliation but the feature was disabled 2 years ago after a configuration error caused 3 incorrect payments. The root cause of that error was fixed, but auto-reconciliation was never re-enabled. Each manual reconciliation takes an average of 12 minutes.",
        "playbook": [
            "1. Run 3-way match algorithm on 2,406 pending invoices — identify 1,847 auto-matchable",
            "2. Review match rules: exact PO number, amount within 2% tolerance, goods receipt confirmed",
            "3. Auto-reconcile 1,847 matched invoices in SAP (batch process, ~15 minutes)",
            "4. Route 559 unmatched invoices to AP team with discrepancy details pre-populated",
            "5. Re-enable SAP auto-reconciliation for invoices with >95% match confidence",
            "6. Measure: target close cycle reduction from 8 days to 5 days (37.5% improvement)"
        ],
        "corrective_action": "3-way matching executed: 1,847 invoices auto-reconciled ($3.24M). 559 invoices flagged for manual review with pre-populated discrepancy reports. SAP auto-reconciliation re-enabled with 95% confidence threshold.",
        "downstream_workflow": "FIN-CLOSE-001: SAP batch reconciliation job executed. 1,847 invoices marked as reconciled. 559 work items created in AP team queue. Finance Controller notified of projected 3-day close reduction.",
        "math": [
            {"label": "Total unreconciled invoices", "value": 2406, "suffix": " invoices"},
            {"label": "Total unreconciled amount", "value": 4200000},
            {"label": "Auto-matchable (77%)", "value": 1847, "suffix": " invoices"},
            {"label": "Manual review needed", "value": 559, "suffix": " invoices"},
            {"label": "Time per manual reconciliation", "value": 12, "suffix": " minutes"},
            {"label": "AP team hours saved", "value": 369, "suffix": " hours/month", "green": True},
            {"label": "Close cycle reduction", "value": 3, "suffix": " days faster", "green": True, "total": True, "highlight": True},
        ],
        "data_sources": [
            {"name": "SAP Accounts Payable", "icon": "receipt_long", "records": 8000},
            {"name": "Purchase Order System", "icon": "shopping_cart", "records": 10000},
            {"name": "Goods Receipt Records", "icon": "inventory", "records": 9200},
            {"name": "Vendor Master Data", "icon": "business", "records": 50},
        ],
    },
    {
        "agent": "Finops",
        "title": "Marketing travel budget 55% over allocation — 3 unapproved conference sponsorships",
        "description": "Marketing department travel and events budget is $78,000 over allocation ($142,000 actual vs $92,000 budget, +55%). The FinOps agent traced 89% of the variance to three conference sponsorship packages that were signed by the Marketing VP directly with event organizers, bypassing the procurement process.",
        "savings": 78000,
        "risk": "Medium",
        "confidence": 0.90,
        "root_cause": "Marketing VP signed three conference sponsorship agreements (SaaStr Annual $35K, WebSummit $28K, Dreamforce $15K) directly with event organizers using a corporate credit card. These commitments were not routed through procurement, not reflected in the budget, and only appeared in the GL when the credit card statement was reconciled. The corporate card policy allows charges up to $10K without approval, but the VP split the SaaStr and WebSummit charges across multiple transactions.",
        "playbook": [
            "1. Flag 3 sponsorship charges for retroactive budget amendment and VP Finance review",
            "2. Implement corporate card controls: aggregate spending by vendor per 30-day window",
            "3. Create 'Events & Sponsorships' sub-budget under Marketing with quarterly allocation",
            "4. Require procurement routing for any vendor commitment >$10K regardless of payment method",
            "5. Schedule Q1 Marketing budget reforecast incorporating events pipeline"
        ],
        "corrective_action": "Three sponsorship charges flagged for retroactive approval. Corporate card aggregate monitoring rule deployed. Events sub-budget created with $120K annual allocation.",
        "downstream_workflow": "FIN-POLICY-001: Corporate card policy amendment drafted. Expense management system updated with 30-day vendor aggregate rule. Budget amendment BA-2024-Q4-MKT routed for CFO approval.",
        "math": [
            {"label": "Marketing travel budget", "value": 92000},
            {"label": "Actual spend", "value": 142000, "red": True},
            {"label": "Total variance", "value": 50000, "red": True},
            {"label": "SaaStr Annual sponsorship", "value": 35000, "red": True},
            {"label": "WebSummit sponsorship", "value": 28000, "red": True},
            {"label": "Dreamforce sponsorship", "value": 15000, "red": True},
            {"label": "Recoverable (future budget control)", "value": 78000, "green": True, "total": True, "highlight": True},
        ],
        "data_sources": [
            {"name": "SAP Budget vs Actual", "icon": "account_balance", "records": 768},
            {"name": "Corporate Card Transactions", "icon": "credit_card", "records": 2340},
            {"name": "Vendor Invoice Records", "icon": "description", "records": 8000},
            {"name": "Procurement Approvals", "icon": "approval", "records": 456},
        ],
    },
]


def seed_scenarios(cursor):
    """Insert realistic enterprise scenarios."""
    statuses = ["Pending"] * 5 + ["Approved"] * 2 + ["Executed"] * 3
    random.shuffle(statuses)

    for i, s in enumerate(SCENARIOS):
        pid = str(uuid.uuid4())
        status = statuses[i % len(statuses)]
        created = datetime.utcnow() - timedelta(days=random.randint(1, 30), hours=random.randint(0, 23))

        approved_by = None
        approved_at = None
        executed_at = None
        execution_result = None

        if status in ("Approved", "Executed"):
            approved_by = "11111111-1111-1111-1111-111111111111"
            approved_at = created + timedelta(hours=random.randint(1, 48))

        if status == "Executed":
            executed_at = approved_at + timedelta(hours=random.randint(1, 24))
            actual_savings = s["savings"] * random.uniform(0.8, 1.05) if s["savings"] > 0 else 0
            id_prefix = pid[:8]
            execution_result = json.dumps({
                "executedBy": "CostPilot Automation Engine",
                "timestamp": executed_at.isoformat(),
                "agentType": s["agent"],
                "actionsPerformed": [
                    "Validated proposal preconditions",
                    s.get("corrective_action", "Initiated corrective action"),
                    "Created downstream tickets and notifications",
                    "Updated financial records and audit trail",
                    "Sent stakeholder notifications"
                ],
                "workflowsTriggered": [s.get("downstream_workflow", "").split(":")[0]],
                "estimatedSavings": s["savings"],
                "actualSavings": round(actual_savings, 2),
                "variancePct": round((actual_savings / s["savings"] * 100 - 100), 1) if s["savings"] > 0 else 0,
                "status": "completed"
            })

        # Build evidence
        evidence = json.dumps({
            "type": s.get("title", "").split("—")[0].strip().lower().replace(" ", "_")[:30],
            "confidence": s["confidence"],
            "playbook": s["playbook"],
            "root_cause": s["root_cause"],
            "corrective_action": s["corrective_action"],
            "downstream_workflow": s["downstream_workflow"],
            "math": s.get("math", []),
            "data_sources": s.get("data_sources", []),
        })

        # Build rich description
        desc = s["description"]
        desc += f"\n\n## Root Cause\n{s['root_cause']}"
        desc += "\n\n## Playbook\n" + "\n".join(s["playbook"])
        desc += f"\n\n## Corrective Action\n{s['corrective_action']}"
        desc += f"\n\n## Downstream Workflow\n{s['downstream_workflow']}"

        cursor.execute("""
            INSERT INTO "ActionProposals"
            ("Id", "AgentType", "Title", "Description", "EstimatedSavings",
             "RiskLevel", "Status", "Evidence", "CreatedAt",
             "ApprovedBy", "ApprovedAt", "ExecutedAt", "ExecutionResult")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s::jsonb)
        """, (pid, s["agent"], s["title"], desc, s["savings"],
              s["risk"], status, evidence, created,
              approved_by, approved_at, executed_at, execution_result))

        # Insert cost impact for executed proposals
        if status == "Executed" and s["savings"] > 0:
            actual = s["savings"] * random.uniform(0.8, 1.05)
            cursor.execute("""
                INSERT INTO "CostImpacts"
                ("Id", "ProposalId", "ActualSavings",
                 "MeasurementPeriodStart", "MeasurementPeriodEnd", "Evidence", "RecordedAt")
                VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s)
            """, (str(uuid.uuid4()), pid, round(actual, 2),
                  executed_at.date(), (executed_at + timedelta(days=30)).date(),
                  json.dumps({"method": "automated", "verified": True}),
                  executed_at + timedelta(days=1)))

        # Insert insight
        cursor.execute("""
            INSERT INTO "AgentInsights"
            ("Id", "SourceAgent", "InsightType", "EntityType", "EntityId",
             "Summary", "FinancialImpact", "Confidence", "CreatedAt")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (str(uuid.uuid4()), s["agent"], "finding",
              s["agent"].lower(), f"scenario-{i+1}",
              s["title"], s["savings"], s["confidence"], created))

        # Insert alert
        cursor.execute("""
            INSERT INTO "AgentAlerts"
            ("Id", "AgentType", "Severity", "Title", "Message", "Acknowledged", "CreatedAt")
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (str(uuid.uuid4()), s["agent"],
              "Critical" if s["risk"] == "Critical" else "Warning" if s["risk"] == "High" else "Info",
              f"{s['agent']} agent detected: {s['title'][:80]}",
              s["description"][:200],
              status == "Executed",
              created))

        print(f"  [{s['agent']:>8}] [{status:>8}] ${s['savings']:>10,} — {s['title'][:65]}")


def main():
    print(f"Connecting to: {DATABASE_URL}")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cursor = conn.cursor()

    try:
        print("\nSeeding 10 realistic enterprise scenarios...\n")
        seed_scenarios(cursor)
        conn.commit()

        cursor.execute('SELECT COUNT(*) FROM "ActionProposals"')
        print(f"\n  Total proposals: {cursor.fetchone()[0]}")
        cursor.execute('SELECT SUM("EstimatedSavings") FROM "ActionProposals"')
        print(f"  Total savings identified: ${cursor.fetchone()[0]:,.0f}")
        cursor.execute('SELECT COUNT(*) FROM "ActionProposals" WHERE "Status" = \'Pending\'')
        print(f"  Pending approval: {cursor.fetchone()[0]}")
        cursor.execute('SELECT COUNT(*) FROM "ActionProposals" WHERE "Status" = \'Executed\'')
        print(f"  Executed: {cursor.fetchone()[0]}")

        print("\nDone!")

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
