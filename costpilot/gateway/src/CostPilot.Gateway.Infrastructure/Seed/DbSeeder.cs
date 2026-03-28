namespace CostPilot.Gateway.Infrastructure.Seed;
using CostPilot.Gateway.Domain.Entities;
using CostPilot.Gateway.Domain.Enums;
using CostPilot.Gateway.Infrastructure.Data;
public static class DbSeeder
{
    public static async Task SeedAsync(CostPilotDbContext db)
    {
        if (db.Users.Any()) return;
        db.Users.AddRange(
            new User { Id = Guid.Parse("11111111-1111-1111-1111-111111111111"), Email = "admin@costpilot.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"), Name = "Admin User", Role = UserRole.Admin, CreatedAt = DateTime.UtcNow },
            new User { Id = Guid.Parse("22222222-2222-2222-2222-222222222222"), Email = "approver@costpilot.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("approver123"), Name = "Finance Approver", Role = UserRole.Approver, CreatedAt = DateTime.UtcNow },
            new User { Id = Guid.Parse("33333333-3333-3333-3333-333333333333"), Email = "viewer@costpilot.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("viewer123"), Name = "Dashboard Viewer", Role = UserRole.Viewer, CreatedAt = DateTime.UtcNow }
        );
        await db.SaveChangesAsync();
    }
}
