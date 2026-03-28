namespace CostPilot.Contracts;
public record AgentAlertRaised
{
    public Guid AlertId { get; init; }
    public string AgentType { get; init; } = default!;
    public string Severity { get; init; } = default!;
    public string Title { get; init; } = default!;
    public string Message { get; init; } = default!;
    public string? DataSnapshot { get; init; }
    public DateTime CreatedAt { get; init; }
}
