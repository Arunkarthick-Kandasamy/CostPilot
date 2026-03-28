# CostPilot — AI for Enterprise Cost Intelligence & Autonomous Action

**Date**: 2026-03-28
**Status**: Design approved
**Stack**: .NET 8, Python (CrewAI), Angular 17+, PostgreSQL, RabbitMQ

## Context

Hackathon project to build an AI system that goes beyond dashboards — continuously monitoring enterprise operations data, identifying cost leakage/inefficiency, and initiating corrective actions with quantifiable financial impact. Judges evaluate: quantifiable cost impact (show the math), ability to take action (not just reports), data integration depth, and enterprise approval workflows.

## Architecture

Full microservices architecture with 4 specialized AI agent services, a .NET API Gateway, Angular dashboard, PostgreSQL, and RabbitMQ.

### Services

| Service | Tech | Port | Responsibility |
|---------|------|------|----------------|
| API Gateway | .NET 8 Web API | 5000 | Auth, routing, approval workflows, correlation engine, audit trail |
| Spend Intelligence Agent | Python/FastAPI/CrewAI | 8001 | Anomaly detection, duplicate costs, rate optimization |
| SLA Prevention Agent | Python/FastAPI/CrewAI | 8002 | SLA monitoring, breach prediction, escalation |
| Resource Optimization Agent | Python/FastAPI/CrewAI | 8003 | Utilization tracking, consolidation planning, cost allocation |
| FinOps Agent | Python/FastAPI/CrewAI | 8004 | Transaction reconciliation, variance analysis, close acceleration |
| Dashboard | Angular 17+ (nginx) | 4200 | Real-time cost intelligence UI, approvals, impact tracking |
| Database | PostgreSQL | 5432 | All persistent data |
| Message Broker | RabbitMQ | 5672/15672 | Async agent communication, event-driven workflows |

### Communication

```
Angular Dashboard
    | (HTTP / WebSocket)
.NET API Gateway
    | (RabbitMQ + HTTP)
+------------------+------------------+------------------+------------------+
| Spend Agent      | SLA Agent        | Resource Agent   | FinOps Agent     |
+------------------+------------------+------------------+------------------+
    |                    |                  |                  |
    +--------------------+------------------+------------------+
                              |
                         PostgreSQL
```

- Gateway communicates with agents via RabbitMQ (commands, events) and HTTP (health, manual triggers)
- Agents publish findings/insights to RabbitMQ
- Agents read operational data directly from PostgreSQL
- Dashboard connects to Gateway via HTTP + WebSocket (real-time notifications)

## .NET API Gateway

### Authentication & Authorization
- JWT-based authentication
- Roles: Admin, Approver, Viewer
- Role-based endpoint access

### Approval Workflow Engine

```
Agent detects issue
  -> Creates ActionProposal
  -> Publishes to RabbitMQ (proposals exchange)
  -> Gateway receives, persists to DB (status: PENDING)
  -> Notifies dashboard via WebSocket
  -> Approver reviews in Angular UI
  -> Approves / Rejects / Modifies
  -> Gateway publishes decision to RabbitMQ (decisions exchange)
  -> Agent executes if approved
  -> Reports outcome back
  -> Gateway records financial impact
```

### Correlation Engine
- Collects insights from all agents via RabbitMQ (insights exchange)
- Correlation rules match insights by: (a) same entity_id, (b) same entity_type + overlapping time window (1 hour), (c) complementary insight types (e.g., cost_anomaly + underutilized for same vendor)
- Creates Correlated Findings combining matched insights, summing financial impact
- Confidence for correlated findings = max(individual confidences) + 0.05 per additional corroborating insight (capped at 0.99)
- Produces composite proposals that reference all contributing insights

