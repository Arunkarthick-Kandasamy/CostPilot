namespace CostPilot.Gateway.Domain.Entities;
using CostPilot.Gateway.Domain.Enums;
public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = default!;
    public string PasswordHash { get; set; } = default!;
    public string Name { get; set; } = default!;
    public UserRole Role { get; set; }
    public DateTime CreatedAt { get; set; }
}
