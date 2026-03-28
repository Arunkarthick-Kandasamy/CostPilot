namespace CostPilot.Gateway.Domain.Entities;
using CostPilot.Gateway.Domain.Enums;
public class ActionProposal
{
    public Guid Id { get; set; }
    public AgentType AgentType { get; set; }
    public string Title { get; set; } = default!;
    public string Description { get; set; } = default!;
    public decimal EstimatedSavings { get; set; }
    public RiskLevel RiskLevel { get; set; }
    public ProposalStatus Status { get; set; }
    public string? Evidence { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? ExecutedAt { get; set; }
    public string? ExecutionResult { get; set; }
    public User? Approver { get; set; }
    public List<CostImpact> Impacts { get; set; } = [];
}
