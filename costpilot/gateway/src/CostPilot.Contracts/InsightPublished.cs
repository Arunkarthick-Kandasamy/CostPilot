namespace CostPilot.Contracts;
public record InsightPublished
{
    public Guid InsightId { get; init; }
    public string SourceAgent { get; init; } = default!;
    public string InsightType { get; init; } = default!;
    public string EntityType { get; init; } = default!;
    public string EntityId { get; init; } = default!;
    public string Summary { get; init; } = default!;
    public decimal FinancialImpact { get; init; }
    public decimal Confidence { get; init; }
    public string? RelatedData { get; init; }
    public DateTime CreatedAt { get; init; }
}
