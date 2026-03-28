# CostPilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-agent enterprise cost intelligence platform with 4 AI agents, .NET gateway, Angular dashboard, and cross-agent collaboration.

**Architecture:** Full microservices — .NET 8 API Gateway (MassTransit + SignalR + EF Core), 4 Python/CrewAI agent services, Angular 17+ dashboard with ECharts, PostgreSQL, RabbitMQ. All containerized via Docker Compose.

**Tech Stack:** .NET 8, Python 3.12, CrewAI 1.12+, FastAPI, Angular 17+, Angular Material, ECharts (ngx-echarts), PostgreSQL 16, RabbitMQ 3.13, MassTransit, SignalR, Docker Compose

**Spec:** `docs/superpowers/specs/2026-03-28-costpilot-design.md`

---

## File Structure

```
costpilot/
├── docker-compose.yml
├── .env
├── .gitignore
│
├── gateway/                              # .NET 8 API Gateway
│   ├── CostPilot.Gateway.sln
│   ├── src/
│   │   ├── CostPilot.Gateway.Api/
│   │   │   ├── Program.cs
│   │   │   ├── appsettings.json
│   │   │   ├── appsettings.Development.json
│   │   │   ├── Dockerfile
│   │   │   ├── Endpoints/
│   │   │   │   ├── AuthEndpoints.cs
│   │   │   │   ├── ProposalEndpoints.cs
│   │   │   │   ├── DashboardEndpoints.cs
│   │   │   │   ├── AgentEndpoints.cs
│   │   │   │   ├── InsightEndpoints.cs
│   │   │   │   └── ImpactEndpoints.cs
│   │   │   ├── Hubs/
│   │   │   │   └── NotificationHub.cs
│   │   │   ├── Consumers/
│   │   │   │   ├── ProposalCreatedConsumer.cs
│   │   │   │   ├── AgentAlertConsumer.cs
│   │   │   │   ├── InsightPublishedConsumer.cs
│   │   │   │   └── ProposalExecutedConsumer.cs
│   │   │   └── Services/
│   │   │       ├── TokenService.cs
│   │   │       └── CorrelationEngine.cs
│   │   │
│   │   ├── CostPilot.Gateway.Domain/
│   │   │   ├── Entities/
│   │   │   │   ├── User.cs
│   │   │   │   ├── ActionProposal.cs
│   │   │   │   ├── CostImpact.cs
│   │   │   │   ├── AgentAlert.cs
│   │   │   │   ├── AgentInsight.cs
│   │   │   │   ├── CorrelatedFinding.cs
│   │   │   │   └── AuditLog.cs
│   │   │   └── Enums/
│   │   │       ├── AgentType.cs
│   │   │       ├── ProposalStatus.cs
│   │   │       ├── RiskLevel.cs
│   │   │       ├── Severity.cs
│   │   │       └── UserRole.cs
│   │   │
│   │   ├── CostPilot.Gateway.Infrastructure/
│   │   │   ├── Data/
│   │   │   │   ├── CostPilotDbContext.cs
│   │   │   │   └── Configurations/
│   │   │   │       ├── UserConfiguration.cs
│   │   │   │       ├── ActionProposalConfiguration.cs
│   │   │   │       ├── CostImpactConfiguration.cs
│   │   │   │       ├── AgentAlertConfiguration.cs
│   │   │   │       ├── AgentInsightConfiguration.cs
│   │   │   │       ├── CorrelatedFindingConfiguration.cs
│   │   │   │       └── AuditLogConfiguration.cs
│   │   │   └── Seed/
│   │   │       └── DbSeeder.cs
│   │   │
│   │   └── CostPilot.Contracts/          # Shared MassTransit message contracts
│   │       ├── ProposalCreated.cs
│   │       ├── ProposalDecision.cs
│   │       ├── ProposalExecuted.cs
│   │       ├── AgentAlertRaised.cs
│   │       ├── InsightPublished.cs
│   │       └── TriggerAgentRun.cs
│   │
│   └── tests/
│       └── CostPilot.Gateway.Tests/
│           ├── Services/
│           │   ├── TokenServiceTests.cs
│           │   └── CorrelationEngineTests.cs
│           └── Endpoints/
│               ├── AuthEndpointsTests.cs
│               └── ProposalEndpointsTests.cs
│
├── agents/
│   ├── common/                            # Shared Python package
│   │   ├── pyproject.toml
│   │   └── costpilot_common/
│   │       ├── __init__.py
│   │       ├── messaging.py               # RabbitMQ publish/subscribe
│   │       ├── database.py                # SQLAlchemy models + session
│   │       ├── models.py                  # Shared data models
│   │       ├── schemas.py                 # Pydantic schemas (insight, proposal)
│   │       ├── config.py                  # Environment config
│   │       └── llm.py                     # CrewAI LLM setup
│   │
│   ├── spend-agent/
│   │   ├── Dockerfile
│   │   ├── pyproject.toml
│   │   ├── src/
│   │   │   └── spend_agent/
│   │   │       ├── __init__.py
│   │   │       ├── main.py                # FastAPI app + startup
│   │   │       ├── crew.py                # CrewAI crew definition
│   │   │       ├── tools/
│   │   │       │   ├── __init__.py
│   │   │       │   ├── anomaly_detector.py
│   │   │       │   ├── duplicate_finder.py
│   │   │       │   └── rate_optimizer.py
│   │   │       └── config/
│   │   │           ├── agents.yaml
│   │   │           └── tasks.yaml
│   │   └── tests/
│   │       └── test_crew.py
│   │
│   ├── sla-agent/
│   │   ├── Dockerfile
│   │   ├── pyproject.toml
│   │   ├── src/
│   │   │   └── sla_agent/
│   │   │       ├── __init__.py
│   │   │       ├── main.py
│   │   │       ├── crew.py
│   │   │       ├── tools/
│   │   │       │   ├── __init__.py
│   │   │       │   ├── sla_monitor.py
│   │   │       │   ├── breach_predictor.py
│   │   │       │   └── escalation_manager.py
│   │   │       └── config/
│   │   │           ├── agents.yaml
│   │   │           └── tasks.yaml
│   │   └── tests/
│   │       └── test_crew.py
│   │
│   ├── resource-agent/
│   │   ├── Dockerfile
│   │   ├── pyproject.toml
│   │   ├── src/
│   │   │   └── resource_agent/
│   │   │       ├── __init__.py
│   │   │       ├── main.py
│   │   │       ├── crew.py
│   │   │       ├── tools/
│   │   │       │   ├── __init__.py
│   │   │       │   ├── utilization_analyzer.py
│   │   │       │   ├── consolidation_planner.py
│   │   │       │   └── cost_allocator.py
│   │   │       └── config/
│   │   │           ├── agents.yaml
│   │   │           └── tasks.yaml
│   │   └── tests/
│   │       └── test_crew.py
│   │
│   ├── finops-agent/
│   │   ├── Dockerfile
│   │   ├── pyproject.toml
│   │   ├── src/
│   │   │   └── finops_agent/
│   │   │       ├── __init__.py
│   │   │       ├── main.py
│   │   │       ├── crew.py
│   │   │       ├── tools/
│   │   │       │   ├── __init__.py
│   │   │       │   ├── transaction_reconciler.py
│   │   │       │   ├── variance_analyst.py
│   │   │       │   └── close_accelerator.py
│   │   │       └── config/
│   │   │           ├── agents.yaml
│   │   │           └── tasks.yaml
│   │   └── tests/
│   │       └── test_crew.py
│   │
│   └── seed/
│       ├── pyproject.toml
│       ├── seed_data.py                   # Main seeding script
│       └── generators/
│           ├── __init__.py
│           ├── vendors.py
│           ├── procurement.py
│           ├── sla_services.py
│           ├── resources.py
│           └── financial.py
│
├── dashboard/                             # Angular 17+
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── src/
│   │   ├── main.ts
│   │   ├── index.html
│   │   ├── styles.scss
│   │   └── app/
│   │       ├── app.component.ts
│   │       ├── app.config.ts
│   │       ├── app.routes.ts
│   │       ├── core/
│   │       │   ├── services/
│   │       │   │   ├── auth.service.ts
│   │       │   │   ├── api.service.ts
│   │       │   │   ├── signalr.service.ts
│   │       │   │   └── notification.service.ts
│   │       │   ├── interceptors/
│   │       │   │   └── auth.interceptor.ts
│   │       │   ├── guards/
│   │       │   │   └── auth.guard.ts
│   │       │   ├── providers/
│   │       │   │   └── echarts-setup.ts
│   │       │   └── types/
│   │       │       └── api.types.ts
│   │       ├── shared/
│   │       │   └── components/
│   │       │       ├── metric-card/
│   │       │       │   └── metric-card.component.ts
│   │       │       ├── status-badge/
│   │       │       │   └── status-badge.component.ts
│   │       │       └── data-table/
│   │       │           └── data-table.component.ts
│   │       └── features/
│   │           ├── shell/
│   │           │   └── shell.component.ts
│   │           ├── login/
│   │           │   └── login.component.ts
│   │           ├── executive-dashboard/
│   │           │   ├── executive-dashboard.component.ts
│   │           │   └── components/
│   │           │       ├── savings-trend-chart.component.ts
│   │           │       ├── cost-flow-sankey.component.ts
│   │           │       ├── agent-status-cards.component.ts
│   │           │       └── top-findings-list.component.ts
│   │           ├── proposals/
│   │           │   ├── proposals-list.component.ts
│   │           │   └── proposal-detail.component.ts
│   │           ├── agents/
│   │           │   ├── agent-view.component.ts
│   │           │   └── components/
│   │           │       └── agent-activity-timeline.component.ts
│   │           ├── impact/
│   │           │   ├── impact-tracking.component.ts
│   │           │   └── components/
│   │           │       ├── savings-treemap.component.ts
│   │           │       └── utilization-heatmap.component.ts
│   │           └── data-explorer/
│   │               └── data-explorer.component.ts
│   ├── angular.json
│   ├── package.json
│   └── tsconfig.json
```

---

## Phase 1: Infrastructure & Docker Compose

### Task 1: Project Root & Docker Compose

**Files:**
- Create: `costpilot/docker-compose.yml`
- Create: `costpilot/.env`
- Create: `costpilot/.gitignore`

- [ ] **Step 1: Create project root directory**

```bash
mkdir -p "D:/Personal/et-hackthon/Bio Bridge solution/costpilot"
```

- [ ] **Step 2: Create .gitignore**

Create `costpilot/.gitignore`:

```gitignore
# .NET
bin/
obj/
*.user
*.suo

# Python
__pycache__/
*.pyc
.venv/
*.egg-info/
dist/

# Angular
node_modules/
.angular/
dist/

# IDE
.idea/
.vscode/
*.swp

# Environment
.env
!.env.example

# Docker
docker-compose.override.yml

# OS
Thumbs.db
.DS_Store
```

- [ ] **Step 3: Create .env file**

Create `costpilot/.env`:

```env
# Database
POSTGRES_USER=costpilot
POSTGRES_PASSWORD=costpilot_dev
POSTGRES_DB=costpilot
DATABASE_URL=Host=postgres;Port=5432;Database=costpilot;Username=costpilot;Password=costpilot_dev

# RabbitMQ
RABBITMQ_DEFAULT_USER=costpilot
RABBITMQ_DEFAULT_PASS=costpilot_dev
RABBITMQ_URL=amqp://costpilot:costpilot_dev@rabbitmq:5672/

# JWT
JWT_SECRET=CostPilotSuperSecretKeyThatIsAtLeast32BytesLong!!
JWT_ISSUER=CostPilotGateway
JWT_AUDIENCE=CostPilotClients

# LLM
ANTHROPIC_API_KEY=your-key-here
```

- [ ] **Step 4: Create docker-compose.yml**

Create `costpilot/docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5

  rabbitmq:
    image: rabbitmq:3.13-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_DEFAULT_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_DEFAULT_PASS}
    ports:
      - "5672:5672"
      - "15672:15672"
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_port_connectivity"]
      interval: 10s
      timeout: 10s
      retries: 5

  gateway:
    build:
      context: ./gateway
      dockerfile: src/CostPilot.Gateway.Api/Dockerfile
    ports:
      - "5000:8080"
    environment:
      - ConnectionStrings__CostPilotDb=${DATABASE_URL}
      - JwtSettings__Secret=${JWT_SECRET}
      - JwtSettings__Issuer=${JWT_ISSUER}
      - JwtSettings__Audience=${JWT_AUDIENCE}
      - RabbitMq__Host=rabbitmq
      - RabbitMq__Username=${RABBITMQ_DEFAULT_USER}
      - RabbitMq__Password=${RABBITMQ_DEFAULT_PASS}
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy

  spend-agent:
    build:
      context: ./agents
      dockerfile: spend-agent/Dockerfile
    ports:
      - "8001:8000"
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - RABBITMQ_URL=${RABBITMQ_URL}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - AGENT_TYPE=spend
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy

  sla-agent:
    build:
      context: ./agents
      dockerfile: sla-agent/Dockerfile
    ports:
      - "8002:8000"
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - RABBITMQ_URL=${RABBITMQ_URL}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - AGENT_TYPE=sla
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy

  resource-agent:
    build:
      context: ./agents
      dockerfile: resource-agent/Dockerfile
    ports:
      - "8003:8000"
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - RABBITMQ_URL=${RABBITMQ_URL}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - AGENT_TYPE=resource
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy

  finops-agent:
    build:
      context: ./agents
      dockerfile: finops-agent/Dockerfile
    ports:
      - "8004:8000"
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - RABBITMQ_URL=${RABBITMQ_URL}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - AGENT_TYPE=finops
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy

  dashboard:
    build:
      context: ./dashboard
    ports:
      - "4200:80"
    depends_on:
      - gateway

volumes:
  pgdata:
```

- [ ] **Step 5: Verify infrastructure starts**

```bash
cd costpilot && docker-compose up -d postgres rabbitmq
```

Expected: PostgreSQL on 5432, RabbitMQ management UI on 15672.

- [ ] **Step 6: Commit**

```bash
git init && git add -A && git commit -m "chore: project scaffolding with Docker Compose, PostgreSQL, RabbitMQ"
```

---

## Phase 2: .NET Gateway — Domain & Infrastructure

### Task 2: .NET Solution & Domain Entities

**Files:**
- Create: `costpilot/gateway/CostPilot.Gateway.sln`
- Create: `costpilot/gateway/src/CostPilot.Gateway.Domain/` (all entity + enum files)

- [ ] **Step 1: Scaffold .NET solution**

```bash
cd costpilot/gateway
dotnet new sln -n CostPilot.Gateway
mkdir -p src
dotnet new classlib -n CostPilot.Gateway.Domain -o src/CostPilot.Gateway.Domain
dotnet new classlib -n CostPilot.Gateway.Infrastructure -o src/CostPilot.Gateway.Infrastructure
dotnet new classlib -n CostPilot.Contracts -o src/CostPilot.Contracts
dotnet new webapi -n CostPilot.Gateway.Api -o src/CostPilot.Gateway.Api --use-minimal-apis
dotnet new xunit -n CostPilot.Gateway.Tests -o tests/CostPilot.Gateway.Tests
dotnet sln add src/CostPilot.Gateway.Domain src/CostPilot.Gateway.Infrastructure src/CostPilot.Contracts src/CostPilot.Gateway.Api tests/CostPilot.Gateway.Tests
dotnet add src/CostPilot.Gateway.Infrastructure reference src/CostPilot.Gateway.Domain
dotnet add src/CostPilot.Gateway.Api reference src/CostPilot.Gateway.Infrastructure src/CostPilot.Gateway.Domain src/CostPilot.Contracts
dotnet add tests/CostPilot.Gateway.Tests reference src/CostPilot.Gateway.Api src/CostPilot.Gateway.Domain
```

- [ ] **Step 2: Create enums**

Create `src/CostPilot.Gateway.Domain/Enums/AgentType.cs`:
```csharp
namespace CostPilot.Gateway.Domain.Enums;

public enum AgentType
{
    Spend,
    Sla,
    Resource,
    Finops
}
```

Create `src/CostPilot.Gateway.Domain/Enums/ProposalStatus.cs`:
```csharp
namespace CostPilot.Gateway.Domain.Enums;

public enum ProposalStatus
{
    Pending,
    Approved,
    Rejected,
    Executed,
    Failed
}
```

