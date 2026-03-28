namespace CostPilot.Gateway.Domain.Entities;
using CostPilot.Gateway.Domain.Enums;
public class AgentAlert
{
    public Guid Id { get; set; }
    public AgentType AgentType { get; set; }
    public Severity Severity { get; set; }
    public string Title { get; set; } = default!;
    public string Message { get; set; } = default!;
    public string? DataSnapshot { get; set; }
    public bool Acknowledged { get; set; }
    public DateTime CreatedAt { get; set; }
}