### Key API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | JWT authentication |
| GET | /api/dashboard/summary | Aggregated cost intelligence |
| GET | /api/proposals | List action proposals (filterable) |
| PUT | /api/proposals/{id}/approve | Approve with optional modifications |
| PUT | /api/proposals/{id}/reject | Reject with reason |
| GET | /api/impacts | Financial impact tracking |
| GET | /api/agents/{type}/status | Agent health and status |
| POST | /api/agents/{type}/trigger | Manual agent run trigger |
| GET | /api/insights | Cross-agent correlated insights |
| GET | /api/audit | Audit trail |
| WS | /ws/notifications | Real-time updates |

### Database Schema (PostgreSQL)

**action_proposals**
- id (UUID, PK)
- agent_type (enum: spend, sla, resource, finops)
- title (text)
- description (text)
- estimated_savings (decimal)
- risk_level (enum: low, medium, high, critical)
- status (enum: pending, approved, rejected, executed, failed)
- evidence (jsonb) — supporting data from agent
- created_at (timestamptz)
- approved_by (UUID, FK -> users, nullable)
- approved_at (timestamptz, nullable)
- executed_at (timestamptz, nullable)
- execution_result (jsonb, nullable)

**cost_impacts**
- id (UUID, PK)
- proposal_id (UUID, FK -> action_proposals)
- actual_savings (decimal)
- measurement_period_start (date)
- measurement_period_end (date)
- evidence (jsonb)
- recorded_at (timestamptz)

**agent_alerts**
- id (UUID, PK)
- agent_type (enum)
- severity (enum: info, warning, critical)
- title (text)
- message (text)
- data_snapshot (jsonb)
- acknowledged (boolean, default false)
- created_at (timestamptz)

**agent_insights**
- id (UUID, PK)
- source_agent (enum)
- insight_type (text)
- entity_type (text)
- entity_id (text)
- summary (text)
- financial_impact (decimal)
- confidence (decimal, 0-1)
- related_data (jsonb)
- created_at (timestamptz)

**correlated_findings**
- id (UUID, PK)
- insight_ids (UUID[])
- agents_involved (text[])
- summary (text)
- combined_impact (decimal)
- confidence (decimal)
- created_at (timestamptz)

**audit_log**
- id (UUID, PK)
- entity_type (text)
- entity_id (UUID)
- action (text)
- user_id (UUID, FK -> users, nullable)
- details (jsonb)
- timestamp (timestamptz)

**users**
- id (UUID, PK)
- email (text, unique)
- password_hash (text)
- name (text)
- role (enum: admin, approver, viewer)
- created_at (timestamptz)

## AI Agents

### Shared Infrastructure

All agents share a common Python package (`costpilot-common`):
- RabbitMQ client (publish/subscribe helpers)
- PostgreSQL connection via SQLAlchemy
- CrewAI base configuration and shared tools
- LLM configuration (Claude API via Anthropic SDK)
- Shared insight schema for cross-agent communication

Each agent runs:
- A FastAPI HTTP server (health checks, manual triggers, config endpoints)
- A RabbitMQ consumer (events and commands from gateway)
- A CrewAI Crew with specialized agent roles
- Scheduled analysis runs (configurable interval)

### Insight Sharing Protocol

Agents publish insights to a RabbitMQ topic exchange (`insights`):

```json
{
  "source_agent": "spend_intelligence",
  "insight_type": "cost_anomaly",
  "entity": { "type": "vendor", "id": "vendor_123" },
  "summary": "Vendor X pricing 23% above market rate",
  "financial_impact": 47000,
  "confidence": 0.89,
  "related_data": {},
  "timestamp": "2026-03-28T10:00:00Z"
}
```

Routing keys: `{agent_type}.{insight_type}` (e.g., `spend.cost_anomaly`)

### Agent 1: Spend Intelligence

**CrewAI Roles**:
- `AnomalyDetector` — scans transactions for unusual patterns (price spikes, volume anomalies, seasonal deviations)
- `DuplicateFinder` — identifies duplicate invoices, overlapping vendor contracts, redundant subscriptions
- `RateOptimizer` — compares vendor rates against benchmarks, finds renegotiation opportunities

