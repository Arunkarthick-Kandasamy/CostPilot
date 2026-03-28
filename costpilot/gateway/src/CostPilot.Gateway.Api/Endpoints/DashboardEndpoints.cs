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

            var topFindings = await db.CorrelatedFindings
                .OrderByDescending(f => f.CombinedImpact)
                .Take(5)
                .Select(f => new { f.Id, f.Summary, f.CombinedImpact, f.Confidence, f.AgentsInvolved, f.CreatedAt })
                .ToListAsync();

            var savingsByAgent = await db.ActionProposals
                .GroupBy(p => p.AgentType)
                .Select(g => new { Agent = g.Key.ToString(), Identified = g.Sum(p => p.EstimatedSavings) })
                .ToListAsync();

            var recentAlerts = await db.AgentAlerts
                .OrderByDescending(a => a.CreatedAt)
                .Take(10)
                .Select(a => new { a.Id, AgentType = a.AgentType.ToString(), Severity = a.Severity.ToString(), a.Title, a.CreatedAt, a.Acknowledged })
                .ToListAsync();

            return Results.Ok(new
            {
                totalIdentified, totalRealized, pendingCount, executedCount,
                topFindings, savingsByAgent, recentAlerts
            });
        });

        group.MapGet("/savings-trend", async (CostPilotDbContext db) =>
        {
            var trend = await db.CostImpacts
                .GroupBy(i => new { i.MeasurementPeriodStart.Year, i.MeasurementPeriodStart.Month })
                .Select(g => new
                {
                    g.Key.Year, g.Key.Month,
                    TotalSavings = g.Sum(i => i.ActualSavings),
                    Count = g.Count()
                })
                .OrderBy(t => t.Year).ThenBy(t => t.Month)
                .ToListAsync();

            return Results.Ok(trend);
        });
    }
}
