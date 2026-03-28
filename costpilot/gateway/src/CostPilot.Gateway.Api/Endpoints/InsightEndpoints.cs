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
                .Select(i => new
                {
                    i.Id, SourceAgent = i.SourceAgent.ToString(), i.InsightType,
                    i.EntityType, i.EntityId, i.Summary, i.FinancialImpact,
                    i.Confidence, i.CreatedAt
                }).ToListAsync();

            return Results.Ok(insights);
        });

        group.MapGet("/correlated", async (CostPilotDbContext db) =>
        {
            var findings = await db.CorrelatedFindings
                .OrderByDescending(f => f.CombinedImpact)
                .Take(50)
                .Select(f => new
                {
                    f.Id, f.InsightIds, f.AgentsInvolved, f.Summary,
                    f.CombinedImpact, f.Confidence, f.CreatedAt
                }).ToListAsync();

            return Results.Ok(findings);
        });
    }
}
