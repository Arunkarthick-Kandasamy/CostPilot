namespace CostPilot.Gateway.Api.Endpoints;

using CostPilot.Gateway.Api.Services;
using CostPilot.Gateway.Domain.Entities;
using CostPilot.Gateway.Domain.Enums;
using CostPilot.Gateway.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

public record LoginRequest(string Email, string Password);
public record LoginResponse(string Token, string Email, string Name, string Role);
public record RegisterRequest(string Email, string Password, string Name);

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/login", async (LoginRequest req, CostPilotDbContext db, TokenService tokenService) =>
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email);
            if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
                return Results.Unauthorized();

            var token = tokenService.GenerateToken(user.Id, user.Email, user.Role.ToString());
            return Results.Ok(new LoginResponse(token, user.Email, user.Name, user.Role.ToString()));
        }).AllowAnonymous();

        group.MapPost("/register", async (RegisterRequest req, CostPilotDbContext db, TokenService tokenService) =>
        {
            if (await db.Users.AnyAsync(u => u.Email == req.Email))
                return Results.Conflict(new { message = "Email already registered" });

            var user = new User
            {
                Email = req.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
                Name = req.Name,
                Role = UserRole.Viewer,
                CreatedAt = DateTime.UtcNow
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();

            var token = tokenService.GenerateToken(user.Id, user.Email, user.Role.ToString());
            return Results.Ok(new LoginResponse(token, user.Email, user.Name, user.Role.ToString()));
        }).AllowAnonymous();
    }
}
