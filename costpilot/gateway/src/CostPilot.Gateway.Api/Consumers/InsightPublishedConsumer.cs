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
        logger.LogInformation("Received Insight: {Type} from {Agent} on {Entity}", msg.InsightType, msg.SourceAgent, msg.EntityId);

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
                correlated.Id,
                correlated.AgentsInvolved,
                correlated.Summary,
                correlated.CombinedImpact,
                correlated.Confidence,
                correlated.CreatedAt
            });
        }
    }
}
