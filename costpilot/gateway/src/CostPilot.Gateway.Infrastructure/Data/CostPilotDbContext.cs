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
