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
            if (!Enum.TryParse<AgentType>(type, true, out var agentType))
                return Results.BadRequest(new { message = "Invalid agent type" });

            var proposalCount = await db.ActionProposals.CountAsync(p => p.AgentType == agentType);
            var pendingCount = await db.ActionProposals.CountAsync(p => p.AgentType == agentType && p.Status == ProposalStatus.Pending);
            var totalSavings = await db.ActionProposals.Where(p => p.AgentType == agentType).SumAsync(p => p.EstimatedSavings);
            var alertCount = await db.AgentAlerts.CountAsync(a => a.AgentType == agentType && !a.Acknowledged);
            var lastInsight = await db.AgentInsights.Where(i => i.SourceAgent == agentType)
                .OrderByDescending(i => i.CreatedAt).Select(i => i.CreatedAt).FirstOrDefaultAsync();

            return Results.Ok(new
            {
                agentType = agentType.ToString(), proposalCount, pendingCount,
                totalSavings, unacknowledgedAlerts = alertCount, lastInsightAt = lastInsight
            });
        });

        group.MapPost("/{type}/trigger", async (string type, IPublishEndpoint bus) =>
        {
            if (!Enum.TryParse<AgentType>(type, true, out _))
                return Results.BadRequest(new { message = "Invalid agent type" });

            await bus.Publish(new TriggerAgentRun
            {
                AgentType = type,
                RequestedAt = DateTime.UtcNow
            });

            return Results.Accepted(value: new { message = $"Agent run triggered for {type}" });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        group.MapGet("/{type}/alerts", async (string type, CostPilotDbContext db, bool? acknowledged = null) =>
        {
            if (!Enum.TryParse<AgentType>(type, true, out var agentType))
                return Results.BadRequest(new { message = "Invalid agent type" });

            var query = db.AgentAlerts.Where(a => a.AgentType == agentType);
            if (acknowledged.HasValue)
                query = query.Where(a => a.Acknowledged == acknowledged.Value);

            var alerts = await query.OrderByDescending(a => a.CreatedAt)
                .Take(50)
                .Select(a => new
                {
                    a.Id, AgentType = a.AgentType.ToString(), Severity = a.Severity.ToString(),
                    a.Title, a.Message, a.Acknowledged, a.CreatedAt
                }).ToListAsync();

            return Results.Ok(alerts);
        });
    }
}