Create `src/CostPilot.Gateway.Domain/Enums/RiskLevel.cs`:
```csharp
namespace CostPilot.Gateway.Domain.Enums;

public enum RiskLevel
{
    Low,
    Medium,
    High,
    Critical
}
```

Create `src/CostPilot.Gateway.Domain/Enums/Severity.cs`:
```csharp
namespace CostPilot.Gateway.Domain.Enums;

public enum Severity
{
    Info,
    Warning,
    Critical
}
```

Create `src/CostPilot.Gateway.Domain/Enums/UserRole.cs`:
```csharp
namespace CostPilot.Gateway.Domain.Enums;

public enum UserRole
{
    Admin,
    Approver,
    Viewer
}
```

- [ ] **Step 3: Create entity classes**

Create `src/CostPilot.Gateway.Domain/Entities/User.cs`:
```csharp
namespace CostPilot.Gateway.Domain.Entities;

using CostPilot.Gateway.Domain.Enums;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = default!;
    public string PasswordHash { get; set; } = default!;
    public string Name { get; set; } = default!;
    public UserRole Role { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

Create `src/CostPilot.Gateway.Domain/Entities/ActionProposal.cs`:
```csharp
namespace CostPilot.Gateway.Domain.Entities;

using CostPilot.Gateway.Domain.Enums;

public class ActionProposal
{
    public Guid Id { get; set; }
    public AgentType AgentType { get; set; }
    public string Title { get; set; } = default!;
    public string Description { get; set; } = default!;
    public decimal EstimatedSavings { get; set; }
    public RiskLevel RiskLevel { get; set; }
    public ProposalStatus Status { get; set; }
    public string? Evidence { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? ExecutedAt { get; set; }
    public string? ExecutionResult { get; set; }

    public User? Approver { get; set; }
    public List<CostImpact> Impacts { get; set; } = [];
}
```

Create `src/CostPilot.Gateway.Domain/Entities/CostImpact.cs`:
```csharp
namespace CostPilot.Gateway.Domain.Entities;

public class CostImpact
{
    public Guid Id { get; set; }
    public Guid ProposalId { get; set; }
    public decimal ActualSavings { get; set; }
    public DateOnly MeasurementPeriodStart { get; set; }
    public DateOnly MeasurementPeriodEnd { get; set; }
    public string? Evidence { get; set; }
    public DateTime RecordedAt { get; set; }

