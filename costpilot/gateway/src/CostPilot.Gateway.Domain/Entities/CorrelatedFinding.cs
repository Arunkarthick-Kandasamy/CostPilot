namespace CostPilot.Gateway.Domain.Entities;
public class CorrelatedFinding
{
    public Guid Id { get; set; }
    public List<Guid> InsightIds { get; set; } = [];
    public List<string> AgentsInvolved { get; set; } = [];
    public string Summary { get; set; } = default!;
    public decimal CombinedImpact { get; set; }
    public decimal Confidence { get; set; }
    public DateTime CreatedAt { get; set; }
}
