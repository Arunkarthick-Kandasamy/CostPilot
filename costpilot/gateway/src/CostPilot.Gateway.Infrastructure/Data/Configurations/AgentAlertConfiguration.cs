namespace CostPilot.Gateway.Infrastructure.Data.Configurations;
using CostPilot.Gateway.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
public class AgentAlertConfiguration : IEntityTypeConfiguration<AgentAlert>
{
    public void Configure(EntityTypeBuilder<AgentAlert> builder)
    {
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(a => a.AgentType).HasConversion<string>().HasMaxLength(20);
        builder.Property(a => a.Severity).HasConversion<string>().HasMaxLength(20);
        builder.Property(a => a.Title).HasMaxLength(500).IsRequired();
        builder.Property(a => a.Message).IsRequired();
        builder.Property(a => a.DataSnapshot).HasColumnType("jsonb");
        builder.Property(a => a.CreatedAt).HasDefaultValueSql("now()");
        builder.HasIndex(a => a.AgentType);
        builder.HasIndex(a => a.Acknowledged);
    }
}
