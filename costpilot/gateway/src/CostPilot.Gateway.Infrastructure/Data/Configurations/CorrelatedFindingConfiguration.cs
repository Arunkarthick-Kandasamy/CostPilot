namespace CostPilot.Gateway.Infrastructure.Data.Configurations;
using CostPilot.Gateway.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
public class CorrelatedFindingConfiguration : IEntityTypeConfiguration<CorrelatedFinding>
{
    public void Configure(EntityTypeBuilder<CorrelatedFinding> builder)
    {
        builder.HasKey(f => f.Id);
        builder.Property(f => f.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(f => f.Summary).IsRequired();
        builder.Property(f => f.CombinedImpact).HasPrecision(18, 2);
        builder.Property(f => f.Confidence).HasPrecision(5, 4);
        builder.Property(f => f.CreatedAt).HasDefaultValueSql("now()");
    }
}
