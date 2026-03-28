namespace CostPilot.Gateway.Api.Endpoints;

using CostPilot.Gateway.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

public static class AuditEndpoints
{
    public static void MapAuditEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/audit").WithTags("Audit").RequireAuthorization();

        group.MapGet("/", async (CostPilotDbContext db, int page = 1, int size = 50) =>
        {
            var total = await db.AuditLogs.CountAsync();
            var items = await db.AuditLogs
                .OrderByDescending(a => a.Timestamp)
                .Skip((page - 1) * size).Take(size)
                .Select(a => new { a.Id, a.EntityType, a.EntityId, a.Action, a.UserId, a.Details, a.Timestamp })
                .ToListAsync();
            return Results.Ok(new { total, page, size, items });
        });
    }
}
