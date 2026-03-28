namespace CostPilot.Gateway.Infrastructure.Data.Configurations;
using CostPilot.Gateway.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
public class CostImpactConfiguration : IEntityTypeConfiguration<CostImpact>
{
    public void Configure(EntityTypeBuilder<CostImpact> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(c => c.ActualSavings).HasPrecision(18, 2);
        builder.Property(c => c.Evidence).HasColumnType("jsonb");
        builder.Property(c => c.RecordedAt).HasDefaultValueSql("now()");
        builder.HasOne(c => c.Proposal).WithMany(p => p.Impacts).HasForeignKey(c => c.ProposalId);
    }
}
