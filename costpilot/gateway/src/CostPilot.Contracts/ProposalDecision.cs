namespace CostPilot.Contracts;
public record ProposalDecision
{
    public Guid ProposalId { get; init; }
    public string Status { get; init; } = default!;
    public Guid? ApprovedBy { get; init; }
    public string? Comment { get; init; }
    public DateTime DecidedAt { get; init; }
}
