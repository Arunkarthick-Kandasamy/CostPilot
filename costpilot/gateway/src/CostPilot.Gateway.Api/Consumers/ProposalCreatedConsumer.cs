namespace CostPilot.Gateway.Api.Consumers;

using CostPilot.Contracts;
using CostPilot.Gateway.Api.Hubs;
using CostPilot.Gateway.Domain.Entities;
using CostPilot.Gateway.Domain.Enums;
using CostPilot.Gateway.Infrastructure.Data;
using MassTransit;
using Microsoft.AspNetCore.SignalR;

public class ProposalCreatedConsumer(
    CostPilotDbContext db,
    IHubContext<NotificationHub> hub,
    ILogger<ProposalCreatedConsumer> logger) : IConsumer<ProposalCreated>
{
    public async Task Consume(ConsumeContext<ProposalCreated> context)
    {
        var msg = context.Message;
        logger.LogInformation("Received ProposalCreated: {Title} from {Agent}", msg.Title, msg.AgentType);

        var proposal = new ActionProposal
        {
            Id = msg.ProposalId,
            AgentType = Enum.Parse<AgentType>(msg.AgentType, true),
            Title = msg.Title,
            Description = msg.Description,
            EstimatedSavings = msg.EstimatedSavings,
            RiskLevel = Enum.Parse<RiskLevel>(msg.RiskLevel, true),
            Status = ProposalStatus.Pending,
            Evidence = msg.Evidence,
            CreatedAt = msg.CreatedAt
        };

        db.ActionProposals.Add(proposal);
        await db.SaveChangesAsync();

        await hub.Clients.Group("dashboard").SendAsync("NewProposal", new
        {
            proposal.Id,
            AgentType = proposal.AgentType.ToString(),
            proposal.Title,
            proposal.EstimatedSavings,
            RiskLevel = proposal.RiskLevel.ToString(),
            proposal.CreatedAt
        });
    }
}
