using System.Text;
using CostPilot.Gateway.Api.Endpoints;
using CostPilot.Gateway.Api.Hubs;
using CostPilot.Gateway.Api.Services;
using CostPilot.Gateway.Infrastructure.Data;
using MassTransit;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "CostPilot API", Version = "v1", Description = "Enterprise Cost Intelligence API" });
});

// JWT Settings
var jwtSettings = builder.Configuration.GetSection("JwtSettings").Get<JwtSettings>()
    ?? new JwtSettings { Secret = "DevFallbackKeyThatIsAtLeast32BytesLong!!", Issuer = "CostPilot", Audience = "CostPilotClients" };
builder.Services.AddSingleton(jwtSettings);
builder.Services.AddScoped<TokenService>();

// Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true,
            ValidateIssuerSigningKey = true, ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
            ClockSkew = TimeSpan.Zero
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken) && context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                    context.Token = accessToken;
                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddAuthorization();

// Database
builder.Services.AddDbContextPool<CostPilotDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("CostPilotDb") ?? "Host=localhost;Database=costpilot;Username=costpilot;Password=costpilot_dev",
        o => o.EnableRetryOnFailure(3)));

// MassTransit + RabbitMQ
builder.Services.AddMassTransit(x =>
{
    x.AddConsumers(typeof(Program).Assembly);
    x.UsingRabbitMq((context, cfg) =>
    {
        var rabbitHost = builder.Configuration["RabbitMq:Host"] ?? "localhost";
        var rabbitUser = builder.Configuration["RabbitMq:Username"] ?? "guest";
        var rabbitPass = builder.Configuration["RabbitMq:Password"] ?? "guest";
        cfg.Host(rabbitHost, "/", h => { h.Username(rabbitUser); h.Password(rabbitPass); });
        cfg.ConfigureEndpoints(context);
    });
});

// Correlation Engine
builder.Services.AddScoped<CorrelationEngine>();

// Background Services
builder.Services.AddHostedService<ProposalExecutionService>();

// SignalR
builder.Services.AddSignalR();

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:4200")
            .AllowAnyHeader().AllowAnyMethod().AllowCredentials());
});

var app = builder.Build();
app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapHub<NotificationHub>("/hubs/notifications");
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

// Map endpoints
app.MapAuthEndpoints();
app.MapProposalEndpoints();
app.MapDashboardEndpoints();
app.MapAgentEndpoints();
app.MapInsightEndpoints();
app.MapImpactEndpoints();
app.MapOperationalDataEndpoints();
app.MapAuditEndpoints();

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<CostPilotDbContext>();
    await db.Database.MigrateAsync();
    await CostPilot.Gateway.Infrastructure.Seed.DbSeeder.SeedAsync(db);
}

app.Run();
public partial class Program { }
