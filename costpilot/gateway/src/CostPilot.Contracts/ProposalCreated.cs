namespace CostPilot.Contracts;
public record ProposalCreated
{
    public Guid ProposalId { get; init; }
    public string AgentType { get; init; } = default!;
    public string Title { get; init; } = default!;
    public string Description { get; init; } = default!;
    public decimal EstimatedSavings { get; init; }
    public string RiskLevel { get; init; } = default!;
    public string? Evidence { get; init; }
    public DateTime CreatedAt { get; init; }
}
