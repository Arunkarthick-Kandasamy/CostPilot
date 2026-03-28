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
        logger.LogInformation("Received ProposalExecuted: {ProposalId} Success={Success}", msg.ProposalId, msg.Success);

        var proposal = await db.ActionProposals.FindAsync(msg.ProposalId);
        if (proposal is null)
        {
            logger.LogWarning("Proposal {ProposalId} not found", msg.ProposalId);
            return;
        }

        proposal.Status = msg.Success ? ProposalStatus.Executed : ProposalStatus.Failed;
        proposal.ExecutedAt = msg.ExecutedAt;
        proposal.ExecutionResult = msg.Result;

        if (msg.Success && msg.ActualSavings.HasValue)
        {
            var impact = new CostImpact
            {
                ProposalId = msg.ProposalId,
                ActualSavings = msg.ActualSavings.Value,
                MeasurementPeriodStart = DateOnly.FromDateTime(msg.ExecutedAt),
                MeasurementPeriodEnd = DateOnly.FromDateTime(msg.ExecutedAt.AddMonths(1)),
                Evidence = msg.Result,
                RecordedAt = DateTime.UtcNow
            };
            db.CostImpacts.Add(impact);
        }

        await db.SaveChangesAsync();

        await hub.Clients.Group("dashboard").SendAsync("ProposalExecuted", new
        {
            proposal.Id,
            AgentType = proposal.AgentType.ToString(),
            proposal.Title,
            Status = proposal.Status.ToString(),
            msg.ActualSavings,
            msg.ExecutedAt
        });
    }
}
