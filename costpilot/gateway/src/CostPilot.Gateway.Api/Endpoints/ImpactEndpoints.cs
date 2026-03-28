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
                .Select(i => new
                {
                    i.Id, i.ProposalId, ProposalTitle = i.Proposal.Title,
                    i.ActualSavings, i.MeasurementPeriodStart, i.MeasurementPeriodEnd,
                    i.RecordedAt
                }).ToListAsync();

            return Results.Ok(impacts);
        });

        group.MapGet("/summary", async (CostPilotDbContext db) =>
        {
            var totalRealized = await db.CostImpacts.SumAsync(i => i.ActualSavings);

            var byMonth = await db.CostImpacts
                .GroupBy(i => new { i.MeasurementPeriodStart.Year, i.MeasurementPeriodStart.Month })
                .Select(g => new
                {
                    g.Key.Year, g.Key.Month,
                    TotalSavings = g.Sum(i => i.ActualSavings),
                    Count = g.Count()
                })
                .OrderBy(t => t.Year).ThenBy(t => t.Month)
                .ToListAsync();

            return Results.Ok(new { totalRealized, byMonth });
        });
    }
}
