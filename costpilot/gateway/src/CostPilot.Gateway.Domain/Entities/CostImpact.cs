namespace CostPilot.Gateway.Domain.Entities;
public class CostImpact
{
    public Guid Id { get; set; }
    public Guid ProposalId { get; set; }
    public decimal ActualSavings { get; set; }
    public DateOnly MeasurementPeriodStart { get; set; }
    public DateOnly MeasurementPeriodEnd { get; set; }
    public string? Evidence { get; set; }
    public DateTime RecordedAt { get; set; }
    public ActionProposal Proposal { get; set; } = default!;
}