**Outputs**:
- ActionProposals with estimated savings (e.g., "Vendor X charges 23% above market — $47K/yr savings if renegotiated")
- Procurement playbooks (step-by-step action plans)
- Anomaly alerts with severity scoring

**Cross-Agent**: Publishes `spend.cost_anomaly`, `spend.duplicate_cost`, `spend.rate_opportunity`. Subscribes to `finops.variance_detected` to investigate procurement-related variances.

### Agent 2: SLA Prevention

**CrewAI Roles**:
- `SLAMonitor` — tracks service metrics against SLA thresholds
- `BreachPredictor` — trend analysis to predict breaches before they happen
- `EscalationManager` — recommends resource shifts, work rerouting, or escalations

**Outputs**:
- Early warnings (e.g., "Service X at 87% — trending toward breach in 4 hours")
- ActionProposals with penalty avoidance value (e.g., "Shift 2 resources to prevent $150K penalty")
- Post-incident analysis: root cause + cost avoided

**Cross-Agent**: Publishes `sla.breach_warning`, `sla.resource_need`. Subscribes to `resource.idle_capacity` to identify resources for reallocation.

### Agent 3: Resource Optimization

**CrewAI Roles**:
- `UtilizationAnalyzer` — tracks usage across licenses, infrastructure, tools, teams
- `ConsolidationPlanner` — identifies underused resources, proposes consolidation
- `CostAllocator` — attributes costs to teams/projects for accountability

**Outputs**:
- ActionProposals (e.g., "12 unused Jira licenses — cancel for $2,400/month savings")
- Utilization reports with cost allocation breakdowns
- Consolidation roadmaps

**Cross-Agent**: Publishes `resource.idle_capacity`, `resource.underutilized`. Subscribes to `spend.cost_anomaly` (tool cost anomalies), `sla.resource_need` (capacity requests).

### Agent 4: FinOps

**CrewAI Roles**:
- `TransactionReconciler` — matches expected vs actual transactions, flags discrepancies
- `VarianceAnalyst` — compares budget vs actual with root-cause attribution
- `CloseAccelerator` — automates reconciliation steps to speed up financial close

**Outputs**:
- Discrepancy alerts (e.g., "Invoice #4521 — $8,200 variance from PO")
- Variance reports with root-cause trees
- ActionProposals (e.g., "Auto-reconcile 340 matched transactions — cut close by 2 days")

**Cross-Agent**: Publishes `finops.variance_detected`, `finops.discrepancy`. Subscribes to `spend.cost_anomaly`, `spend.duplicate_cost` for procurement-related variances.

### Cross-Agent Collaboration Examples

1. **Spend + Resource**: Spend finds expensive vendor tool → Resource confirms low utilization → combined "Cancel underused expensive tool" proposal
2. **SLA + Resource**: SLA predicts breach → Resource finds idle capacity → combined "Reallocate resources to prevent penalty" proposal
3. **FinOps + Spend**: FinOps detects budget variance → Spend finds root cause anomaly → combined finding with full financial attribution
4. **Resource + FinOps**: Resource finds overlapping subscriptions → FinOps calculates total cost impact → combined consolidation report

## Angular Dashboard

### Pages

**1. Executive Dashboard** (landing)
- KPI cards: Total savings identified, savings realized, pending approvals, active agents
- Savings trend line chart (over time)
- Top findings by $ impact
- Cross-agent correlated findings highlight
- Agent health status indicators

**2. Agent Views** (one per agent type, shared layout)
- Agent health & last run timestamp
- Findings list: severity, impact, confidence, status
- Drill-down into finding details with supporting evidence
- Manual trigger button

**3. Proposals & Approvals**
- Filterable/sortable table: status, agent, impact, risk
- Detail view: full proposal with evidence, estimated savings, risk assessment
- Approve / Reject / Modify buttons with comment field
- Bulk approve for low-risk items

