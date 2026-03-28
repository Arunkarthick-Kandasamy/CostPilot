# CostPilot — Local Run Guide

## Prerequisites

- PostgreSQL 16 running on port 5432 (password: `postgres`)
- RabbitMQ running on port 5672
- .NET 8 SDK
- Python 3.10+
- Node.js 18+

---

## Step 1: Create Database

```bash
psql -U postgres -c "CREATE DATABASE costpilot;"
```

---

## Step 2: Run EF Core Migrations

```bash
cd "D:\Personal\et-hackthon\Bio Bridge solution\costpilot\gateway"
dotnet ef database update --project src/CostPilot.Gateway.Infrastructure --startup-project src/CostPilot.Gateway.Api
```

---

## Step 3: Seed Operational Data (46K+ records)

```bash
cd "D:\Personal\et-hackthon\Bio Bridge solution\costpilot\agents\seed"
python -m pip install psycopg2-binary faker
python seed_data.py
```

---

## Step 4: Seed Dashboard Demo Data (proposals, alerts, insights)

```bash
cd "D:\Personal\et-hackthon\Bio Bridge solution\costpilot\agents\seed"
python seed_dashboard.py
```

To reseed (clear and reload):
```bash
python seed_dashboard.py --force
```

---

## Step 5: Install Python Common Library

```bash
cd "D:\Personal\et-hackthon\Bio Bridge solution\costpilot\agents\common"
python -m pip install -e .
```

---

## Step 6: Start .NET Gateway (Terminal 1)

```bash
cd "D:\Personal\et-hackthon\Bio Bridge solution\costpilot\gateway\src\CostPilot.Gateway.Api"
dotnet run --urls="http://localhost:5000"
```

Verify: http://localhost:5000/health
Swagger: http://localhost:5000/swagger

---

## Step 7: Start Angular Dashboard (Terminal 2)

```bash
cd "D:\Personal\et-hackthon\Bio Bridge solution\costpilot\dashboard"
npm install
npx ng serve --proxy-config proxy.conf.json --port 4200
```

Open: http://localhost:4200

Login:
- Admin: `admin@costpilot.com` / `admin123`
- Approver: `approver@costpilot.com` / `approver123`
- Viewer: `viewer@costpilot.com` / `viewer123`

---

## Step 8: Start AI Agents (one per terminal)

### Spend Intelligence Agent (Terminal 3)
```bash
cd "D:\Personal\et-hackthon\Bio Bridge solution\costpilot\agents\spend-agent\src"
python -m uvicorn spend_agent.main:app --port 8001 --reload
```

### SLA Prevention Agent (Terminal 4)
```bash
cd "D:\Personal\et-hackthon\Bio Bridge solution\costpilot\agents\sla-agent\src"
python -m uvicorn sla_agent.main:app --port 8002 --reload
```

### Resource Optimization Agent (Terminal 5)
```bash
cd "D:\Personal\et-hackthon\Bio Bridge solution\costpilot\agents\resource-agent\src"
python -m uvicorn resource_agent.main:app --port 8003 --reload
```

### FinOps Agent (Terminal 6)
```bash
cd "D:\Personal\et-hackthon\Bio Bridge solution\costpilot\agents\finops-agent\src"
python -m uvicorn finops_agent.main:app --port 8004 --reload
```

---

## Step 9: Trigger Agent Analysis

```bash
curl -X POST http://localhost:8001/run
curl -X POST http://localhost:8002/run
curl -X POST http://localhost:8003/run
curl -X POST http://localhost:8004/run
```

Or click **"Run Analysis"** button on each agent's page in the dashboard.

---

## Step 10: Enable AI Mode (Optional)

Set your Anthropic API key and agents auto-switch from demo (SQL) to AI (CrewAI + Claude):

```bash
set ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Then restart the agents.

---

## All Services Summary

| Service | URL | Port |
|---------|-----|------|
| Angular Dashboard | http://localhost:4200 | 4200 |
| .NET API Gateway | http://localhost:5000 | 5000 |
| Swagger API Docs | http://localhost:5000/swagger | 5000 |
| Spend Agent | http://localhost:8001 | 8001 |
| SLA Agent | http://localhost:8002 | 8002 |
| Resource Agent | http://localhost:8003 | 8003 |
| FinOps Agent | http://localhost:8004 | 8004 |
| PostgreSQL | localhost | 5432 |
| RabbitMQ | localhost | 5672 |
| RabbitMQ Management | http://localhost:15672 | 15672 |

---

## Quick Health Check

```bash
curl http://localhost:5000/health
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health
curl http://localhost:8004/health
```

---

## Troubleshooting

### Port already in use
```bash
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Database connection fails
Check PostgreSQL is running:
```bash
pg_isready -U postgres
```

### RabbitMQ not connecting
Check service is running:
```bash
sc query RabbitMQ
```

### Angular build errors
```bash
cd costpilot\dashboard
rm -rf node_modules .angular
npm install
npx ng serve --proxy-config proxy.conf.json --port 4200
```

### Reset all data
```bash
cd costpilot\agents\seed
python seed_data.py --force
python seed_dashboard.py --force
```
