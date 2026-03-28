namespace CostPilot.Gateway.Infrastructure.Data.Configurations;
using CostPilot.Gateway.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
public class ActionProposalConfiguration : IEntityTypeConfiguration<ActionProposal>
{
    public void Configure(EntityTypeBuilder<ActionProposal> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(p => p.AgentType).HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.Title).HasMaxLength(500).IsRequired();
        builder.Property(p => p.Description).IsRequired();
        builder.Property(p => p.EstimatedSavings).HasPrecision(18, 2);
        builder.Property(p => p.RiskLevel).HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.Evidence).HasColumnType("jsonb");
        builder.Property(p => p.ExecutionResult).HasColumnType("jsonb");
        builder.Property(p => p.CreatedAt).HasDefaultValueSql("now()");
        builder.HasOne(p => p.Approver).WithMany().HasForeignKey(p => p.ApprovedBy).IsRequired(false);
        builder.HasIndex(p => p.Status);
        builder.HasIndex(p => p.AgentType);
    }
}
