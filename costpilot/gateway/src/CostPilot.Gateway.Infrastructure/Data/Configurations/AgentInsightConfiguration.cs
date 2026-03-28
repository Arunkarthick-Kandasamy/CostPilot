namespace CostPilot.Gateway.Infrastructure.Data.Configurations;
using CostPilot.Gateway.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
public class AgentInsightConfiguration : IEntityTypeConfiguration<AgentInsight>
{
    public void Configure(EntityTypeBuilder<AgentInsight> builder)
    {
        builder.HasKey(i => i.Id);
        builder.Property(i => i.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(i => i.SourceAgent).HasConversion<string>().HasMaxLength(20);
        builder.Property(i => i.InsightType).HasMaxLength(100).IsRequired();
        builder.Property(i => i.EntityType).HasMaxLength(100).IsRequired();
        builder.Property(i => i.EntityId).HasMaxLength(200).IsRequired();
        builder.Property(i => i.Summary).IsRequired();
        builder.Property(i => i.FinancialImpact).HasPrecision(18, 2);
        builder.Property(i => i.Confidence).HasPrecision(5, 4);
        builder.Property(i => i.RelatedData).HasColumnType("jsonb");
        builder.Property(i => i.CreatedAt).HasDefaultValueSql("now()");
        builder.HasIndex(i => i.SourceAgent);
        builder.HasIndex(i => new { i.EntityType, i.EntityId });
    }
}
