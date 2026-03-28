namespace CostPilot.Contracts;
public record ProposalExecuted
{
    public Guid ProposalId { get; init; }
    public bool Success { get; init; }
    public string? Result { get; init; }
    public decimal? ActualSavings { get; init; }
    public DateTime ExecutedAt { get; init; }
}
