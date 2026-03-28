namespace CostPilot.Gateway.Domain.Entities;
using CostPilot.Gateway.Domain.Enums;
public class AgentInsight
{
    public Guid Id { get; set; }
    public AgentType SourceAgent { get; set; }
    public string InsightType { get; set; } = default!;
    public string EntityType { get; set; } = default!;
    public string EntityId { get; set; } = default!;
    public string Summary { get; set; } = default!;
    public decimal FinancialImpact { get; set; }
    public decimal Confidence { get; set; }
    public string? RelatedData { get; set; }
    public DateTime CreatedAt { get; set; }
}
