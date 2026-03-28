namespace CostPilot.Contracts;
public record TriggerAgentRun
{
    public string AgentType { get; init; } = default!;
    public string? Scope { get; init; }
    public DateTime RequestedAt { get; init; }
}
