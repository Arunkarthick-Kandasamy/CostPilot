namespace CostPilot.Gateway.Api.Endpoints;

using System.Security.Claims;
using CostPilot.Contracts;
using CostPilot.Gateway.Domain.Entities;
using CostPilot.Gateway.Domain.Enums;
using CostPilot.Gateway.Infrastructure.Data;
using MassTransit;
using Microsoft.EntityFrameworkCore;

public static class ProposalEndpoints
{
    public static void MapProposalEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/proposals").WithTags("Proposals").RequireAuthorization();

        group.MapGet("/", async (CostPilotDbContext db, int page = 1, int size = 20, string? status = null, string? agent = null) =>
        {
            var query = db.ActionProposals.AsQueryable();
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<ProposalStatus>(status, true, out var s))
                query = query.Where(p => p.Status == s);
            if (!string.IsNullOrEmpty(agent) && Enum.TryParse<AgentType>(agent, true, out var a))
                query = query.Where(p => p.AgentType == a);

            var total = await query.CountAsync();
            var items = await query.OrderByDescending(p => p.CreatedAt)
                .Skip((page - 1) * size).Take(size)
                .Select(p => new
                {
                    p.Id, AgentType = p.AgentType.ToString(), p.Title, p.Description,
                    p.EstimatedSavings, RiskLevel = p.RiskLevel.ToString(),
                    Status = p.Status.ToString(), p.CreatedAt, p.ApprovedAt, p.ExecutedAt
                }).ToListAsync();

            return Results.Ok(new { items, total, page, size });
        });

        group.MapGet("/{id:guid}", async (Guid id, CostPilotDbContext db) =>
        {
            var p = await db.ActionProposals.Include(x => x.Impacts).Include(x => x.Approver)
                .FirstOrDefaultAsync(x => x.Id == id);
            if (p is null) return Results.NotFound();
            return Results.Ok(new
            {
                p.Id, AgentType = p.AgentType.ToString(), p.Title, p.Description,
                p.EstimatedSavings, RiskLevel = p.RiskLevel.ToString(),
                Status = p.Status.ToString(), p.Evidence, p.CreatedAt, p.ApprovedAt,
                p.ApprovedBy, ApproverName = p.Approver?.Name, p.ExecutedAt, p.ExecutionResult,
                Impacts = p.Impacts.Select(i => new { i.Id, i.ActualSavings, i.MeasurementPeriodStart, i.MeasurementPeriodEnd, i.RecordedAt })
            });
        });

        group.MapPut("/{id:guid}/approve", async (Guid id, CostPilotDbContext db, IPublishEndpoint bus, ClaimsPrincipal user) =>
        {
            var proposal = await db.ActionProposals.FindAsync(id);
            if (proposal is null) return Results.NotFound();
            if (proposal.Status != ProposalStatus.Pending)
                return Results.BadRequest(new { message = "Proposal is not pending" });

            var userId = Guid.Parse(user.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)!);
            proposal.Status = ProposalStatus.Approved;
            proposal.ApprovedBy = userId;
            proposal.ApprovedAt = DateTime.UtcNow;

            db.AuditLogs.Add(new AuditLog
            {
                EntityType = "ActionProposal", EntityId = id, Action = "Approved",
                UserId = userId, Timestamp = DateTime.UtcNow
            });

            await db.SaveChangesAsync();
            await bus.Publish(new ProposalDecision
            {
                ProposalId = id, Status = "Approved", ApprovedBy = userId, DecidedAt = DateTime.UtcNow
            });

            return Results.Ok(new { message = "Proposal approved" });
        }).RequireAuthorization(policy => policy.RequireRole("Admin", "Approver"));

        group.MapPut("/{id:guid}/reject", async (Guid id, CostPilotDbContext db, IPublishEndpoint bus, ClaimsPrincipal user) =>
        {
            var proposal = await db.ActionProposals.FindAsync(id);
            if (proposal is null) return Results.NotFound();
            if (proposal.Status != ProposalStatus.Pending)
                return Results.BadRequest(new { message = "Proposal is not pending" });

            var userId = Guid.Parse(user.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)!);
            proposal.Status = ProposalStatus.Rejected;
            proposal.ApprovedBy = userId;
            proposal.ApprovedAt = DateTime.UtcNow;

            db.AuditLogs.Add(new AuditLog
            {
                EntityType = "ActionProposal", EntityId = id, Action = "Rejected",
                UserId = userId, Timestamp = DateTime.UtcNow
            });

            await db.SaveChangesAsync();
            await bus.Publish(new ProposalDecision
            {
                ProposalId = id, Status = "Rejected", ApprovedBy = userId, DecidedAt = DateTime.UtcNow
            });

            return Results.Ok(new { message = "Proposal rejected" });
        }).RequireAuthorization(policy => policy.RequireRole("Admin", "Approver"));
    }
}