**4. Impact Tracking**
- Before/after comparisons for executed actions
- Cumulative savings chart over time
- ROI per agent type
- Exportable reports

**5. Data Explorer**
- Browse synthetic operational data by domain
- View what each agent sees
- Useful for demo to show data integration depth

### Advanced Visualizations

All using **ECharts** (via ngx-echarts) as primary library:

**Sankey/Flow Diagrams**:
- Cost flow: Budget → Departments → Vendors/Tools → Waste/Savings
- Approval flow: Proposals → Approved/Rejected → Executed → Impact
- Interactive — click flows to drill into underlying data

**Heatmaps**:
- Resource utilization: Teams x Time, color by usage %
- Cost anomaly: Categories x Months, highlighting deviations
- SLA health: Services x Time, compliance zones

**Agent Activity Timeline**:
- Horizontal timeline per agent: scans, findings, proposals, executions
- Zoomable/scrollable, click to see details
- Cross-agent correlation lines connecting related events

**Cost Breakdown Treemaps**:
- Drill-down: Organization → Department → Team → Category → Vendor
- Size = cost, color = efficiency (green = on-budget, red = overspend)
- Click to zoom into sub-levels

### Real-Time Updates
- WebSocket connection to .NET Gateway
- Toast notifications for new findings, SLA warnings
- Live dashboard updates without page refresh

### Design
- Clean enterprise aesthetic (Azure Portal / Datadog inspired)
- Angular Material components
- Dark/light mode toggle
- Desktop-first, responsive

## Synthetic Data

### Domains & Scale

**Procurement & Vendors**:
- 50 vendors with contracts, rate cards, payment terms
- 10,000+ purchase orders over 12 months
- Embedded anomalies: 5% duplicate invoices, 3 vendors 15-30% above market, seasonal spikes

**SLA & Services**:
- 20 services with defined SLAs (uptime, response time, resolution time)
- 6 months of metric data with realistic degradation patterns
- 3 upcoming breaches baked in for live demo
- Penalty schedule: $10K-$150K per breach type

**Resources & Utilization**:
- 200 employees across 15 teams
- 30 software tools/licenses with usage logs
- 50 servers/VMs with CPU/memory/storage metrics
- Embedded waste: 15% unused licenses, 20% idle infrastructure

**Financial**:
- Departmental budgets vs actuals (12 months)
- 5,000+ GL entries
- 50 deliberate discrepancies for reconciliation
- Variance patterns with identifiable root causes

### Seeding Strategy
- Python script using `Faker` + custom business logic
- Deterministic (fixed random seed) for reproducible demos
- Can regenerate with different scenarios

## DevOps

### Docker Compose

All services containerized, single `docker-compose up` to start:

```yaml
services:
  gateway:        # .NET 8 API
  spend-agent:    # Python/CrewAI
  sla-agent:      # Python/CrewAI
  resource-agent: # Python/CrewAI
  finops-agent:   # Python/CrewAI
  dashboard:      # Angular/nginx
  postgres:       # PostgreSQL 16
  rabbitmq:       # RabbitMQ 3.13 with management UI
```

### Environment
- `.env` file for configuration (API keys, DB connection, RabbitMQ)
- Each agent has its own Dockerfile (Python 3.12 slim)
- Gateway has .NET 8 SDK Dockerfile
- Dashboard built with `ng build` and served via nginx

## Verification

### How to test end-to-end
1. `docker-compose up` — all services start
2. Run seed script — populate database with synthetic data
3. Navigate to `http://localhost:4200` — dashboard loads
4. Login as admin — see executive dashboard with initial data
5. Trigger agent runs manually — agents analyze data and publish findings
6. Check proposals page — new proposals appear in real-time
7. Approve a proposal — see it execute and financial impact recorded
8. Check correlated findings — cross-agent insights appear
9. Verify all visualizations render with real data
10. Check audit trail — all actions logged
