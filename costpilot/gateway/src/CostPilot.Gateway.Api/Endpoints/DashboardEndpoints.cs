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
            var totalSavingsIdentified = await db.ActionProposals.SumAsync(p => p.EstimatedSavings);
            var totalSavingsRealized = await db.CostImpacts.SumAsync(i => i.ActualSavings);
            var pendingProposals = await db.ActionProposals.CountAsync(p => p.Status == ProposalStatus.Pending);
            var executedProposals = await db.ActionProposals.CountAsync(p => p.Status == ProposalStatus.Executed);

            var topFindings = await db.ActionProposals
                .OrderByDescending(p => p.EstimatedSavings)
                .Take(10)
                .Select(p => new
                {
                    p.Id,
                    p.Title,
                    AgentType = p.AgentType.ToString(),
                    p.EstimatedSavings,
                    RiskLevel = p.RiskLevel.ToString(),
                    Status = p.Status.ToString()
                })
                .ToListAsync();

            var savingsByAgent = await db.ActionProposals
                .GroupBy(p => p.AgentType)
                .Select(g => new
                {
                    AgentType = g.Key.ToString(),
                    TotalSavings = g.Sum(p => p.EstimatedSavings),
                    Count = g.Count()
                })
                .ToListAsync();

            var recentAlerts = await db.AgentAlerts
                .Where(a => !a.Acknowledged)
                .OrderByDescending(a => a.CreatedAt)
                .Take(5)
                .Select(a => new
                {
                    a.Id,
                    AgentType = a.AgentType.ToString(),
                    Severity = a.Severity.ToString(),
                    a.Title,
                    a.Message,
                    a.CreatedAt
                })
                .ToListAsync();

            return Results.Ok(new
            {
                totalSavingsIdentified,
                totalSavingsRealized,
                pendingProposals,
                executedProposals,
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
                    g.Key.Year,
                    g.Key.Month,
                    Identified = g.Sum(p => p.EstimatedSavings),
                    Count = g.Count()
                })
                .OrderBy(g => g.Year).ThenBy(g => g.Month)
                .ToListAsync();

            return Results.Ok(trend);
        });
    }
}
