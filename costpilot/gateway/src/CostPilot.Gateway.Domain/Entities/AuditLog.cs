namespace CostPilot.Gateway.Domain.Entities;
public class AuditLog
{
    public Guid Id { get; set; }
    public string EntityType { get; set; } = default!;
    public Guid EntityId { get; set; }
    public string Action { get; set; } = default!;
    public Guid? UserId { get; set; }
    public string? Details { get; set; }
    public DateTime Timestamp { get; set; }
}
