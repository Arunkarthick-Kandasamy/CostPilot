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
        var relatedInsights = await db.AgentInsights
            .Where(i => i.Id != newInsight.Id)
            .Where(i => i.SourceAgent != newInsight.SourceAgent)
            .Where(i => i.CreatedAt >= windowStart)
            .Where(i => (i.EntityId == newInsight.EntityId && i.EntityType == newInsight.EntityType) ||
                (i.EntityType == newInsight.EntityType && i.InsightType != newInsight.InsightType))
            .ToListAsync();
        if (relatedInsights.Count == 0) return null;
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
            AgentsInvolved = agents, Summary = summary,
            CombinedImpact = combinedImpact, Confidence = confidence,
            CreatedAt = DateTime.UtcNow
        };
        db.CorrelatedFindings.Add(finding);
        await db.SaveChangesAsync();
        logger.LogInformation("Correlated finding: {Summary} (${Impact})", summary, combinedImpact);
        return finding;
    }
}