    public ActionProposal Proposal { get; set; } = default!;
}
```

Create `src/CostPilot.Gateway.Domain/Entities/AgentAlert.cs`:
```csharp
namespace CostPilot.Gateway.Domain.Entities;

using CostPilot.Gateway.Domain.Enums;

public class AgentAlert
{
    public Guid Id { get; set; }
    public AgentType AgentType { get; set; }
    public Severity Severity { get; set; }
    public string Title { get; set; } = default!;
    public string Message { get; set; } = default!;
    public string? DataSnapshot { get; set; }
    public bool Acknowledged { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

Create `src/CostPilot.Gateway.Domain/Entities/AgentInsight.cs`:
```csharp
namespace CostPilot.Gateway.Domain.Entities;

using CostPilot.Gateway.Domain.Enums;

public class AgentInsight
{
    public Guid Id { get; set; }
    public AgentType SourceAgent { get; set; }
    public string InsightType { get; set; } = default!;
    public string EntityType { get; set; } = default!;
    public string EntityId { get; set; } = default!;
    public string Summary { get; set; } = default!;
    public decimal FinancialImpact { get; set; }
    public decimal Confidence { get; set; }
    public string? RelatedData { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

Create `src/CostPilot.Gateway.Domain/Entities/CorrelatedFinding.cs`:
```csharp
namespace CostPilot.Gateway.Domain.Entities;

public class CorrelatedFinding
{
    public Guid Id { get; set; }
    public List<Guid> InsightIds { get; set; } = [];
    public List<string> AgentsInvolved { get; set; } = [];
    public string Summary { get; set; } = default!;
    public decimal CombinedImpact { get; set; }
    public decimal Confidence { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

Create `src/CostPilot.Gateway.Domain/Entities/AuditLog.cs`:
```csharp
namespace CostPilot.Gateway.Domain.Entities;

public class AuditLog
{
    public Guid Id { get; set; }
    public string EntityType { get; set; } = default!;
    public Guid EntityId { get; set; }
    public string Action { get; set; } = default!;
    public Guid? UserId { get; set; }
    public string? Details { get; set; }
    public DateTime Timestamp { get; set; }
}
```

- [ ] **Step 4: Verify domain compiles**

```bash
cd costpilot/gateway && dotnet build src/CostPilot.Gateway.Domain
```

Expected: Build succeeded.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add .NET solution structure and domain entities"
```

---

### Task 3: EF Core Infrastructure & DbContext

**Files:**
- Create: `gateway/src/CostPilot.Gateway.Infrastructure/Data/CostPilotDbContext.cs`
- Create: `gateway/src/CostPilot.Gateway.Infrastructure/Data/Configurations/*.cs`

- [ ] **Step 1: Add NuGet packages**

```bash
cd costpilot/gateway
dotnet add src/CostPilot.Gateway.Infrastructure package Npgsql.EntityFrameworkCore.PostgreSQL --version 8.0.*
dotnet add src/CostPilot.Gateway.Infrastructure package Microsoft.EntityFrameworkCore.Design --version 8.0.*
dotnet add src/CostPilot.Gateway.Api package Microsoft.EntityFrameworkCore.Design --version 8.0.*
```

- [ ] **Step 2: Create DbContext**

Create `src/CostPilot.Gateway.Infrastructure/Data/CostPilotDbContext.cs`:
```csharp
namespace CostPilot.Gateway.Infrastructure.Data;

using CostPilot.Gateway.Domain.Entities;
using Microsoft.EntityFrameworkCore;

public class CostPilotDbContext(DbContextOptions<CostPilotDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<ActionProposal> ActionProposals => Set<ActionProposal>();
    public DbSet<CostImpact> CostImpacts => Set<CostImpact>();
    public DbSet<AgentAlert> AgentAlerts => Set<AgentAlert>();
    public DbSet<AgentInsight> AgentInsights => Set<AgentInsight>();
    public DbSet<CorrelatedFinding> CorrelatedFindings => Set<CorrelatedFinding>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CostPilotDbContext).Assembly);
    }
}
```

- [ ] **Step 3: Create entity configurations**

Create `src/CostPilot.Gateway.Infrastructure/Data/Configurations/UserConfiguration.cs`:
```csharp
namespace CostPilot.Gateway.Infrastructure.Data.Configurations;

using CostPilot.Gateway.Domain.Entities;
using CostPilot.Gateway.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(u => u.Email).HasMaxLength(256).IsRequired();
        builder.HasIndex(u => u.Email).IsUnique();
        builder.Property(u => u.PasswordHash).IsRequired();
        builder.Property(u => u.Name).HasMaxLength(200).IsRequired();
        builder.Property(u => u.Role).HasConversion<string>().HasMaxLength(20);
        builder.Property(u => u.CreatedAt).HasDefaultValueSql("now()");
    }
}
```

Create `src/CostPilot.Gateway.Infrastructure/Data/Configurations/ActionProposalConfiguration.cs`:
```csharp
namespace CostPilot.Gateway.Infrastructure.Data.Configurations;

using CostPilot.Gateway.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class ActionProposalConfiguration : IEntityTypeConfiguration<ActionProposal>
{
    public void Configure(EntityTypeBuilder<ActionProposal> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(p => p.AgentType).HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.Title).HasMaxLength(500).IsRequired();
        builder.Property(p => p.Description).IsRequired();
        builder.Property(p => p.EstimatedSavings).HasPrecision(18, 2);
        builder.Property(p => p.RiskLevel).HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.Evidence).HasColumnType("jsonb");
        builder.Property(p => p.ExecutionResult).HasColumnType("jsonb");
        builder.Property(p => p.CreatedAt).HasDefaultValueSql("now()");

        builder.HasOne(p => p.Approver)
            .WithMany()
            .HasForeignKey(p => p.ApprovedBy)
            .IsRequired(false);

        builder.HasIndex(p => p.Status);
        builder.HasIndex(p => p.AgentType);
    }
}
```

Create `src/CostPilot.Gateway.Infrastructure/Data/Configurations/CostImpactConfiguration.cs`:
```csharp
namespace CostPilot.Gateway.Infrastructure.Data.Configurations;

using CostPilot.Gateway.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class CostImpactConfiguration : IEntityTypeConfiguration<CostImpact>
{
    public void Configure(EntityTypeBuilder<CostImpact> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(c => c.ActualSavings).HasPrecision(18, 2);
        builder.Property(c => c.Evidence).HasColumnType("jsonb");
        builder.Property(c => c.RecordedAt).HasDefaultValueSql("now()");

        builder.HasOne(c => c.Proposal)
            .WithMany(p => p.Impacts)
            .HasForeignKey(c => c.ProposalId);
    }
}
```

Create `src/CostPilot.Gateway.Infrastructure/Data/Configurations/AgentAlertConfiguration.cs`:
```csharp
namespace CostPilot.Gateway.Infrastructure.Data.Configurations;

using CostPilot.Gateway.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class AgentAlertConfiguration : IEntityTypeConfiguration<AgentAlert>
{
    public void Configure(EntityTypeBuilder<AgentAlert> builder)
    {
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(a => a.AgentType).HasConversion<string>().HasMaxLength(20);
        builder.Property(a => a.Severity).HasConversion<string>().HasMaxLength(20);
        builder.Property(a => a.Title).HasMaxLength(500).IsRequired();
        builder.Property(a => a.Message).IsRequired();
        builder.Property(a => a.DataSnapshot).HasColumnType("jsonb");
        builder.Property(a => a.CreatedAt).HasDefaultValueSql("now()");

        builder.HasIndex(a => a.AgentType);
        builder.HasIndex(a => a.Acknowledged);
    }
}
```

Create `src/CostPilot.Gateway.Infrastructure/Data/Configurations/AgentInsightConfiguration.cs`:
```csharp
namespace CostPilot.Gateway.Infrastructure.Data.Configurations;

using CostPilot.Gateway.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class AgentInsightConfiguration : IEntityTypeConfiguration<AgentInsight>
{
    public void Configure(EntityTypeBuilder<AgentInsight> builder)
    {
        builder.HasKey(i => i.Id);
        builder.Property(i => i.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(i => i.SourceAgent).HasConversion<string>().HasMaxLength(20);
        builder.Property(i => i.InsightType).HasMaxLength(100).IsRequired();
        builder.Property(i => i.EntityType).HasMaxLength(100).IsRequired();
        builder.Property(i => i.EntityId).HasMaxLength(200).IsRequired();
        builder.Property(i => i.Summary).IsRequired();
        builder.Property(i => i.FinancialImpact).HasPrecision(18, 2);
        builder.Property(i => i.Confidence).HasPrecision(5, 4);
        builder.Property(i => i.RelatedData).HasColumnType("jsonb");
        builder.Property(i => i.CreatedAt).HasDefaultValueSql("now()");

        builder.HasIndex(i => i.SourceAgent);
        builder.HasIndex(i => new { i.EntityType, i.EntityId });
    }
}
```

Create `src/CostPilot.Gateway.Infrastructure/Data/Configurations/CorrelatedFindingConfiguration.cs`:
```csharp
namespace CostPilot.Gateway.Infrastructure.Data.Configurations;

using CostPilot.Gateway.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class CorrelatedFindingConfiguration : IEntityTypeConfiguration<CorrelatedFinding>
{
    public void Configure(EntityTypeBuilder<CorrelatedFinding> builder)
    {
        builder.HasKey(f => f.Id);
        builder.Property(f => f.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(f => f.Summary).IsRequired();
        builder.Property(f => f.CombinedImpact).HasPrecision(18, 2);
        builder.Property(f => f.Confidence).HasPrecision(5, 4);
        builder.Property(f => f.CreatedAt).HasDefaultValueSql("now()");
    }
}
```

Create `src/CostPilot.Gateway.Infrastructure/Data/Configurations/AuditLogConfiguration.cs`:
```csharp
namespace CostPilot.Gateway.Infrastructure.Data.Configurations;

using CostPilot.Gateway.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(a => a.EntityType).HasMaxLength(100).IsRequired();
        builder.Property(a => a.Action).HasMaxLength(100).IsRequired();
        builder.Property(a => a.Details).HasColumnType("jsonb");
        builder.Property(a => a.Timestamp).HasDefaultValueSql("now()");

        builder.HasIndex(a => new { a.EntityType, a.EntityId });
    }
}
```

- [ ] **Step 4: Verify infrastructure compiles**

```bash
cd costpilot/gateway && dotnet build src/CostPilot.Gateway.Infrastructure
```

Expected: Build succeeded.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add EF Core DbContext and entity configurations for PostgreSQL"
```

---

### Task 4: MassTransit Contracts & Gateway API Setup

**Files:**
- Create: `gateway/src/CostPilot.Contracts/*.cs`
- Create: `gateway/src/CostPilot.Gateway.Api/Program.cs`
- Create: `gateway/src/CostPilot.Gateway.Api/Services/TokenService.cs`
- Create: `gateway/src/CostPilot.Gateway.Api/Hubs/NotificationHub.cs`

- [ ] **Step 1: Add NuGet packages to Api project**

```bash
cd costpilot/gateway
dotnet add src/CostPilot.Gateway.Api package MassTransit --version 8.*
dotnet add src/CostPilot.Gateway.Api package MassTransit.RabbitMQ --version 8.*
dotnet add src/CostPilot.Gateway.Api package Npgsql.EntityFrameworkCore.PostgreSQL --version 8.0.*
dotnet add src/CostPilot.Gateway.Api package Microsoft.AspNetCore.Authentication.JwtBearer --version 8.0.*
dotnet add src/CostPilot.Gateway.Api package BCrypt.Net-Next --version 4.*
```

- [ ] **Step 2: Create MassTransit message contracts**

Create `src/CostPilot.Contracts/ProposalCreated.cs`:
```csharp
namespace CostPilot.Contracts;

public record ProposalCreated
{
    public Guid ProposalId { get; init; }
    public string AgentType { get; init; } = default!;
    public string Title { get; init; } = default!;
    public string Description { get; init; } = default!;
    public decimal EstimatedSavings { get; init; }
    public string RiskLevel { get; init; } = default!;
    public string? Evidence { get; init; }
    public DateTime CreatedAt { get; init; }
}
```

Create `src/CostPilot.Contracts/ProposalDecision.cs`:
```csharp
namespace CostPilot.Contracts;

public record ProposalDecision
{
    public Guid ProposalId { get; init; }
    public string Status { get; init; } = default!;
    public Guid? ApprovedBy { get; init; }
    public string? Comment { get; init; }
    public DateTime DecidedAt { get; init; }
}
```

Create `src/CostPilot.Contracts/ProposalExecuted.cs`:
```csharp
namespace CostPilot.Contracts;

public record ProposalExecuted
{
    public Guid ProposalId { get; init; }
    public bool Success { get; init; }
    public string? Result { get; init; }
    public decimal? ActualSavings { get; init; }
    public DateTime ExecutedAt { get; init; }
}
```

Create `src/CostPilot.Contracts/AgentAlertRaised.cs`:
```csharp
namespace CostPilot.Contracts;

public record AgentAlertRaised
{
    public Guid AlertId { get; init; }
    public string AgentType { get; init; } = default!;
    public string Severity { get; init; } = default!;
    public string Title { get; init; } = default!;
    public string Message { get; init; } = default!;
    public string? DataSnapshot { get; init; }
    public DateTime CreatedAt { get; init; }
}
```

Create `src/CostPilot.Contracts/InsightPublished.cs`:
```csharp
namespace CostPilot.Contracts;

public record InsightPublished
{
    public Guid InsightId { get; init; }
    public string SourceAgent { get; init; } = default!;
    public string InsightType { get; init; } = default!;
    public string EntityType { get; init; } = default!;
    public string EntityId { get; init; } = default!;
    public string Summary { get; init; } = default!;
    public decimal FinancialImpact { get; init; }
    public decimal Confidence { get; init; }
    public string? RelatedData { get; init; }
    public DateTime CreatedAt { get; init; }
}
```

Create `src/CostPilot.Contracts/TriggerAgentRun.cs`:
```csharp
namespace CostPilot.Contracts;

public record TriggerAgentRun
{
    public string AgentType { get; init; } = default!;
    public string? Scope { get; init; }
    public DateTime RequestedAt { get; init; }
}
```

- [ ] **Step 3: Create TokenService**

Create `src/CostPilot.Gateway.Api/Services/TokenService.cs`:
```csharp
namespace CostPilot.Gateway.Api.Services;

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

public class JwtSettings
{
    public string Secret { get; set; } = default!;
    public string Issuer { get; set; } = default!;
    public string Audience { get; set; } = default!;
    public int ExpireDays { get; set; } = 7;
}

public class TokenService(JwtSettings settings)
{
    public string GenerateToken(Guid userId, string email, string role)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(JwtRegisteredClaimNames.Email, email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.Role, role),
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: settings.Issuer,
            audience: settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(settings.ExpireDays),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

- [ ] **Step 4: Create SignalR NotificationHub**

Create `src/CostPilot.Gateway.Api/Hubs/NotificationHub.cs`:
```csharp
namespace CostPilot.Gateway.Api.Hubs;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

[Authorize]
public class NotificationHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "dashboard");
        await base.OnConnectedAsync();
    }
}
```

- [ ] **Step 5: Create Program.cs with full pipeline**

Replace `src/CostPilot.Gateway.Api/Program.cs`:
```csharp
using System.Text;
using CostPilot.Gateway.Api.Hubs;
using CostPilot.Gateway.Api.Services;
using CostPilot.Gateway.Infrastructure.Data;
using MassTransit;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// JWT Settings
var jwtSettings = builder.Configuration.GetSection("JwtSettings").Get<JwtSettings>()
    ?? new JwtSettings { Secret = "DevFallbackKeyThatIsAtLeast32BytesLong!!", Issuer = "CostPilot", Audience = "CostPilotClients" };
builder.Services.AddSingleton(jwtSettings);
builder.Services.AddScoped<TokenService>();

// Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
            ClockSkew = TimeSpan.Zero
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken) && context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                    context.Token = accessToken;
                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddAuthorization();

// Database
builder.Services.AddDbContextPool<CostPilotDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("CostPilotDb") ?? "Host=localhost;Database=costpilot;Username=costpilot;Password=costpilot_dev",
        o => o.EnableRetryOnFailure(3)));

// MassTransit + RabbitMQ
builder.Services.AddMassTransit(x =>
{
    x.AddConsumers(typeof(Program).Assembly);
    x.UsingRabbitMq((context, cfg) =>
    {
        var rabbitHost = builder.Configuration["RabbitMq:Host"] ?? "localhost";
        var rabbitUser = builder.Configuration["RabbitMq:Username"] ?? "guest";
        var rabbitPass = builder.Configuration["RabbitMq:Password"] ?? "guest";
        cfg.Host(rabbitHost, "/", h =>
        {
            h.Username(rabbitUser);
            h.Password(rabbitPass);
        });
        cfg.ConfigureEndpoints(context);
    });
});

// SignalR
builder.Services.AddSignalR();

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:4200")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

var app = builder.Build();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// SignalR hub
app.MapHub<NotificationHub>("/hubs/notifications");

// Health check
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

// Apply migrations on startup (dev only)
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<CostPilotDbContext>();
    await db.Database.MigrateAsync();
}

app.Run();

public partial class Program { }
```

- [ ] **Step 6: Verify API compiles**

```bash
cd costpilot/gateway && dotnet build src/CostPilot.Gateway.Api
```

Expected: Build succeeded.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add MassTransit contracts, JWT auth, SignalR hub, and API Program.cs"
```

---

### Task 5: API Endpoints (Auth, Proposals, Dashboard)

**Files:**
- Create: `gateway/src/CostPilot.Gateway.Api/Endpoints/AuthEndpoints.cs`
- Create: `gateway/src/CostPilot.Gateway.Api/Endpoints/ProposalEndpoints.cs`
- Create: `gateway/src/CostPilot.Gateway.Api/Endpoints/DashboardEndpoints.cs`
- Create: `gateway/src/CostPilot.Gateway.Api/Endpoints/AgentEndpoints.cs`
- Create: `gateway/src/CostPilot.Gateway.Api/Endpoints/InsightEndpoints.cs`
- Create: `gateway/src/CostPilot.Gateway.Api/Endpoints/ImpactEndpoints.cs`

- [ ] **Step 1: Create AuthEndpoints**

Create `src/CostPilot.Gateway.Api/Endpoints/AuthEndpoints.cs`:
```csharp
namespace CostPilot.Gateway.Api.Endpoints;

using CostPilot.Gateway.Api.Services;
using CostPilot.Gateway.Domain.Entities;
using CostPilot.Gateway.Domain.Enums;
using CostPilot.Gateway.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

public static class AuthEndpoints
{
    public record LoginRequest(string Email, string Password);
    public record LoginResponse(string Token, string Name, string Role);

    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/login", async (LoginRequest request, CostPilotDbContext db, TokenService tokenService) =>
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return Results.Unauthorized();

            var token = tokenService.GenerateToken(user.Id, user.Email, user.Role.ToString());
            return Results.Ok(new LoginResponse(token, user.Name, user.Role.ToString()));
        }).AllowAnonymous();

        group.MapPost("/register", async (RegisterRequest request, CostPilotDbContext db) =>
        {
            if (await db.Users.AnyAsync(u => u.Email == request.Email))
                return Results.Conflict("Email already registered");

            var user = new User
            {
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Name = request.Name,
                Role = Enum.Parse<UserRole>(request.Role, ignoreCase: true),
                CreatedAt = DateTime.UtcNow
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
            return Results.Created($"/api/auth/{user.Id}", new { user.Id, user.Email, user.Name, user.Role });
        }).AllowAnonymous();
    }

    public record RegisterRequest(string Email, string Password, string Name, string Role);
}
```

- [ ] **Step 2: Create ProposalEndpoints**

Create `src/CostPilot.Gateway.Api/Endpoints/ProposalEndpoints.cs`:
```csharp
namespace CostPilot.Gateway.Api.Endpoints;

using System.Security.Claims;
using CostPilot.Contracts;
using CostPilot.Gateway.Domain.Entities;
using CostPilot.Gateway.Domain.Enums;
using CostPilot.Gateway.Infrastructure.Data;
using MassTransit;
using Microsoft.EntityFrameworkCore;

public static class ProposalEndpoints
{
    public static void MapProposalEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/proposals").WithTags("Proposals").RequireAuthorization();

        group.MapGet("/", async (CostPilotDbContext db, string? status, string? agentType, int page = 1, int pageSize = 20) =>
        {
            var query = db.ActionProposals.AsQueryable();
            if (!string.IsNullOrEmpty(status))
                query = query.Where(p => p.Status == Enum.Parse<ProposalStatus>(status, true));
            if (!string.IsNullOrEmpty(agentType))
                query = query.Where(p => p.AgentType == Enum.Parse<AgentType>(agentType, true));

            var total = await query.CountAsync();
            var items = await query.OrderByDescending(p => p.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Results.Ok(new { total, page, pageSize, items });
        });

        group.MapGet("/{id:guid}", async (Guid id, CostPilotDbContext db) =>
        {
            var proposal = await db.ActionProposals.Include(p => p.Impacts).FirstOrDefaultAsync(p => p.Id == id);
            return proposal is null ? Results.NotFound() : Results.Ok(proposal);
        });

        group.MapPut("/{id:guid}/approve", async (Guid id, ApproveRequest request, CostPilotDbContext db,
            IPublishEndpoint publisher, ClaimsPrincipal user) =>
        {
            var proposal = await db.ActionProposals.FindAsync(id);
            if (proposal is null) return Results.NotFound();
            if (proposal.Status != ProposalStatus.Pending) return Results.BadRequest("Proposal is not pending");

            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            proposal.Status = ProposalStatus.Approved;
            proposal.ApprovedBy = userId;
            proposal.ApprovedAt = DateTime.UtcNow;

            db.AuditLogs.Add(new AuditLog
            {
                EntityType = "ActionProposal", EntityId = id, Action = "Approved",
                UserId = userId, Timestamp = DateTime.UtcNow, Details = request.Comment
            });

            await db.SaveChangesAsync();
            await publisher.Publish(new ProposalDecision
            {
                ProposalId = id, Status = "Approved", ApprovedBy = userId,
                Comment = request.Comment, DecidedAt = DateTime.UtcNow
            });

            return Results.Ok(proposal);
        }).RequireAuthorization(p => p.RequireRole("Admin", "Approver"));

        group.MapPut("/{id:guid}/reject", async (Guid id, RejectRequest request, CostPilotDbContext db,
            ClaimsPrincipal user) =>
        {
            var proposal = await db.ActionProposals.FindAsync(id);
            if (proposal is null) return Results.NotFound();
            if (proposal.Status != ProposalStatus.Pending) return Results.BadRequest("Proposal is not pending");

            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            proposal.Status = ProposalStatus.Rejected;
            proposal.ApprovedBy = userId;
            proposal.ApprovedAt = DateTime.UtcNow;

            db.AuditLogs.Add(new AuditLog
            {
                EntityType = "ActionProposal", EntityId = id, Action = "Rejected",
                UserId = userId, Timestamp = DateTime.UtcNow, Details = request.Reason
            });

            await db.SaveChangesAsync();
            return Results.Ok(proposal);
        }).RequireAuthorization(p => p.RequireRole("Admin", "Approver"));
    }

    public record ApproveRequest(string? Comment);
    public record RejectRequest(string Reason);
}
```

- [ ] **Step 3: Create DashboardEndpoints**

Create `src/CostPilot.Gateway.Api/Endpoints/DashboardEndpoints.cs`:
```csharp
namespace CostPilot.Gateway.Api.Endpoints;

using CostPilot.Gateway.Domain.Enums;
using CostPilot.Gateway.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

public static class DashboardEndpoints
{
    public static void MapDashboardEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/dashboard").WithTags("Dashboard").RequireAuthorization();

        group.MapGet("/summary", async (CostPilotDbContext db) =>
        {
            var totalIdentified = await db.ActionProposals.SumAsync(p => p.EstimatedSavings);
            var totalRealized = await db.CostImpacts.SumAsync(i => i.ActualSavings);
            var pendingCount = await db.ActionProposals.CountAsync(p => p.Status == ProposalStatus.Pending);
            var executedCount = await db.ActionProposals.CountAsync(p => p.Status == ProposalStatus.Executed);

            var topFindings = await db.ActionProposals
                .OrderByDescending(p => p.EstimatedSavings)
                .Take(10)
                .Select(p => new { p.Id, p.Title, p.AgentType, p.EstimatedSavings, p.RiskLevel, p.Status })
                .ToListAsync();

            var savingsByAgent = await db.ActionProposals
                .GroupBy(p => p.AgentType)
                .Select(g => new { AgentType = g.Key, TotalSavings = g.Sum(p => p.EstimatedSavings), Count = g.Count() })
                .ToListAsync();

            var recentAlerts = await db.AgentAlerts
                .Where(a => !a.Acknowledged)
                .OrderByDescending(a => a.CreatedAt)
                .Take(5)
                .ToListAsync();

            return Results.Ok(new
            {
                totalSavingsIdentified = totalIdentified,
                totalSavingsRealized = totalRealized,
                pendingProposals = pendingCount,
                executedProposals = executedCount,
                topFindings,
                savingsByAgent,
                recentAlerts
            });
        });

        group.MapGet("/savings-trend", async (CostPilotDbContext db, int months = 12) =>
        {
            var since = DateTime.UtcNow.AddMonths(-months);
            var trend = await db.ActionProposals
                .Where(p => p.CreatedAt >= since)
                .GroupBy(p => new { p.CreatedAt.Year, p.CreatedAt.Month })
                .Select(g => new
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    Identified = g.Sum(p => p.EstimatedSavings),
                    Count = g.Count()
                })
                .OrderBy(g => g.Year).ThenBy(g => g.Month)
                .ToListAsync();

            return Results.Ok(trend);
        });
    }
}
```

- [ ] **Step 4: Create AgentEndpoints**

Create `src/CostPilot.Gateway.Api/Endpoints/AgentEndpoints.cs`:
```csharp
namespace CostPilot.Gateway.Api.Endpoints;

using CostPilot.Contracts;
using CostPilot.Gateway.Domain.Enums;
using CostPilot.Gateway.Infrastructure.Data;
using MassTransit;
using Microsoft.EntityFrameworkCore;

public static class AgentEndpoints
{
    public static void MapAgentEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/agents").WithTags("Agents").RequireAuthorization();

        group.MapGet("/{type}/status", async (string type, CostPilotDbContext db) =>
        {
            var agentType = Enum.Parse<AgentType>(type, true);
            var lastAlert = await db.AgentAlerts
                .Where(a => a.AgentType == agentType)
                .OrderByDescending(a => a.CreatedAt)
                .FirstOrDefaultAsync();

            var proposalCount = await db.ActionProposals.CountAsync(p => p.AgentType == agentType);
            var insightCount = await db.AgentInsights.CountAsync(i => i.SourceAgent == agentType);

            return Results.Ok(new
            {
                agentType = type,
                proposalCount,
                insightCount,
                lastActivity = lastAlert?.CreatedAt,
                status = "healthy"
            });
        });

        group.MapPost("/{type}/trigger", async (string type, IPublishEndpoint publisher) =>
        {
            await publisher.Publish(new TriggerAgentRun
            {
                AgentType = type,
                RequestedAt = DateTime.UtcNow
            });
            return Results.Accepted(value: new { message = $"Agent {type} run triggered" });
        }).RequireAuthorization(p => p.RequireRole("Admin"));

        group.MapGet("/{type}/alerts", async (string type, CostPilotDbContext db) =>
        {
            var agentType = Enum.Parse<AgentType>(type, true);
            var alerts = await db.AgentAlerts
                .Where(a => a.AgentType == agentType)
                .OrderByDescending(a => a.CreatedAt)
                .Take(50)
                .ToListAsync();
            return Results.Ok(alerts);
        });
    }
}
```

- [ ] **Step 5: Create InsightEndpoints**

Create `src/CostPilot.Gateway.Api/Endpoints/InsightEndpoints.cs`:
```csharp
namespace CostPilot.Gateway.Api.Endpoints;

using CostPilot.Gateway.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

public static class InsightEndpoints
{
    public static void MapInsightEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/insights").WithTags("Insights").RequireAuthorization();

        group.MapGet("/", async (CostPilotDbContext db) =>
        {
            var insights = await db.AgentInsights
                .OrderByDescending(i => i.CreatedAt)
                .Take(100)
                .ToListAsync();
            return Results.Ok(insights);
        });

        group.MapGet("/correlated", async (CostPilotDbContext db) =>
        {
            var findings = await db.CorrelatedFindings
                .OrderByDescending(f => f.CombinedImpact)
                .Take(50)
                .ToListAsync();
            return Results.Ok(findings);
        });
    }
}
```

- [ ] **Step 6: Create ImpactEndpoints**

Create `src/CostPilot.Gateway.Api/Endpoints/ImpactEndpoints.cs`:
```csharp
namespace CostPilot.Gateway.Api.Endpoints;

using CostPilot.Gateway.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

public static class ImpactEndpoints
{
    public static void MapImpactEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/impacts").WithTags("Impacts").RequireAuthorization();

        group.MapGet("/", async (CostPilotDbContext db) =>
        {
            var impacts = await db.CostImpacts
                .Include(i => i.Proposal)
                .OrderByDescending(i => i.RecordedAt)
                .Take(100)
                .ToListAsync();
            return Results.Ok(impacts);
        });

        group.MapGet("/summary", async (CostPilotDbContext db) =>
        {
            var totalRealized = await db.CostImpacts.SumAsync(i => i.ActualSavings);
            var byMonth = await db.CostImpacts
                .GroupBy(i => new { i.RecordedAt.Year, i.RecordedAt.Month })
                .Select(g => new { Year = g.Key.Year, Month = g.Key.Month, Total = g.Sum(i => i.ActualSavings) })
                .OrderBy(g => g.Year).ThenBy(g => g.Month)
                .ToListAsync();

            return Results.Ok(new { totalRealized, byMonth });
        });
    }
}
```

- [ ] **Step 7: Register all endpoints in Program.cs**

Add before `app.Run();` in `src/CostPilot.Gateway.Api/Program.cs`:
```csharp
// Map endpoints
app.MapAuthEndpoints();
app.MapProposalEndpoints();
app.MapDashboardEndpoints();
app.MapAgentEndpoints();
app.MapInsightEndpoints();
app.MapImpactEndpoints();
```

Add using at top:
```csharp
using CostPilot.Gateway.Api.Endpoints;
```

- [ ] **Step 8: Verify everything compiles**

```bash
cd costpilot/gateway && dotnet build
```

Expected: Build succeeded.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: add all API endpoints - auth, proposals, dashboard, agents, insights, impacts"
```

---

### Task 6: MassTransit Consumers & Correlation Engine

**Files:**
- Create: `gateway/src/CostPilot.Gateway.Api/Consumers/ProposalCreatedConsumer.cs`
- Create: `gateway/src/CostPilot.Gateway.Api/Consumers/AgentAlertConsumer.cs`
- Create: `gateway/src/CostPilot.Gateway.Api/Consumers/InsightPublishedConsumer.cs`
- Create: `gateway/src/CostPilot.Gateway.Api/Consumers/ProposalExecutedConsumer.cs`
- Create: `gateway/src/CostPilot.Gateway.Api/Services/CorrelationEngine.cs`

- [ ] **Step 1: Create ProposalCreatedConsumer**

Create `src/CostPilot.Gateway.Api/Consumers/ProposalCreatedConsumer.cs`:
```csharp
namespace CostPilot.Gateway.Api.Consumers;

using CostPilot.Contracts;
using CostPilot.Gateway.Api.Hubs;
using CostPilot.Gateway.Domain.Entities;
using CostPilot.Gateway.Domain.Enums;
using CostPilot.Gateway.Infrastructure.Data;
using MassTransit;
using Microsoft.AspNetCore.SignalR;

public class ProposalCreatedConsumer(
    CostPilotDbContext db,
    IHubContext<NotificationHub> hub,
    ILogger<ProposalCreatedConsumer> logger) : IConsumer<ProposalCreated>
{
    public async Task Consume(ConsumeContext<ProposalCreated> context)
    {
        var msg = context.Message;
        logger.LogInformation("Received proposal from {Agent}: {Title}", msg.AgentType, msg.Title);

        var proposal = new ActionProposal
        {
            Id = msg.ProposalId,
            AgentType = Enum.Parse<AgentType>(msg.AgentType, true),
            Title = msg.Title,
            Description = msg.Description,
            EstimatedSavings = msg.EstimatedSavings,
            RiskLevel = Enum.Parse<RiskLevel>(msg.RiskLevel, true),
            Status = ProposalStatus.Pending,
            Evidence = msg.Evidence,
            CreatedAt = msg.CreatedAt
        };

        db.ActionProposals.Add(proposal);
        await db.SaveChangesAsync();

        await hub.Clients.Group("dashboard").SendAsync("NewProposal", new
        {
            proposal.Id, proposal.Title, proposal.AgentType,
            proposal.EstimatedSavings, proposal.RiskLevel
        });
    }
}
```

- [ ] **Step 2: Create AgentAlertConsumer**

Create `src/CostPilot.Gateway.Api/Consumers/AgentAlertConsumer.cs`:
```csharp
namespace CostPilot.Gateway.Api.Consumers;

using CostPilot.Contracts;
using CostPilot.Gateway.Api.Hubs;
using CostPilot.Gateway.Domain.Entities;
using CostPilot.Gateway.Domain.Enums;
using CostPilot.Gateway.Infrastructure.Data;
using MassTransit;
using Microsoft.AspNetCore.SignalR;

public class AgentAlertConsumer(
    CostPilotDbContext db,
    IHubContext<NotificationHub> hub,
    ILogger<AgentAlertConsumer> logger) : IConsumer<AgentAlertRaised>
{
    public async Task Consume(ConsumeContext<AgentAlertRaised> context)
    {
        var msg = context.Message;
        logger.LogInformation("Alert from {Agent}: {Title}", msg.AgentType, msg.Title);

        var alert = new AgentAlert
        {
            Id = msg.AlertId,
            AgentType = Enum.Parse<AgentType>(msg.AgentType, true),
            Severity = Enum.Parse<Severity>(msg.Severity, true),
            Title = msg.Title,
            Message = msg.Message,
            DataSnapshot = msg.DataSnapshot,
            CreatedAt = msg.CreatedAt
        };

        db.AgentAlerts.Add(alert);
        await db.SaveChangesAsync();

        await hub.Clients.Group("dashboard").SendAsync("NewAlert", new
        {
            alert.Id, alert.Title, alert.AgentType, alert.Severity
        });
    }
}
```

- [ ] **Step 3: Create InsightPublishedConsumer**

Create `src/CostPilot.Gateway.Api/Consumers/InsightPublishedConsumer.cs`:
```csharp
namespace CostPilot.Gateway.Api.Consumers;

using CostPilot.Contracts;
using CostPilot.Gateway.Api.Hubs;
using CostPilot.Gateway.Api.Services;
using CostPilot.Gateway.Domain.Entities;
using CostPilot.Gateway.Domain.Enums;
using CostPilot.Gateway.Infrastructure.Data;
using MassTransit;
using Microsoft.AspNetCore.SignalR;

public class InsightPublishedConsumer(
    CostPilotDbContext db,
    IHubContext<NotificationHub> hub,
    CorrelationEngine correlationEngine,
    ILogger<InsightPublishedConsumer> logger) : IConsumer<InsightPublished>
{
    public async Task Consume(ConsumeContext<InsightPublished> context)
    {
        var msg = context.Message;
        logger.LogInformation("Insight from {Agent}: {Summary}", msg.SourceAgent, msg.Summary);

        var insight = new AgentInsight
        {
            Id = msg.InsightId,
            SourceAgent = Enum.Parse<AgentType>(msg.SourceAgent, true),
            InsightType = msg.InsightType,
            EntityType = msg.EntityType,
            EntityId = msg.EntityId,
            Summary = msg.Summary,
            FinancialImpact = msg.FinancialImpact,
            Confidence = msg.Confidence,
            RelatedData = msg.RelatedData,
            CreatedAt = msg.CreatedAt
        };

        db.AgentInsights.Add(insight);
        await db.SaveChangesAsync();

        var correlated = await correlationEngine.TryCorrelateAsync(insight);
        if (correlated is not null)
        {
            await hub.Clients.Group("dashboard").SendAsync("CorrelatedFinding", new
            {
                correlated.Id, correlated.Summary, correlated.CombinedImpact, correlated.AgentsInvolved
            });
        }
    }
}
```

- [ ] **Step 4: Create ProposalExecutedConsumer**

Create `src/CostPilot.Gateway.Api/Consumers/ProposalExecutedConsumer.cs`:
```csharp
namespace CostPilot.Gateway.Api.Consumers;

using CostPilot.Contracts;
using CostPilot.Gateway.Api.Hubs;
using CostPilot.Gateway.Domain.Entities;
using CostPilot.Gateway.Domain.Enums;
using CostPilot.Gateway.Infrastructure.Data;
using MassTransit;
using Microsoft.AspNetCore.SignalR;

public class ProposalExecutedConsumer(
    CostPilotDbContext db,
    IHubContext<NotificationHub> hub,
    ILogger<ProposalExecutedConsumer> logger) : IConsumer<ProposalExecuted>
{
    public async Task Consume(ConsumeContext<ProposalExecuted> context)
    {
        var msg = context.Message;
        var proposal = await db.ActionProposals.FindAsync(msg.ProposalId);
        if (proposal is null) return;

        proposal.Status = msg.Success ? ProposalStatus.Executed : ProposalStatus.Failed;
        proposal.ExecutedAt = msg.ExecutedAt;
        proposal.ExecutionResult = msg.Result;

        if (msg.Success && msg.ActualSavings.HasValue)
        {
            db.CostImpacts.Add(new CostImpact
            {
                ProposalId = msg.ProposalId,
                ActualSavings = msg.ActualSavings.Value,
                MeasurementPeriodStart = DateOnly.FromDateTime(DateTime.UtcNow),
                MeasurementPeriodEnd = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(1)),
                RecordedAt = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync();
        await hub.Clients.Group("dashboard").SendAsync("ProposalExecuted", new
        {
            msg.ProposalId, msg.Success, msg.ActualSavings
        });
    }
}
```

- [ ] **Step 5: Create CorrelationEngine**

Create `src/CostPilot.Gateway.Api/Services/CorrelationEngine.cs`:
```csharp
namespace CostPilot.Gateway.Api.Services;

using CostPilot.Gateway.Domain.Entities;
using CostPilot.Gateway.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

public class CorrelationEngine(CostPilotDbContext db, ILogger<CorrelationEngine> logger)
{
    private static readonly TimeSpan CorrelationWindow = TimeSpan.FromHours(1);

    public async Task<CorrelatedFinding?> TryCorrelateAsync(AgentInsight newInsight)
    {
        var windowStart = newInsight.CreatedAt - CorrelationWindow;

        // Find insights about the same entity from different agents within the time window
        var relatedInsights = await db.AgentInsights
            .Where(i => i.Id != newInsight.Id)
            .Where(i => i.SourceAgent != newInsight.SourceAgent)
            .Where(i => i.CreatedAt >= windowStart)
            .Where(i =>
                (i.EntityId == newInsight.EntityId && i.EntityType == newInsight.EntityType) ||
                (i.EntityType == newInsight.EntityType && i.InsightType != newInsight.InsightType))
            .ToListAsync();

        if (relatedInsights.Count == 0)
            return null;

        var allInsights = relatedInsights.Append(newInsight).ToList();
        var agents = allInsights.Select(i => i.SourceAgent.ToString()).Distinct().ToList();
        var combinedImpact = allInsights.Sum(i => i.FinancialImpact);
        var maxConfidence = allInsights.Max(i => i.Confidence);
        var confidence = Math.Min(0.99m, maxConfidence + 0.05m * (allInsights.Count - 1));

        var summaries = allInsights.Select(i => $"[{i.SourceAgent}] {i.Summary}");
        var summary = $"Cross-agent finding: {string.Join(" + ", summaries)}";

        var finding = new CorrelatedFinding
        {
            InsightIds = allInsights.Select(i => i.Id).ToList(),
            AgentsInvolved = agents,
            Summary = summary,
            CombinedImpact = combinedImpact,
            Confidence = confidence,
            CreatedAt = DateTime.UtcNow
        };

        db.CorrelatedFindings.Add(finding);
        await db.SaveChangesAsync();

        logger.LogInformation("Correlated finding created: {Summary} (${Impact})", summary, combinedImpact);
        return finding;
    }
}
```

- [ ] **Step 6: Register CorrelationEngine in Program.cs**

Add to `Program.cs` after services setup:
```csharp
builder.Services.AddScoped<CorrelationEngine>();
```

Add using:
```csharp
using CostPilot.Gateway.Api.Services;
```

- [ ] **Step 7: Create Dockerfile**

Create `src/CostPilot.Gateway.Api/Dockerfile`:
```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore "src/CostPilot.Gateway.Api/CostPilot.Gateway.Api.csproj"
RUN dotnet publish "src/CostPilot.Gateway.Api/CostPilot.Gateway.Api.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "CostPilot.Gateway.Api.dll"]
```

- [ ] **Step 8: Create DB seed service**

Create `src/CostPilot.Gateway.Infrastructure/Seed/DbSeeder.cs`:
```csharp
namespace CostPilot.Gateway.Infrastructure.Seed;

using CostPilot.Gateway.Domain.Entities;
using CostPilot.Gateway.Domain.Enums;
using CostPilot.Gateway.Infrastructure.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(CostPilotDbContext db)
    {
        if (db.Users.Any()) return;

        db.Users.AddRange(
            new User
            {
                Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                Email = "admin@costpilot.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                Name = "Admin User",
                Role = UserRole.Admin,
                CreatedAt = DateTime.UtcNow
            },
            new User
            {
                Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                Email = "approver@costpilot.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("approver123"),
                Name = "Finance Approver",
                Role = UserRole.Approver,
                CreatedAt = DateTime.UtcNow
            },
            new User
            {
                Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                Email = "viewer@costpilot.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("viewer123"),
                Name = "Dashboard Viewer",
                Role = UserRole.Viewer,
                CreatedAt = DateTime.UtcNow
            }
        );

        await db.SaveChangesAsync();
    }
}
```

Add BCrypt package to Infrastructure:
```bash
dotnet add src/CostPilot.Gateway.Infrastructure package BCrypt.Net-Next --version 4.*
```

Update Program.cs seed section:
```csharp
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<CostPilotDbContext>();
    await db.Database.MigrateAsync();
    await CostPilot.Gateway.Infrastructure.Seed.DbSeeder.SeedAsync(db);
}
```

- [ ] **Step 9: Create initial migration**

```bash
cd costpilot/gateway
dotnet ef migrations add InitialCreate --project src/CostPilot.Gateway.Infrastructure --startup-project src/CostPilot.Gateway.Api
```

- [ ] **Step 10: Verify full gateway builds**

```bash
cd costpilot/gateway && dotnet build
```

Expected: Build succeeded.

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "feat: add MassTransit consumers, correlation engine, DB seeder, and Dockerfile"
```

---

## Phase 3: Python Agents — Common Library & Spend Agent

### Task 7: Python Common Library

**Files:**
- Create: `agents/common/pyproject.toml`
- Create: `agents/common/costpilot_common/*.py`

- [ ] **Step 1: Create common package**

Create `agents/common/pyproject.toml`:
```toml
[project]
name = "costpilot-common"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "pydantic>=2.0",
    "sqlalchemy>=2.0",
    "psycopg2-binary>=2.9",
    "pika>=1.3",
    "crewai[anthropic]>=1.12",
    "fastapi>=0.110",
    "uvicorn>=0.27",
]

[build-system]
requires = ["setuptools"]
build-backend = "setuptools.backends._legacy:_Backend"
```

- [ ] **Step 2: Create config module**

Create `agents/common/costpilot_common/__init__.py`:
```python
```

Create `agents/common/costpilot_common/config.py`:
```python
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://costpilot:costpilot_dev@localhost:5432/costpilot")
RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "amqp://costpilot:costpilot_dev@localhost:5672/")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
AGENT_TYPE = os.environ.get("AGENT_TYPE", "unknown")
```

- [ ] **Step 3: Create database module**

Create `agents/common/costpilot_common/database.py`:
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from costpilot_common.config import DATABASE_URL

engine = create_engine(DATABASE_URL, pool_size=5, max_overflow=10)
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 4: Create Pydantic schemas**

Create `agents/common/costpilot_common/schemas.py`:
```python
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field
from uuid import UUID, uuid4


class InsightSchema(BaseModel):
    insight_id: UUID = Field(default_factory=uuid4)
    source_agent: str
    insight_type: str
    entity_type: str
    entity_id: str
    summary: str
    financial_impact: Decimal
    confidence: Decimal
    related_data: dict | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ProposalSchema(BaseModel):
    proposal_id: UUID = Field(default_factory=uuid4)
    agent_type: str
    title: str
    description: str
    estimated_savings: Decimal
    risk_level: str = "Medium"
    evidence: dict | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AlertSchema(BaseModel):
    alert_id: UUID = Field(default_factory=uuid4)
    agent_type: str
    severity: str = "Info"
    title: str
    message: str
    data_snapshot: dict | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

- [ ] **Step 5: Create messaging module**

Create `agents/common/costpilot_common/messaging.py`:
```python
import json
import logging
import pika
from decimal import Decimal
from datetime import datetime
from uuid import UUID
from costpilot_common.config import RABBITMQ_URL
from costpilot_common.schemas import InsightSchema, ProposalSchema, AlertSchema

logger = logging.getLogger(__name__)


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        if isinstance(o, UUID):
            return str(o)
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)


def _get_connection():
    params = pika.URLParameters(RABBITMQ_URL)
    return pika.BlockingConnection(params)


def publish_insight(insight: InsightSchema):
    """Publish an insight to the MassTransit-compatible exchange."""
    conn = _get_connection()
    channel = conn.channel()
    exchange = "CostPilot.Contracts:InsightPublished"
    channel.exchange_declare(exchange=exchange, exchange_type="fanout", durable=True)

    body = {
        "insightId": str(insight.insight_id),
        "sourceAgent": insight.source_agent,
        "insightType": insight.insight_type,
        "entityType": insight.entity_type,
        "entityId": insight.entity_id,
        "summary": insight.summary,
        "financialImpact": float(insight.financial_impact),
        "confidence": float(insight.confidence),
        "relatedData": json.dumps(insight.related_data) if insight.related_data else None,
        "createdAt": insight.created_at.isoformat(),
    }

    channel.basic_publish(
        exchange=exchange,
        routing_key="",
        body=json.dumps(body, cls=DecimalEncoder),
        properties=pika.BasicProperties(
            content_type="application/json",
            delivery_mode=2,
            headers={"MT-MessageType": "urn:message:CostPilot.Contracts:InsightPublished"},
        ),
    )
    conn.close()
    logger.info("Published insight: %s", insight.summary)


def publish_proposal(proposal: ProposalSchema):
    """Publish a proposal to the MassTransit-compatible exchange."""
    conn = _get_connection()
    channel = conn.channel()
    exchange = "CostPilot.Contracts:ProposalCreated"
    channel.exchange_declare(exchange=exchange, exchange_type="fanout", durable=True)

    body = {
        "proposalId": str(proposal.proposal_id),
        "agentType": proposal.agent_type,
        "title": proposal.title,
        "description": proposal.description,
        "estimatedSavings": float(proposal.estimated_savings),
        "riskLevel": proposal.risk_level,
        "evidence": json.dumps(proposal.evidence) if proposal.evidence else None,
        "createdAt": proposal.created_at.isoformat(),
    }

    channel.basic_publish(
        exchange=exchange,
        routing_key="",
        body=json.dumps(body, cls=DecimalEncoder),
        properties=pika.BasicProperties(
            content_type="application/json",
            delivery_mode=2,
            headers={"MT-MessageType": "urn:message:CostPilot.Contracts:ProposalCreated"},
        ),
    )
    conn.close()
    logger.info("Published proposal: %s", proposal.title)


def publish_alert(alert: AlertSchema):
    """Publish an alert to the MassTransit-compatible exchange."""
    conn = _get_connection()
    channel = conn.channel()
    exchange = "CostPilot.Contracts:AgentAlertRaised"
    channel.exchange_declare(exchange=exchange, exchange_type="fanout", durable=True)

    body = {
        "alertId": str(alert.alert_id),
        "agentType": alert.agent_type,
        "severity": alert.severity,
        "title": alert.title,
        "message": alert.message,
        "dataSnapshot": json.dumps(alert.data_snapshot) if alert.data_snapshot else None,
        "createdAt": alert.created_at.isoformat(),
    }

    channel.basic_publish(
        exchange=exchange,
        routing_key="",
        body=json.dumps(body, cls=DecimalEncoder),
        properties=pika.BasicProperties(
            content_type="application/json",
            delivery_mode=2,
            headers={"MT-MessageType": "urn:message:CostPilot.Contracts:AgentAlertRaised"},
        ),
    )
    conn.close()
    logger.info("Published alert: %s", alert.title)
```

- [ ] **Step 6: Create LLM config module**

Create `agents/common/costpilot_common/llm.py`:
```python
from crewai import LLM
from costpilot_common.config import ANTHROPIC_API_KEY

def get_llm() -> LLM:
    return LLM(
        model="claude-sonnet-4-5-20250514",
        api_key=ANTHROPIC_API_KEY,
        temperature=0.3,
        max_tokens=4096,
    )
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add Python common library with messaging, schemas, DB, and LLM config"
```

---

### Task 8: Spend Intelligence Agent

**Files:**
- Create: `agents/spend-agent/` (all files)

- [ ] **Step 1: Create pyproject.toml**

Create `agents/spend-agent/pyproject.toml`:
```toml
[project]
name = "spend-agent"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "costpilot-common @ file:///${PROJECT_ROOT}/../common",
    "crewai[anthropic]>=1.12",
    "fastapi>=0.110",
    "uvicorn>=0.27",
    "sqlalchemy>=2.0",
    "psycopg2-binary>=2.9",
    "pika>=1.3",
]
```

- [ ] **Step 2: Create CrewAI agent configs**

Create `agents/spend-agent/src/spend_agent/__init__.py`:
```python
```

Create `agents/spend-agent/src/spend_agent/config/agents.yaml`:
```yaml
anomaly_detector:
  role: >
    Procurement Anomaly Detector
  goal: >
    Scan purchase orders and vendor invoices to identify unusual patterns
    including price spikes, volume anomalies, and seasonal deviations.
  backstory: >
    You are a forensic financial analyst with 15 years of experience detecting
    procurement fraud and waste. You excel at spotting patterns that humans miss.

duplicate_finder:
  role: >
    Duplicate Cost Investigator
  goal: >
    Identify duplicate invoices, overlapping vendor contracts, and redundant
    subscriptions that waste company money.
  backstory: >
    You are a meticulous auditor who has saved companies millions by finding
    duplicate charges. You never let a duplicate slip through.

rate_optimizer:
  role: >
    Vendor Rate Optimizer
  goal: >
    Compare vendor rates against market benchmarks and identify renegotiation
    opportunities that could save significant money.
  backstory: >
    You are a strategic procurement advisor who knows market rates across
    industries. You identify overpriced contracts with precision.
```

Create `agents/spend-agent/src/spend_agent/config/tasks.yaml`:
```yaml
detect_anomalies:
  description: >
    Analyze the latest procurement data to find anomalies:
    1. Query purchase orders from the database
    2. Identify price spikes (>15% above average for same item)
    3. Find volume anomalies (orders 2x above normal)
    4. Detect seasonal deviations
    Report each anomaly with estimated financial impact.
  expected_output: >
    A JSON list of anomalies, each with: vendor_id, description,
    financial_impact (dollars), confidence (0-1), and evidence.
  agent: anomaly_detector

find_duplicates:
  description: >
    Search for duplicate costs in the procurement data:
    1. Query recent invoices and purchase orders
    2. Find duplicate invoice numbers or amounts from same vendor
    3. Identify overlapping contracts for similar services
    4. Flag redundant subscriptions across teams
    Report each duplicate with the amount being wasted.
  expected_output: >
    A JSON list of duplicates, each with: type (invoice/contract/subscription),
    vendor_id, amount, description, and confidence (0-1).
  agent: duplicate_finder

optimize_rates:
  description: >
    Compare current vendor rates against market benchmarks:
    1. Query current vendor contracts and their rates
    2. Compare against market benchmark data
    3. Calculate potential savings from renegotiation
    4. Prioritize by savings opportunity
    Report each opportunity with estimated annual savings.
  expected_output: >
    A JSON list of opportunities, each with: vendor_id, current_rate,
    market_rate, annual_savings, and renegotiation_priority (high/medium/low).
  agent: rate_optimizer
```

- [ ] **Step 3: Create custom tools for database queries**

Create `agents/spend-agent/src/spend_agent/tools/__init__.py`:
```python
```

Create `agents/spend-agent/src/spend_agent/tools/anomaly_detector.py`:
```python
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
```

Create `agents/spend-agent/src/spend_agent/tools/duplicate_finder.py`:
```python
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
```

Create `agents/spend-agent/src/spend_agent/tools/rate_optimizer.py`:
```python
from crewai.tools import tool
from sqlalchemy import text
from costpilot_common.database import SessionLocal


@tool("Compare Vendor Rates")
def compare_vendor_rates() -> str:
    """Compare current vendor contract rates against market benchmarks."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT vc.id as contract_id, v.name as vendor_name,
                   vc.service_category, vc.annual_cost,
                   mb.benchmark_rate, mb.market_average,
                   ROUND(((vc.annual_cost - mb.market_average) / mb.market_average * 100)::numeric, 1) as pct_above_market,
                   (vc.annual_cost - mb.market_average) as potential_savings
            FROM vendor_contracts vc
            JOIN vendors v ON v.id = vc.vendor_id
            JOIN market_benchmarks mb ON mb.service_category = vc.service_category
            WHERE vc.annual_cost > mb.market_average
            ORDER BY (vc.annual_cost - mb.market_average) DESC
            LIMIT 50
        """))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()
```

- [ ] **Step 4: Create CrewAI crew**

Create `agents/spend-agent/src/spend_agent/crew.py`:
```python
from crewai import Agent, Task, Crew, Process
from costpilot_common.llm import get_llm
from spend_agent.tools.anomaly_detector import query_purchase_orders, get_price_statistics
from spend_agent.tools.duplicate_finder import find_duplicate_invoices, find_overlapping_contracts
from spend_agent.tools.rate_optimizer import compare_vendor_rates


def create_spend_crew() -> Crew:
    llm = get_llm()

    anomaly_detector = Agent(
        role="Procurement Anomaly Detector",
        goal="Scan purchase orders and vendor invoices to identify unusual patterns including price spikes, volume anomalies, and seasonal deviations.",
        backstory="You are a forensic financial analyst with 15 years of experience detecting procurement fraud and waste.",
        tools=[query_purchase_orders, get_price_statistics],
        llm=llm,
        verbose=True,
    )

    duplicate_finder = Agent(
        role="Duplicate Cost Investigator",
        goal="Identify duplicate invoices, overlapping vendor contracts, and redundant subscriptions.",
        backstory="You are a meticulous auditor who has saved companies millions by finding duplicate charges.",
        tools=[find_duplicate_invoices, find_overlapping_contracts],
        llm=llm,
        verbose=True,
    )

    rate_optimizer = Agent(
        role="Vendor Rate Optimizer",
        goal="Compare vendor rates against market benchmarks and identify renegotiation opportunities.",
        backstory="You are a strategic procurement advisor who knows market rates across industries.",
        tools=[compare_vendor_rates],
        llm=llm,
        verbose=True,
    )

    detect_anomalies = Task(
        description="Analyze procurement data for anomalies. Query purchase orders, find price spikes (>15% above avg), volume anomalies (2x normal), and seasonal deviations. Report each with financial impact.",
        expected_output="JSON list of anomalies with vendor_id, description, financial_impact, confidence, evidence.",
        agent=anomaly_detector,
    )

    find_duplicates = Task(
        description="Search for duplicate invoices, overlapping contracts, and redundant subscriptions. Report each with wasted amount.",
        expected_output="JSON list of duplicates with type, vendor_id, amount, description, confidence.",
        agent=duplicate_finder,
    )

    optimize_rates = Task(
        description="Compare vendor rates against benchmarks. Calculate potential savings from renegotiation. Prioritize by savings opportunity.",
        expected_output="JSON list of opportunities with vendor_id, current_rate, market_rate, annual_savings, priority.",
        agent=rate_optimizer,
    )

    return Crew(
        agents=[anomaly_detector, duplicate_finder, rate_optimizer],
        tasks=[detect_anomalies, find_duplicates, optimize_rates],
        process=Process.sequential,
        verbose=True,
    )
```

- [ ] **Step 5: Create FastAPI main**

Create `agents/spend-agent/src/spend_agent/main.py`:
```python
import asyncio
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from decimal import Decimal

from fastapi import FastAPI
from costpilot_common.config import AGENT_TYPE
from costpilot_common.messaging import publish_proposal, publish_insight, publish_alert
from costpilot_common.schemas import ProposalSchema, InsightSchema, AlertSchema
from spend_agent.crew import create_spend_crew

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Spend Intelligence Agent starting...")
    yield
    logger.info("Spend Intelligence Agent shutting down...")


app = FastAPI(title="Spend Intelligence Agent", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "healthy", "agent": "spend", "timestamp": datetime.utcnow().isoformat()}


@app.post("/run")
async def run_analysis():
    """Trigger a full spend analysis run."""
    logger.info("Starting spend analysis...")

    try:
        crew = create_spend_crew()
        result = crew.kickoff()

        # Parse results and publish findings
        try:
            findings = json.loads(result.raw) if isinstance(result.raw, str) else result.raw
        except (json.JSONDecodeError, TypeError):
            findings = [{"description": result.raw, "financial_impact": 0}]

        for finding in findings if isinstance(findings, list) else [findings]:
            impact = Decimal(str(finding.get("financial_impact", 0)))
            if impact > 0:
                publish_proposal(ProposalSchema(
                    agent_type="Spend",
                    title=f"Spend optimization: {finding.get('description', 'Cost saving opportunity')[:100]}",
                    description=json.dumps(finding),
                    estimated_savings=impact,
                    risk_level="Medium" if impact < 50000 else "High",
                    evidence=finding,
                ))

            publish_insight(InsightSchema(
                source_agent="Spend",
                insight_type=finding.get("type", "cost_anomaly"),
                entity_type="vendor",
                entity_id=str(finding.get("vendor_id", "unknown")),
                summary=finding.get("description", str(finding))[:500],
                financial_impact=impact,
                confidence=Decimal(str(finding.get("confidence", 0.7))),
                related_data=finding,
            ))

        publish_alert(AlertSchema(
            agent_type="Spend",
            severity="Info",
            title="Spend analysis completed",
            message=f"Found {len(findings) if isinstance(findings, list) else 1} findings",
        ))

        return {"status": "completed", "findings_count": len(findings) if isinstance(findings, list) else 1}

    except Exception as e:
        logger.error("Spend analysis failed: %s", e)
        publish_alert(AlertSchema(
            agent_type="Spend", severity="Critical",
            title="Spend analysis failed", message=str(e),
        ))
        return {"status": "failed", "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

- [ ] **Step 6: Create Dockerfile**

Create `agents/spend-agent/Dockerfile`:
```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY common/ /app/common/
COPY spend-agent/ /app/spend-agent/

RUN pip install --no-cache-dir /app/common /app/spend-agent

WORKDIR /app/spend-agent/src
EXPOSE 8000

CMD ["uvicorn", "spend_agent.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add Spend Intelligence Agent with CrewAI crew and FastAPI service"
```

---

### Task 9: SLA Prevention Agent

**Files:**
- Create: `agents/sla-agent/` (all files)

- [ ] **Step 1: Create pyproject.toml**

Create `agents/sla-agent/pyproject.toml`:
```toml
[project]
name = "sla-agent"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "costpilot-common @ file:///${PROJECT_ROOT}/../common",
    "crewai[anthropic]>=1.12",
    "fastapi>=0.110",
    "uvicorn>=0.27",
    "sqlalchemy>=2.0",
    "psycopg2-binary>=2.9",
    "pika>=1.3",
]
```

- [ ] **Step 2: Create tools**

Create `agents/sla-agent/src/sla_agent/__init__.py`:
```python
```

Create `agents/sla-agent/src/sla_agent/tools/__init__.py`:
```python
```

Create `agents/sla-agent/src/sla_agent/tools/sla_monitor.py`:
```python
from crewai.tools import tool
from sqlalchemy import text
from costpilot_common.database import SessionLocal


@tool("Get SLA Metrics")
def get_sla_metrics(hours: int = 24) -> str:
    """Get current SLA metrics for all services over the specified time window."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT s.id as service_id, s.name as service_name,
                   s.sla_uptime_target, s.sla_response_time_ms, s.sla_resolution_hours,
                   AVG(m.uptime_pct) as avg_uptime,
                   AVG(m.response_time_ms) as avg_response_time,
                   AVG(m.resolution_hours) as avg_resolution,
                   COUNT(*) as data_points
            FROM services s
            JOIN sla_metrics m ON m.service_id = s.id
            WHERE m.recorded_at >= NOW() - INTERVAL ':hours hours'
            GROUP BY s.id, s.name, s.sla_uptime_target, s.sla_response_time_ms, s.sla_resolution_hours
        """).bindparams(hours=hours))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()


@tool("Get SLA Trend")
def get_sla_trend(service_id: int, days: int = 7) -> str:
    """Get SLA metric trend for a specific service over recent days."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT DATE(recorded_at) as date,
                   AVG(uptime_pct) as avg_uptime,
                   AVG(response_time_ms) as avg_response_time,
                   MIN(uptime_pct) as min_uptime,
                   MAX(response_time_ms) as max_response_time
            FROM sla_metrics
            WHERE service_id = :service_id
              AND recorded_at >= NOW() - INTERVAL ':days days'
            GROUP BY DATE(recorded_at)
            ORDER BY date
        """).bindparams(service_id=service_id, days=days))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()
```

Create `agents/sla-agent/src/sla_agent/tools/breach_predictor.py`:
```python
from crewai.tools import tool
from sqlalchemy import text
from costpilot_common.database import SessionLocal


@tool("Predict SLA Breaches")
def predict_sla_breaches() -> str:
    """Analyze trending metrics to predict services approaching SLA breaches."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            WITH recent AS (
                SELECT service_id,
                       AVG(uptime_pct) as recent_uptime,
                       AVG(response_time_ms) as recent_response
                FROM sla_metrics
                WHERE recorded_at >= NOW() - INTERVAL '4 hours'
                GROUP BY service_id
            ),
            baseline AS (
                SELECT service_id,
                       AVG(uptime_pct) as baseline_uptime,
                       AVG(response_time_ms) as baseline_response
                FROM sla_metrics
                WHERE recorded_at >= NOW() - INTERVAL '7 days'
                  AND recorded_at < NOW() - INTERVAL '4 hours'
                GROUP BY service_id
            )
            SELECT s.id, s.name, s.sla_uptime_target,
                   r.recent_uptime, b.baseline_uptime,
                   r.recent_response, b.baseline_response,
                   s.sla_response_time_ms as target_response,
                   p.penalty_amount
            FROM services s
            JOIN recent r ON r.service_id = s.id
            JOIN baseline b ON b.service_id = s.id
            LEFT JOIN sla_penalties p ON p.service_id = s.id
            WHERE r.recent_uptime < s.sla_uptime_target * 1.05
               OR r.recent_response > s.sla_response_time_ms * 0.85
            ORDER BY p.penalty_amount DESC NULLS LAST
        """))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()
```

Create `agents/sla-agent/src/sla_agent/tools/escalation_manager.py`:
```python
from crewai.tools import tool
from sqlalchemy import text
from costpilot_common.database import SessionLocal


@tool("Get Team Capacity")
def get_team_capacity() -> str:
    """Check current team capacity and resource availability for reallocation."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT t.id as team_id, t.name as team_name,
                   t.member_count, t.current_utilization_pct,
                   (100 - t.current_utilization_pct) as available_capacity_pct,
                   t.skills
            FROM teams t
            WHERE t.current_utilization_pct < 90
            ORDER BY t.current_utilization_pct ASC
        """))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()


@tool("Get Penalty Schedule")
def get_penalty_schedule() -> str:
    """Get financial penalty schedule for SLA breaches per service."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT s.name as service_name, p.breach_type,
                   p.penalty_amount, p.escalation_hours
            FROM sla_penalties p
            JOIN services s ON s.id = p.service_id
            ORDER BY p.penalty_amount DESC
        """))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()
```

- [ ] **Step 3: Create crew and main**

Create `agents/sla-agent/src/sla_agent/crew.py`:
```python
from crewai import Agent, Task, Crew, Process
from costpilot_common.llm import get_llm
from sla_agent.tools.sla_monitor import get_sla_metrics, get_sla_trend
from sla_agent.tools.breach_predictor import predict_sla_breaches
from sla_agent.tools.escalation_manager import get_team_capacity, get_penalty_schedule


def create_sla_crew() -> Crew:
    llm = get_llm()

    sla_monitor = Agent(
        role="SLA Monitor",
        goal="Track service metrics against SLA thresholds and identify services at risk.",
        backstory="You are a vigilant operations analyst who monitors service health 24/7.",
        tools=[get_sla_metrics, get_sla_trend],
        llm=llm,
        verbose=True,
    )

    breach_predictor = Agent(
        role="Breach Predictor",
        goal="Use trend analysis to predict SLA breaches before they happen.",
        backstory="You are a predictive analytics expert who spots degradation patterns early.",
        tools=[predict_sla_breaches],
        llm=llm,
        verbose=True,
    )

    escalation_manager = Agent(
        role="Escalation Manager",
        goal="Recommend resource shifts, work rerouting, or escalations to prevent SLA penalties.",
        backstory="You are a crisis management expert who prevents financial damage through quick action.",
        tools=[get_team_capacity, get_penalty_schedule],
        llm=llm,
        verbose=True,
    )

    monitor_task = Task(
        description="Check current SLA metrics for all services. Identify any services below or approaching their targets. Report current compliance status.",
        expected_output="JSON list of services with current metrics, target, and compliance status.",
        agent=sla_monitor,
    )

    predict_task = Task(
        description="Analyze trends to predict which services will breach SLA in the next 24 hours. Estimate time to breach and penalty amount at stake.",
        expected_output="JSON list of at-risk services with predicted_breach_in_hours, penalty_amount, and confidence.",
        agent=breach_predictor,
    )

    escalation_task = Task(
        description="For services at risk of breach, recommend specific actions: resource reallocation, team shifts, or escalations. Calculate cost of action vs cost of breach.",
        expected_output="JSON list of recommendations with service, action, cost_of_action, penalty_avoided, and net_savings.",
        agent=escalation_manager,
    )

    return Crew(
        agents=[sla_monitor, breach_predictor, escalation_manager],
        tasks=[monitor_task, predict_task, escalation_task],
        process=Process.sequential,
        verbose=True,
    )
```

Create `agents/sla-agent/src/sla_agent/main.py`:
```python
import asyncio
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from decimal import Decimal

from fastapi import FastAPI
from costpilot_common.messaging import publish_proposal, publish_insight, publish_alert
from costpilot_common.schemas import ProposalSchema, InsightSchema, AlertSchema
from sla_agent.crew import create_sla_crew

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SLA Prevention Agent starting...")
    yield
    logger.info("SLA Prevention Agent shutting down...")


app = FastAPI(title="SLA Prevention Agent", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "healthy", "agent": "sla", "timestamp": datetime.utcnow().isoformat()}


@app.post("/run")
async def run_analysis():
    """Trigger SLA monitoring and breach prediction."""
    logger.info("Starting SLA analysis...")

    try:
        crew = create_sla_crew()
        result = crew.kickoff()

        try:
            findings = json.loads(result.raw) if isinstance(result.raw, str) else result.raw
        except (json.JSONDecodeError, TypeError):
            findings = [{"description": result.raw, "penalty_amount": 0}]

        for finding in findings if isinstance(findings, list) else [findings]:
            penalty = Decimal(str(finding.get("penalty_amount", finding.get("penalty_avoided", 0))))
            if penalty > 0:
                publish_proposal(ProposalSchema(
                    agent_type="Sla",
                    title=f"SLA prevention: {finding.get('service', finding.get('description', 'SLA at risk'))[:100]}",
                    description=json.dumps(finding),
                    estimated_savings=penalty,
                    risk_level="Critical" if penalty > 100000 else "High",
                    evidence=finding,
                ))

            publish_insight(InsightSchema(
                source_agent="Sla",
                insight_type=finding.get("type", "breach_warning"),
                entity_type="service",
                entity_id=str(finding.get("service_id", finding.get("service", "unknown"))),
                summary=finding.get("description", str(finding))[:500],
                financial_impact=penalty,
                confidence=Decimal(str(finding.get("confidence", 0.8))),
                related_data=finding,
            ))

        publish_alert(AlertSchema(
            agent_type="Sla", severity="Info",
            title="SLA analysis completed",
            message=f"Found {len(findings) if isinstance(findings, list) else 1} findings",
        ))

        return {"status": "completed", "findings_count": len(findings) if isinstance(findings, list) else 1}

    except Exception as e:
        logger.error("SLA analysis failed: %s", e)
        publish_alert(AlertSchema(
            agent_type="Sla", severity="Critical",
            title="SLA analysis failed", message=str(e),
        ))
        return {"status": "failed", "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

- [ ] **Step 4: Create Dockerfile**

Create `agents/sla-agent/Dockerfile`:
```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY common/ /app/common/
COPY sla-agent/ /app/sla-agent/

RUN pip install --no-cache-dir /app/common /app/sla-agent

WORKDIR /app/sla-agent/src
EXPOSE 8000

CMD ["uvicorn", "sla_agent.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add SLA Prevention Agent with breach prediction and escalation"
```

---

### Task 10: Resource Optimization Agent

**Files:**
- Create: `agents/resource-agent/` (all files)

- [ ] **Step 1: Create pyproject.toml, __init__.py, tools**

Create `agents/resource-agent/pyproject.toml`:
```toml
[project]
name = "resource-agent"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "costpilot-common @ file:///${PROJECT_ROOT}/../common",
    "crewai[anthropic]>=1.12",
    "fastapi>=0.110",
    "uvicorn>=0.27",
    "sqlalchemy>=2.0",
    "psycopg2-binary>=2.9",
    "pika>=1.3",
]
```

Create `agents/resource-agent/src/resource_agent/__init__.py`:
```python
```

Create `agents/resource-agent/src/resource_agent/tools/__init__.py`:
```python
```

Create `agents/resource-agent/src/resource_agent/tools/utilization_analyzer.py`:
```python
from crewai.tools import tool
from sqlalchemy import text
from costpilot_common.database import SessionLocal


@tool("Get License Utilization")
def get_license_utilization() -> str:
    """Get software license utilization across teams. Identifies unused licenses."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT t.id as tool_id, t.name as tool_name,
                   t.total_licenses, t.used_licenses,
                   t.cost_per_license, t.annual_cost,
                   (t.total_licenses - t.used_licenses) as unused,
                   ROUND((t.used_licenses::numeric / t.total_licenses * 100), 1) as utilization_pct
            FROM software_tools t
            ORDER BY (t.total_licenses - t.used_licenses) * t.cost_per_license DESC
        """))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()


@tool("Get Infrastructure Utilization")
def get_infrastructure_utilization() -> str:
    """Get server/VM utilization metrics. Identifies idle infrastructure."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT s.id, s.name, s.type,
                   AVG(m.cpu_pct) as avg_cpu,
                   AVG(m.memory_pct) as avg_memory,
                   AVG(m.storage_pct) as avg_storage,
                   s.monthly_cost
            FROM servers s
            JOIN server_metrics m ON m.server_id = s.id
            WHERE m.recorded_at >= NOW() - INTERVAL '7 days'
            GROUP BY s.id, s.name, s.type, s.monthly_cost
            ORDER BY AVG(m.cpu_pct) ASC
        """))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()
```

Create `agents/resource-agent/src/resource_agent/tools/consolidation_planner.py`:
```python
from crewai.tools import tool
from sqlalchemy import text
from costpilot_common.database import SessionLocal


@tool("Find Consolidation Opportunities")
def find_consolidation_opportunities() -> str:
    """Identify resources that can be consolidated: idle servers, duplicate tools, underused licenses."""
    db = SessionLocal()
    try:
        # Idle servers (avg CPU < 10%)
        servers = db.execute(text("""
            SELECT s.id, s.name, s.monthly_cost,
                   AVG(m.cpu_pct) as avg_cpu, 'idle_server' as opportunity_type
            FROM servers s
            JOIN server_metrics m ON m.server_id = s.id
            WHERE m.recorded_at >= NOW() - INTERVAL '7 days'
            GROUP BY s.id, s.name, s.monthly_cost
            HAVING AVG(m.cpu_pct) < 10
        """))
        idle_servers = [dict(r._mapping) for r in servers]

        # Unused licenses
        licenses = db.execute(text("""
            SELECT t.id, t.name, t.cost_per_license,
                   (t.total_licenses - t.used_licenses) as unused_count,
                   (t.total_licenses - t.used_licenses) * t.cost_per_license as waste_amount,
                   'unused_license' as opportunity_type
            FROM software_tools t
            WHERE (t.total_licenses - t.used_licenses) > 0
        """))
        unused_licenses = [dict(r._mapping) for r in licenses]

        import json
        return json.dumps({"idle_servers": idle_servers, "unused_licenses": unused_licenses}, default=str)
    finally:
        db.close()
```

Create `agents/resource-agent/src/resource_agent/tools/cost_allocator.py`:
```python
from crewai.tools import tool
from sqlalchemy import text
from costpilot_common.database import SessionLocal


@tool("Get Cost Allocation By Team")
def get_cost_allocation_by_team() -> str:
    """Get cost allocation breakdown by team and category."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT t.name as team_name, ca.category,
                   SUM(ca.amount) as total_cost
            FROM cost_allocations ca
            JOIN teams t ON t.id = ca.team_id
            GROUP BY t.name, ca.category
            ORDER BY SUM(ca.amount) DESC
        """))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()
```

- [ ] **Step 2: Create crew and main**

Create `agents/resource-agent/src/resource_agent/crew.py`:
```python
from crewai import Agent, Task, Crew, Process
from costpilot_common.llm import get_llm
from resource_agent.tools.utilization_analyzer import get_license_utilization, get_infrastructure_utilization
from resource_agent.tools.consolidation_planner import find_consolidation_opportunities
from resource_agent.tools.cost_allocator import get_cost_allocation_by_team


def create_resource_crew() -> Crew:
    llm = get_llm()

    utilization_analyzer = Agent(
        role="Utilization Analyzer",
        goal="Track usage across licenses, infrastructure, tools, and teams to find waste.",
        backstory="You are an IT operations expert who maximizes resource ROI.",
        tools=[get_license_utilization, get_infrastructure_utilization],
        llm=llm, verbose=True,
    )

    consolidation_planner = Agent(
        role="Consolidation Planner",
        goal="Identify underused resources and propose consolidation to reduce costs.",
        backstory="You are a cloud architect who eliminates infrastructure waste.",
        tools=[find_consolidation_opportunities],
        llm=llm, verbose=True,
    )

    cost_allocator = Agent(
        role="Cost Allocator",
        goal="Attribute costs to teams and projects for accountability and optimization.",
        backstory="You are a FinOps analyst who drives cost accountability across the org.",
        tools=[get_cost_allocation_by_team],
        llm=llm, verbose=True,
    )

    analyze_util = Task(
        description="Analyze license and infrastructure utilization. Identify all resources below 50% utilization. Calculate wasted spend.",
        expected_output="JSON list of underutilized resources with type, name, utilization_pct, waste_amount.",
        agent=utilization_analyzer,
    )

    plan_consolidation = Task(
        description="Based on utilization data, propose specific consolidation actions: cancel licenses, decommission servers, merge tools.",
        expected_output="JSON list of consolidation proposals with action, resource, monthly_savings, risk.",
        agent=consolidation_planner,
    )

    allocate_costs = Task(
        description="Generate cost allocation by team. Highlight teams with disproportionate spend relative to output.",
        expected_output="JSON list of team cost allocations with team, category, amount, and efficiency_flag.",
        agent=cost_allocator,
    )

    return Crew(
        agents=[utilization_analyzer, consolidation_planner, cost_allocator],
        tasks=[analyze_util, plan_consolidation, allocate_costs],
        process=Process.sequential, verbose=True,
    )
```

Create `agents/resource-agent/src/resource_agent/main.py`:
```python
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from decimal import Decimal

from fastapi import FastAPI
from costpilot_common.messaging import publish_proposal, publish_insight, publish_alert
from costpilot_common.schemas import ProposalSchema, InsightSchema, AlertSchema
from resource_agent.crew import create_resource_crew

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Resource Optimization Agent starting...")
    yield


app = FastAPI(title="Resource Optimization Agent", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "healthy", "agent": "resource", "timestamp": datetime.utcnow().isoformat()}


@app.post("/run")
async def run_analysis():
    logger.info("Starting resource analysis...")
    try:
        crew = create_resource_crew()
        result = crew.kickoff()

        try:
            findings = json.loads(result.raw) if isinstance(result.raw, str) else result.raw
        except (json.JSONDecodeError, TypeError):
            findings = [{"description": result.raw, "monthly_savings": 0}]

        for finding in findings if isinstance(findings, list) else [findings]:
            savings = Decimal(str(finding.get("monthly_savings", finding.get("waste_amount", 0))))
            annual = savings * 12

            if savings > 0:
                publish_proposal(ProposalSchema(
                    agent_type="Resource",
                    title=f"Resource optimization: {finding.get('action', finding.get('description', 'Consolidation opportunity'))[:100]}",
                    description=json.dumps(finding),
                    estimated_savings=annual,
                    risk_level="Low" if savings < 5000 else "Medium",
                    evidence=finding,
                ))

            publish_insight(InsightSchema(
                source_agent="Resource",
                insight_type=finding.get("type", "underutilized"),
                entity_type=finding.get("resource_type", "resource"),
                entity_id=str(finding.get("resource_id", finding.get("name", "unknown"))),
                summary=finding.get("description", str(finding))[:500],
                financial_impact=annual,
                confidence=Decimal(str(finding.get("confidence", 0.85))),
                related_data=finding,
            ))

        publish_alert(AlertSchema(
            agent_type="Resource", severity="Info",
            title="Resource analysis completed",
            message=f"Found {len(findings) if isinstance(findings, list) else 1} findings",
        ))
        return {"status": "completed", "findings_count": len(findings) if isinstance(findings, list) else 1}

    except Exception as e:
        logger.error("Resource analysis failed: %s", e)
        publish_alert(AlertSchema(
            agent_type="Resource", severity="Critical",
            title="Resource analysis failed", message=str(e),
        ))
        return {"status": "failed", "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

- [ ] **Step 3: Create Dockerfile**

Create `agents/resource-agent/Dockerfile`:
```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY common/ /app/common/
COPY resource-agent/ /app/resource-agent/

RUN pip install --no-cache-dir /app/common /app/resource-agent

WORKDIR /app/resource-agent/src
EXPOSE 8000

CMD ["uvicorn", "resource_agent.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add Resource Optimization Agent with utilization analysis and consolidation"
```

---

### Task 11: FinOps Agent

**Files:**
- Create: `agents/finops-agent/` (all files)

- [ ] **Step 1: Create pyproject.toml and tools**

Create `agents/finops-agent/pyproject.toml`:
```toml
[project]
name = "finops-agent"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "costpilot-common @ file:///${PROJECT_ROOT}/../common",
    "crewai[anthropic]>=1.12",
    "fastapi>=0.110",
    "uvicorn>=0.27",
    "sqlalchemy>=2.0",
    "psycopg2-binary>=2.9",
    "pika>=1.3",
]
```

Create `agents/finops-agent/src/finops_agent/__init__.py`:
```python
```

Create `agents/finops-agent/src/finops_agent/tools/__init__.py`:
```python
```

Create `agents/finops-agent/src/finops_agent/tools/transaction_reconciler.py`:
```python
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
```

Create `agents/finops-agent/src/finops_agent/tools/variance_analyst.py`:
```python
from crewai.tools import tool
from sqlalchemy import text
from costpilot_common.database import SessionLocal


@tool("Get Budget Variance")
def get_budget_variance() -> str:
    """Compare budget vs actual spending by department and category."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT b.department, b.category,
                   b.budgeted_amount, b.actual_amount,
                   (b.actual_amount - b.budgeted_amount) as variance,
                   ROUND(((b.actual_amount - b.budgeted_amount) / b.budgeted_amount * 100)::numeric, 1) as variance_pct,
                   b.period
            FROM budget_vs_actual b
            WHERE b.period = (SELECT MAX(period) FROM budget_vs_actual)
            ORDER BY ABS(b.actual_amount - b.budgeted_amount) DESC
        """))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()
```

Create `agents/finops-agent/src/finops_agent/tools/close_accelerator.py`:
```python
from crewai.tools import tool
from sqlalchemy import text
from costpilot_common.database import SessionLocal


@tool("Get Reconciliation Status")
def get_reconciliation_status() -> str:
    """Get current status of financial reconciliation — matched vs unmatched counts."""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT
                COUNT(*) FILTER (WHERE reconciled = true) as reconciled_count,
                COUNT(*) FILTER (WHERE reconciled = false) as unreconciled_count,
                SUM(amount) FILTER (WHERE reconciled = false) as unreconciled_amount
            FROM invoices
        """))
        rows = [dict(r._mapping) for r in result]
        import json
        return json.dumps(rows, default=str)
    finally:
        db.close()
```

- [ ] **Step 2: Create crew and main**

Create `agents/finops-agent/src/finops_agent/crew.py`:
```python
from crewai import Agent, Task, Crew, Process
from costpilot_common.llm import get_llm
from finops_agent.tools.transaction_reconciler import find_unmatched_transactions, find_auto_reconcilable
from finops_agent.tools.variance_analyst import get_budget_variance
from finops_agent.tools.close_accelerator import get_reconciliation_status


def create_finops_crew() -> Crew:
    llm = get_llm()

    reconciler = Agent(
        role="Transaction Reconciler",
        goal="Match expected vs actual transactions and flag discrepancies.",
        backstory="You are a senior financial controller with zero tolerance for unmatched transactions.",
        tools=[find_unmatched_transactions, find_auto_reconcilable],
        llm=llm, verbose=True,
    )

    variance_analyst = Agent(
        role="Variance Analyst",
        goal="Compare budget vs actual with root-cause attribution.",
        backstory="You are a financial analyst who traces every dollar of variance to its source.",
        tools=[get_budget_variance],
        llm=llm, verbose=True,
    )

    close_accelerator = Agent(
        role="Close Accelerator",
        goal="Automate reconciliation steps to speed up financial close.",
        backstory="You are a process automation expert who cut close cycles from 10 days to 3.",
        tools=[find_auto_reconcilable, get_reconciliation_status],
        llm=llm, verbose=True,
    )

    reconcile_task = Task(
        description="Find all unmatched transactions. Identify discrepancies between invoices and POs. Report each with variance amount.",
        expected_output="JSON list of discrepancies with invoice_id, vendor, variance_amount, description.",
        agent=reconciler,
    )

    variance_task = Task(
        description="Analyze budget vs actual for all departments. Identify top variances and attribute root causes.",
        expected_output="JSON list of variances with department, category, variance_amount, variance_pct, root_cause.",
        agent=variance_analyst,
    )

    accelerate_task = Task(
        description="Identify transactions that can be auto-reconciled. Calculate time savings from automation.",
        expected_output="JSON with auto_reconcilable_count, total_amount, estimated_days_saved.",
        agent=close_accelerator,
    )

    return Crew(
        agents=[reconciler, variance_analyst, close_accelerator],
        tasks=[reconcile_task, variance_task, accelerate_task],
        process=Process.sequential, verbose=True,
    )
```

Create `agents/finops-agent/src/finops_agent/main.py`:
```python
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from decimal import Decimal

from fastapi import FastAPI
from costpilot_common.messaging import publish_proposal, publish_insight, publish_alert
from costpilot_common.schemas import ProposalSchema, InsightSchema, AlertSchema
from finops_agent.crew import create_finops_crew

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("FinOps Agent starting...")
    yield


app = FastAPI(title="FinOps Agent", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "healthy", "agent": "finops", "timestamp": datetime.utcnow().isoformat()}


@app.post("/run")
async def run_analysis():
    logger.info("Starting FinOps analysis...")
    try:
        crew = create_finops_crew()
        result = crew.kickoff()

        try:
            findings = json.loads(result.raw) if isinstance(result.raw, str) else result.raw
        except (json.JSONDecodeError, TypeError):
            findings = [{"description": result.raw, "variance_amount": 0}]

        for finding in findings if isinstance(findings, list) else [findings]:
            amount = Decimal(str(finding.get("variance_amount", finding.get("total_amount", 0))))

            if amount > 0:
                publish_proposal(ProposalSchema(
                    agent_type="Finops",
                    title=f"FinOps finding: {finding.get('description', str(finding))[:100]}",
                    description=json.dumps(finding),
                    estimated_savings=amount,
                    risk_level="Low",
                    evidence=finding,
                ))

            publish_insight(InsightSchema(
                source_agent="Finops",
                insight_type=finding.get("type", "variance_detected"),
                entity_type=finding.get("entity_type", "transaction"),
                entity_id=str(finding.get("invoice_id", finding.get("department", "unknown"))),
                summary=finding.get("description", str(finding))[:500],
                financial_impact=abs(amount),
                confidence=Decimal(str(finding.get("confidence", 0.9))),
                related_data=finding,
            ))

        publish_alert(AlertSchema(
            agent_type="Finops", severity="Info",
            title="FinOps analysis completed",
            message=f"Found {len(findings) if isinstance(findings, list) else 1} findings",
        ))
        return {"status": "completed", "findings_count": len(findings) if isinstance(findings, list) else 1}

    except Exception as e:
        logger.error("FinOps analysis failed: %s", e)
        publish_alert(AlertSchema(
            agent_type="Finops", severity="Critical",
            title="FinOps analysis failed", message=str(e),
        ))
        return {"status": "failed", "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

- [ ] **Step 3: Create Dockerfile**

Create `agents/finops-agent/Dockerfile`:
```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY common/ /app/common/
COPY finops-agent/ /app/finops-agent/

RUN pip install --no-cache-dir /app/common /app/finops-agent

WORKDIR /app/finops-agent/src
EXPOSE 8000

CMD ["uvicorn", "finops_agent.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add FinOps Agent with reconciliation, variance analysis, and close acceleration"
```

---

## Phase 4: Synthetic Data Seeding

### Task 12: Data Seeding Script

**Files:**
- Create: `agents/seed/` (all files)

- [ ] **Step 1: Create seeding package**

Create `agents/seed/pyproject.toml`:
```toml
[project]
name = "costpilot-seed"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "psycopg2-binary>=2.9",
    "faker>=28.0",
]
```

- [ ] **Step 2: Create generators**

Create `agents/seed/generators/__init__.py`:
```python
```

Create `agents/seed/generators/vendors.py`:
```python
from faker import Faker

fake = Faker()
Faker.seed(42)


def generate_vendors(cursor, count=50):
    categories = ["Cloud Services", "Software Licenses", "Consulting", "Hardware",
                   "Maintenance", "Training", "Telecom", "Facilities", "Security", "Data Services"]

    vendors = []
    for i in range(1, count + 1):
        name = fake.company()
        category = categories[i % len(categories)]
        cursor.execute("""
            INSERT INTO vendors (id, name, category, contact_email, payment_terms_days, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
        """, (i, name, category, fake.company_email(), fake.random_element([15, 30, 45, 60])))
        vendors.append({"id": i, "name": name, "category": category})

    return vendors
```

Create `agents/seed/generators/procurement.py`:
```python
import random
from datetime import datetime, timedelta
from faker import Faker

fake = Faker()
Faker.seed(42)
random.seed(42)

ITEMS = [
    "Cloud Compute Instance", "SaaS License", "Consulting Hours", "Network Equipment",
    "Security Audit", "Training Workshop", "Data Pipeline Service", "Support Contract",
    "Storage Volume", "Load Balancer", "API Gateway Usage", "Monitoring Service",
]


def generate_purchase_orders(cursor, vendors, count=10000):
    base_date = datetime(2025, 4, 1)

    for i in range(1, count + 1):
        vendor = random.choice(vendors)
        item = random.choice(ITEMS)
        base_price = random.uniform(100, 50000)

        # 5% chance of anomalous price (spike)
        if random.random() < 0.05:
            unit_price = base_price * random.uniform(1.3, 2.0)
        else:
            unit_price = base_price * random.uniform(0.9, 1.1)

        quantity = random.randint(1, 100)
        order_date = base_date + timedelta(days=random.randint(0, 365))

        cursor.execute("""
            INSERT INTO purchase_orders (id, vendor_id, item_description, quantity, unit_price, total_amount, order_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (i, vendor["id"], item, quantity, round(unit_price, 2),
              round(unit_price * quantity, 2), order_date))


def generate_invoices(cursor, vendors, count=8000):
    base_date = datetime(2025, 4, 1)

    for i in range(1, count + 1):
        vendor = random.choice(vendors)
        amount = round(random.uniform(500, 100000), 2)
        invoice_date = base_date + timedelta(days=random.randint(0, 365))

        # 5% chance of duplicate (same vendor, same amount, within 30 days)
        is_duplicate = random.random() < 0.05 and i > 100
        if is_duplicate:
            amount = round(random.choice([5000, 10000, 25000, 50000]) * random.uniform(0.99, 1.01), 2)

        cursor.execute("""
            INSERT INTO invoices (id, vendor_id, invoice_number, amount, invoice_date, reconciled)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (i, vendor["id"], f"INV-{i:06d}", amount, invoice_date,
              random.random() > 0.3))  # 70% reconciled


def generate_vendor_contracts(cursor, vendors):
    categories = ["Cloud Services", "Software Licenses", "Consulting", "Security", "Data Services"]
    contract_id = 0

    for vendor in vendors:
        for _ in range(random.randint(1, 3)):
            contract_id += 1
            category = random.choice(categories)
            start = datetime(2025, 1, 1) + timedelta(days=random.randint(0, 180))
            end = start + timedelta(days=random.randint(180, 730))
            annual_cost = round(random.uniform(10000, 500000), 2)

            cursor.execute("""
                INSERT INTO vendor_contracts (id, vendor_id, service_category, annual_cost, start_date, end_date)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (contract_id, vendor["id"], category, annual_cost, start, end))


def generate_market_benchmarks(cursor):
    categories = ["Cloud Services", "Software Licenses", "Consulting", "Security",
                   "Data Services", "Hardware", "Maintenance", "Training", "Telecom", "Facilities"]

    for i, cat in enumerate(categories, 1):
        benchmark = round(random.uniform(20000, 200000), 2)
        cursor.execute("""
            INSERT INTO market_benchmarks (id, service_category, benchmark_rate, market_average)
            VALUES (%s, %s, %s, %s)
        """, (i, cat, benchmark * 0.9, benchmark))
```

Create `agents/seed/generators/sla_services.py`:
```python
import random
from datetime import datetime, timedelta
from faker import Faker

fake = Faker()
random.seed(42)

SERVICE_NAMES = [
    "Payment Gateway", "User Auth Service", "Order Processing", "Inventory API",
    "Notification Service", "Search Engine", "Analytics Pipeline", "CDN",
    "Database Cluster", "Cache Layer", "Email Service", "File Storage",
    "API Gateway", "Load Balancer", "Monitoring Stack", "CI/CD Pipeline",
    "Log Aggregator", "Message Queue", "Identity Provider", "Rate Limiter",
]


def generate_services(cursor):
    for i, name in enumerate(SERVICE_NAMES, 1):
        uptime_target = random.choice([99.9, 99.95, 99.99])
        response_time = random.choice([100, 200, 500, 1000])
        resolution = random.choice([1, 2, 4, 8, 24])

        cursor.execute("""
            INSERT INTO services (id, name, sla_uptime_target, sla_response_time_ms, sla_resolution_hours)
            VALUES (%s, %s, %s, %s, %s)
        """, (i, name, uptime_target, response_time, resolution))

    return len(SERVICE_NAMES)


def generate_sla_metrics(cursor, service_count):
    base_date = datetime(2025, 10, 1)

    for service_id in range(1, service_count + 1):
        base_uptime = random.uniform(99.5, 100.0)
        base_response = random.uniform(50, 400)

        # 3 services trending toward breach
        degrading = service_id in [3, 7, 15]

        for day in range(180):
            for hour in range(0, 24, 4):  # 6 data points per day
                date = base_date + timedelta(days=day, hours=hour)

                if degrading and day > 150:
                    degradation = (day - 150) * 0.03
                    uptime = max(95.0, base_uptime - degradation + random.uniform(-0.1, 0.1))
                    response = base_response * (1 + degradation * 0.1) + random.uniform(-20, 20)
                else:
                    uptime = base_uptime + random.uniform(-0.3, 0.1)
                    response = base_response + random.uniform(-30, 30)

                resolution = random.uniform(0.5, 8.0)

                cursor.execute("""
                    INSERT INTO sla_metrics (service_id, uptime_pct, response_time_ms, resolution_hours, recorded_at)
                    VALUES (%s, %s, %s, %s, %s)
                """, (service_id, round(uptime, 3), round(response, 1), round(resolution, 2), date))


def generate_sla_penalties(cursor, service_count):
    penalty_id = 0
    breach_types = ["uptime", "response_time", "resolution_time"]

    for service_id in range(1, service_count + 1):
        for breach_type in breach_types:
            penalty_id += 1
            amount = random.choice([10000, 25000, 50000, 75000, 100000, 150000])
            cursor.execute("""
                INSERT INTO sla_penalties (id, service_id, breach_type, penalty_amount, escalation_hours)
                VALUES (%s, %s, %s, %s, %s)
            """, (penalty_id, service_id, breach_type, amount, random.choice([1, 2, 4, 8])))
```

Create `agents/seed/generators/resources.py`:
```python
import random
from datetime import datetime, timedelta
from faker import Faker

fake = Faker()
random.seed(42)


def generate_teams(cursor, count=15):
    team_names = [
        "Platform", "Backend", "Frontend", "Mobile", "Data Engineering",
        "ML/AI", "DevOps", "Security", "QA", "Product",
        "Design", "Customer Success", "Sales Ops", "Finance", "HR Tech",
    ]
    skills_pool = ["Python", "Java", "Go", "TypeScript", "React", "AWS", "GCP", "Kubernetes", "SQL", "ML"]

    for i, name in enumerate(team_names[:count], 1):
        member_count = random.randint(5, 30)
        utilization = random.uniform(40, 95)
        skills = ",".join(random.sample(skills_pool, 3))

        cursor.execute("""
            INSERT INTO teams (id, name, member_count, current_utilization_pct, skills)
            VALUES (%s, %s, %s, %s, %s)
        """, (i, name, member_count, round(utilization, 1), skills))


def generate_software_tools(cursor):
    tools = [
        ("Jira", 200, 50), ("Confluence", 200, 30), ("Slack", 250, 15),
        ("GitHub Enterprise", 150, 40), ("Figma", 50, 35), ("DataDog", 30, 80),
        ("Snowflake", 20, 120), ("Salesforce", 80, 150), ("Zoom", 200, 20),
        ("AWS", 1, 50000), ("GCP", 1, 30000), ("Azure", 1, 20000),
        ("Notion", 100, 12), ("Linear", 80, 10), ("Vercel", 10, 200),
        ("PagerDuty", 30, 25), ("1Password", 200, 8), ("Grammarly", 50, 15),
        ("Miro", 40, 16), ("Loom", 60, 10), ("Asana", 30, 15),
        ("HubSpot", 20, 80), ("Stripe Dashboard", 5, 0), ("PostHog", 10, 50),
        ("CircleCI", 15, 40), ("LaunchDarkly", 10, 60), ("Sentry", 20, 30),
        ("Segment", 5, 100), ("Amplitude", 10, 70), ("dbt Cloud", 8, 90),
    ]

    for i, (name, total, cost) in enumerate(tools, 1):
        # 15% unused licenses embedded
        used = max(1, int(total * random.uniform(0.5, 1.0)))
        if random.random() < 0.15:
            used = max(1, int(total * random.uniform(0.1, 0.4)))  # deliberately underused

        cursor.execute("""
            INSERT INTO software_tools (id, name, total_licenses, used_licenses, cost_per_license, annual_cost)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (i, name, total, used, cost, total * cost * 12))


def generate_servers(cursor, count=50):
    types = ["Web Server", "API Server", "Database", "Cache", "Worker", "ML Training", "Storage"]

    for i in range(1, count + 1):
        server_type = random.choice(types)
        monthly_cost = round(random.uniform(100, 5000), 2)

        cursor.execute("""
            INSERT INTO servers (id, name, type, monthly_cost)
            VALUES (%s, %s, %s, %s)
        """, (i, f"{server_type.lower().replace(' ', '-')}-{i:03d}", server_type, monthly_cost))


def generate_server_metrics(cursor, server_count=50):
    base_date = datetime(2026, 3, 1)

    for server_id in range(1, server_count + 1):
        # 20% idle infrastructure
        is_idle = random.random() < 0.20
        base_cpu = random.uniform(2, 8) if is_idle else random.uniform(30, 80)

        for day in range(28):
            for hour in range(0, 24, 6):
                date = base_date + timedelta(days=day, hours=hour)
                cpu = max(0, min(100, base_cpu + random.uniform(-5, 5)))
                memory = max(0, min(100, cpu * random.uniform(0.8, 1.5)))
                storage = random.uniform(20, 90)

                cursor.execute("""
                    INSERT INTO server_metrics (server_id, cpu_pct, memory_pct, storage_pct, recorded_at)
                    VALUES (%s, %s, %s, %s, %s)
                """, (server_id, round(cpu, 1), round(memory, 1), round(storage, 1), date))


def generate_cost_allocations(cursor, team_count=15):
    categories = ["Compute", "Storage", "Licenses", "Consulting", "Training", "Telecom"]
    alloc_id = 0

    for team_id in range(1, team_count + 1):
        for cat in categories:
            alloc_id += 1
            amount = round(random.uniform(1000, 100000), 2)
            cursor.execute("""
                INSERT INTO cost_allocations (id, team_id, category, amount, period)
                VALUES (%s, %s, %s, %s, '2026-03')
            """, (alloc_id, team_id, cat, amount))
```

Create `agents/seed/generators/financial.py`:
```python
import random
from faker import Faker

fake = Faker()
random.seed(42)

DEPARTMENTS = ["Engineering", "Sales", "Marketing", "Operations", "Finance", "HR", "Legal", "Product"]
CATEGORIES = ["Cloud", "Licenses", "Consulting", "Hardware", "Travel", "Training", "Facilities", "Telecom"]


def generate_budget_vs_actual(cursor):
    record_id = 0
    periods = [f"2025-{m:02d}" for m in range(4, 13)] + [f"2026-{m:02d}" for m in range(1, 4)]

    for period in periods:
        for dept in DEPARTMENTS:
            for cat in CATEGORIES:
                record_id += 1
                budget = round(random.uniform(5000, 200000), 2)

                # Embed deliberate variances
                if random.random() < 0.1:
                    actual = budget * random.uniform(1.15, 1.40)  # Over budget
                elif random.random() < 0.1:
                    actual = budget * random.uniform(0.5, 0.75)   # Under budget
                else:
                    actual = budget * random.uniform(0.92, 1.08)  # Normal

                cursor.execute("""
                    INSERT INTO budget_vs_actual (id, department, category, budgeted_amount, actual_amount, period)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (record_id, dept, cat, budget, round(actual, 2), period))
```

- [ ] **Step 3: Create main seed script**

Create `agents/seed/seed_data.py`:
```python
#!/usr/bin/env python3
"""Seed the CostPilot database with synthetic data for demo."""

import os
import sys
import psycopg2

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://costpilot:costpilot_dev@localhost:5432/costpilot"
)


def create_tables(cursor):
    """Create operational data tables (separate from EF Core managed tables)."""
    cursor.execute("""
        -- Vendors & Procurement
        CREATE TABLE IF NOT EXISTS vendors (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT,
            contact_email TEXT,
            payment_terms_days INT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS purchase_orders (
            id SERIAL PRIMARY KEY,
            vendor_id INT REFERENCES vendors(id),
            item_description TEXT,
            quantity INT,
            unit_price NUMERIC(18,2),
            total_amount NUMERIC(18,2),
            order_date DATE
        );

        CREATE TABLE IF NOT EXISTS invoices (
            id SERIAL PRIMARY KEY,
            vendor_id INT REFERENCES vendors(id),
            invoice_number TEXT,
            amount NUMERIC(18,2),
            invoice_date DATE,
            reconciled BOOLEAN DEFAULT FALSE
        );

        CREATE TABLE IF NOT EXISTS vendor_contracts (
            id SERIAL PRIMARY KEY,
            vendor_id INT REFERENCES vendors(id),
            service_category TEXT,
            annual_cost NUMERIC(18,2),
            start_date DATE,
            end_date DATE
        );

        CREATE TABLE IF NOT EXISTS market_benchmarks (
            id SERIAL PRIMARY KEY,
            service_category TEXT,
            benchmark_rate NUMERIC(18,2),
            market_average NUMERIC(18,2)
        );

        -- SLA & Services
        CREATE TABLE IF NOT EXISTS services (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            sla_uptime_target NUMERIC(6,3),
            sla_response_time_ms INT,
            sla_resolution_hours INT
        );

        CREATE TABLE IF NOT EXISTS sla_metrics (
            id SERIAL PRIMARY KEY,
            service_id INT REFERENCES services(id),
            uptime_pct NUMERIC(6,3),
            response_time_ms NUMERIC(10,1),
            resolution_hours NUMERIC(6,2),
            recorded_at TIMESTAMPTZ
        );

        CREATE TABLE IF NOT EXISTS sla_penalties (
            id SERIAL PRIMARY KEY,
            service_id INT REFERENCES services(id),
            breach_type TEXT,
            penalty_amount NUMERIC(18,2),
            escalation_hours INT
        );

        -- Resources
        CREATE TABLE IF NOT EXISTS teams (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            member_count INT,
            current_utilization_pct NUMERIC(5,1),
            skills TEXT
        );

        CREATE TABLE IF NOT EXISTS software_tools (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            total_licenses INT,
            used_licenses INT,
            cost_per_license NUMERIC(18,2),
            annual_cost NUMERIC(18,2)
        );

        CREATE TABLE IF NOT EXISTS servers (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT,
            monthly_cost NUMERIC(18,2)
        );

        CREATE TABLE IF NOT EXISTS server_metrics (
            id SERIAL PRIMARY KEY,
            server_id INT REFERENCES servers(id),
            cpu_pct NUMERIC(5,1),
            memory_pct NUMERIC(5,1),
            storage_pct NUMERIC(5,1),
            recorded_at TIMESTAMPTZ
        );

        CREATE TABLE IF NOT EXISTS cost_allocations (
            id SERIAL PRIMARY KEY,
            team_id INT REFERENCES teams(id),
            category TEXT,
            amount NUMERIC(18,2),
            period TEXT
        );

        -- Financial
        CREATE TABLE IF NOT EXISTS budget_vs_actual (
            id SERIAL PRIMARY KEY,
            department TEXT,
            category TEXT,
            budgeted_amount NUMERIC(18,2),
            actual_amount NUMERIC(18,2),
            period TEXT
        );
    """)


def seed_all(cursor):
    from generators.vendors import generate_vendors
    from generators.procurement import (
        generate_purchase_orders, generate_invoices,
        generate_vendor_contracts, generate_market_benchmarks,
    )
    from generators.sla_services import generate_services, generate_sla_metrics, generate_sla_penalties
    from generators.resources import (
        generate_teams, generate_software_tools, generate_servers,
        generate_server_metrics, generate_cost_allocations,
    )
    from generators.financial import generate_budget_vs_actual

    print("Generating vendors...")
    vendors = generate_vendors(cursor, 50)

    print("Generating procurement data...")
    generate_purchase_orders(cursor, vendors, 10000)
    generate_invoices(cursor, vendors, 8000)
    generate_vendor_contracts(cursor, vendors)
    generate_market_benchmarks(cursor)

    print("Generating SLA data...")
    service_count = generate_services(cursor)
    generate_sla_metrics(cursor, service_count)
    generate_sla_penalties(cursor, service_count)

    print("Generating resource data...")
    generate_teams(cursor)
    generate_software_tools(cursor)
    generate_servers(cursor)
    generate_server_metrics(cursor)
    generate_cost_allocations(cursor)

    print("Generating financial data...")
    generate_budget_vs_actual(cursor)


def main():
    print(f"Connecting to: {DATABASE_URL}")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cursor = conn.cursor()

    try:
        # Check if already seeded
        cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vendors')")
        if cursor.fetchone()[0]:
            cursor.execute("SELECT COUNT(*) FROM vendors")
            if cursor.fetchone()[0] > 0:
                print("Database already seeded. Use --force to reseed.")
                if "--force" not in sys.argv:
                    return
                print("Force reseeding...")
                cursor.execute("DROP TABLE IF EXISTS budget_vs_actual, cost_allocations, server_metrics, servers, software_tools, teams, sla_penalties, sla_metrics, services, market_benchmarks, vendor_contracts, invoices, purchase_orders, vendors CASCADE")
                conn.commit()

        print("Creating tables...")
        create_tables(cursor)
        conn.commit()

        print("Seeding data...")
        seed_all(cursor)
        conn.commit()

        print("Done! Database seeded successfully.")

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add synthetic data seeding with vendors, procurement, SLA, resources, and financial data"
```

---

## Phase 5: Angular Dashboard

> **Note:** Phase 5 (Angular Dashboard) is a large task. It should be broken into sub-tasks during execution. The key files and patterns are defined here; the executing agent should scaffold the Angular project first, then build each feature page.

### Task 13: Angular Project Scaffold

- [ ] **Step 1: Create Angular project**

```bash
cd costpilot
npx @angular/cli new dashboard --style=scss --routing --ssr=false --skip-git
cd dashboard
ng add @angular/material --theme=azure-blue --animations=enabled --typography=true
npm install echarts ngx-echarts @microsoft/signalr
```

- [ ] **Step 2: Create core services, types, interceptors, guards** per the file structure

- [ ] **Step 3: Create shared components (metric-card, status-badge, data-table)**

- [ ] **Step 4: Create shell component with sidenav navigation**

- [ ] **Step 5: Create login page**

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: scaffold Angular dashboard with Material, ECharts, SignalR"
```

### Task 14: Executive Dashboard Page

- [ ] **Step 1: Create executive-dashboard component with KPI cards**
- [ ] **Step 2: Create savings-trend-chart component (ECharts line chart)**
- [ ] **Step 3: Create cost-flow-sankey component (ECharts Sankey)**
- [ ] **Step 4: Create agent-status-cards component**
- [ ] **Step 5: Create top-findings-list component**
- [ ] **Step 6: Wire up API service calls and SignalR real-time updates**
- [ ] **Step 7: Commit**

### Task 15: Proposals & Agent Pages

- [ ] **Step 1: Create proposals-list with filterable Material table**
- [ ] **Step 2: Create proposal-detail with approve/reject actions**
- [ ] **Step 3: Create agent-view component (shared across all 4 agent types)**
- [ ] **Step 4: Create agent-activity-timeline component**
- [ ] **Step 5: Commit**

### Task 16: Impact & Data Explorer Pages

- [ ] **Step 1: Create impact-tracking page with savings-treemap and utilization-heatmap**
- [ ] **Step 2: Create data-explorer page to browse synthetic data**
- [ ] **Step 3: Commit**

### Task 17: Dashboard Dockerfile & nginx config

- [ ] **Step 1: Create nginx.conf**

Create `dashboard/nginx.conf`:
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://gateway:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /hubs/ {
        proxy_pass http://gateway:8080/hubs/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

- [ ] **Step 2: Create Dockerfile**

Create `dashboard/Dockerfile`:
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration=production

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/dashboard/browser /usr/share/nginx/html
EXPOSE 80
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add Angular dashboard with all pages, charts, and Docker config"
```

---

## Phase 6: Integration & End-to-End Testing

### Task 18: Full Stack Integration Test

- [ ] **Step 1: Start all services with docker-compose**

```bash
cd costpilot && docker-compose up -d postgres rabbitmq
# Wait for health checks, then:
docker-compose up -d gateway
# Run seed:
cd agents/seed && pip install -e . && python seed_data.py
# Start agents:
docker-compose up -d spend-agent sla-agent resource-agent finops-agent dashboard
```

- [ ] **Step 2: Verify each service is healthy**

```bash
curl http://localhost:5000/health
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health
curl http://localhost:8004/health
curl http://localhost:4200
```

- [ ] **Step 3: Test auth flow**

```bash
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@costpilot.com","password":"admin123"}'
```

Expected: JWT token returned.

- [ ] **Step 4: Trigger agent runs**

```bash
TOKEN="<jwt from step 3>"
curl -X POST http://localhost:5000/api/agents/spend/trigger -H "Authorization: Bearer $TOKEN"
curl -X POST http://localhost:5000/api/agents/sla/trigger -H "Authorization: Bearer $TOKEN"
curl -X POST http://localhost:5000/api/agents/resource/trigger -H "Authorization: Bearer $TOKEN"
curl -X POST http://localhost:5000/api/agents/finops/trigger -H "Authorization: Bearer $TOKEN"
```

- [ ] **Step 5: Verify proposals appeared**

```bash
curl http://localhost:5000/api/proposals -H "Authorization: Bearer $TOKEN"
curl http://localhost:5000/api/dashboard/summary -H "Authorization: Bearer $TOKEN"
```

- [ ] **Step 6: Approve a proposal and verify impact tracking**

```bash
PROPOSAL_ID="<id from proposals list>"
curl -X PUT "http://localhost:5000/api/proposals/$PROPOSAL_ID/approve" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"comment":"Approved for demo"}'
```

- [ ] **Step 7: Open dashboard at http://localhost:4200 and verify all visualizations**

- [ ] **Step 8: Commit any fixes**

```bash
git add -A && git commit -m "fix: integration testing fixes and polish"
```

---

## Verification

### End-to-end test flow:
1. `docker-compose up` — all 8 services start
2. Run seed script — database populated with 30K+ records
3. Navigate to `http://localhost:4200` — Angular dashboard loads
4. Login as `admin@costpilot.com` / `admin123`
5. See executive dashboard with KPIs and charts
6. Trigger agent runs from Agent pages
7. Watch proposals appear in real-time via SignalR
8. Approve proposals — see status change and impact tracking
9. Check correlated findings — cross-agent insights
10. Verify all visualizations: Sankey, heatmaps, treemaps, timelines
11. Check audit trail at `/api/audit`
