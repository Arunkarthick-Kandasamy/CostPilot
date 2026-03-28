namespace CostPilot.Gateway.Api.Consumers;

using CostPilot.Contracts;
using CostPilot.Gateway.Api.Hubs;
using CostPilot.Gateway.Domain.Entities;
using CostPilot.Gateway.Domain.Enums;
using CostPilot.Gateway.Infrastructure.Data;
using MassTransit;
using Microsoft.AspNetCore.SignalR;

public class AgentAlertConsumer(
    CostPilotDbContext db,
    IHubContext<NotificationHub> hub,
    ILogger<AgentAlertConsumer> logger) : IConsumer<AgentAlertRaised>
{
    public async Task Consume(ConsumeContext<AgentAlertRaised> context)
    {
        var msg = context.Message;
        logger.LogInformation("Received AgentAlert: {Title} from {Agent} [{Severity}]", msg.Title, msg.AgentType, msg.Severity);

        var alert = new AgentAlert
        {
            Id = msg.AlertId,
            AgentType = Enum.Parse<AgentType>(msg.AgentType, true),
            Severity = Enum.Parse<Severity>(msg.Severity, true),
            Title = msg.Title,
            Message = msg.Message,
            DataSnapshot = msg.DataSnapshot,
            Acknowledged = false,
            CreatedAt = msg.CreatedAt
        };

        db.AgentAlerts.Add(alert);
        await db.SaveChangesAsync();

        await hub.Clients.Group("dashboard").SendAsync("NewAlert", new
        {
            alert.Id,
            AgentType = alert.AgentType.ToString(),
            Severity = alert.Severity.ToString(),
            alert.Title,
            alert.Message,
            alert.CreatedAt
        });
    }
}
