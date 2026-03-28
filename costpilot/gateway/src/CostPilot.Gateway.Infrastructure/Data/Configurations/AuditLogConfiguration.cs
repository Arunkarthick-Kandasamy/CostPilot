namespace CostPilot.Gateway.Infrastructure.Data.Configurations;
using CostPilot.Gateway.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(a => a.EntityType).HasMaxLength(100).IsRequired();
        builder.Property(a => a.Action).HasMaxLength(100).IsRequired();
        builder.Property(a => a.Details).HasColumnType("jsonb");
        builder.Property(a => a.Timestamp).HasDefaultValueSql("now()");
        builder.HasIndex(a => new { a.EntityType, a.EntityId });
    }
}
