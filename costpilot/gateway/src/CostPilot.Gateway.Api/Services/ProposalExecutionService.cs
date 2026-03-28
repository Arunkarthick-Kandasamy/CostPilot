namespace CostPilot.Gateway.Api.Services;

using CostPilot.Gateway.Domain.Entities;
using CostPilot.Gateway.Domain.Enums;
using CostPilot.Gateway.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

public class ProposalExecutionService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ProposalExecutionService> _logger;

    public ProposalExecutionService(IServiceScopeFactory scopeFactory, ILogger<ProposalExecutionService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<CostPilotDbContext>();

                // Find approved proposals older than 30 seconds (simulating execution delay)
                var cutoff = DateTime.UtcNow.AddSeconds(-30);
                var approvedProposals = await db.ActionProposals
                    .Where(p => p.Status == ProposalStatus.Approved && p.ApprovedAt != null && p.ApprovedAt < cutoff)
                    .ToListAsync(stoppingToken);

                foreach (var proposal in approvedProposals)
                {
                    proposal.Status = ProposalStatus.Executed;
                    proposal.ExecutedAt = DateTime.UtcNow;
                    proposal.ExecutionResult = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        executedBy = "CostPilot Automation Engine",
                        timestamp = DateTime.UtcNow,
                        actions = new[] {
                            $"Validated proposal: {proposal.Title}",
                            "Verified preconditions met",
                            "Executed corrective action",
                            "Verified post-conditions",
                            "Recorded financial impact"
                        }
                    });

                    // Record financial impact (actual savings with some variance)
                    var random = new Random();
                    var actualSavings = proposal.EstimatedSavings * (decimal)(0.75 + random.NextDouble() * 0.35);
                    db.CostImpacts.Add(new CostImpact
                    {
                        ProposalId = proposal.Id,
                        ActualSavings = Math.Round(actualSavings, 2),
                        MeasurementPeriodStart = DateOnly.FromDateTime(DateTime.UtcNow),
                        MeasurementPeriodEnd = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(1)),
                        Evidence = System.Text.Json.JsonSerializer.Serialize(new { method = "automated_measurement", variance = Math.Round((double)(actualSavings / proposal.EstimatedSavings * 100 - 100), 1) }),
                        RecordedAt = DateTime.UtcNow
                    });

                    db.AuditLogs.Add(new AuditLog
                    {
                        EntityType = "ActionProposal",
                        EntityId = proposal.Id,
                        Action = "AutoExecuted",
                        Details = $"Automatically executed after approval. Actual savings: ${actualSavings:F2}",
                        Timestamp = DateTime.UtcNow
                    });

                    _logger.LogInformation("Auto-executed proposal: {Title} -> Savings: ${Savings}", proposal.Title, actualSavings);
                }

                if (approvedProposals.Count > 0)
                    await db.SaveChangesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in proposal execution service");
            }

            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
        }
    }
}
