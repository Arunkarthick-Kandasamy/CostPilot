namespace CostPilot.Gateway.Api.Endpoints;

using Npgsql;
using System.Text.Json;

public static class OperationalDataEndpoints
{
    public static void MapOperationalDataEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/data").WithTags("Operational Data").RequireAuthorization();

        group.MapGet("/vendors", async (IConfiguration config) =>
        {
            var connStr = config.GetConnectionString("CostPilotDb") ?? "Host=localhost;Database=costpilot;Username=postgres;Password=postgres";
            await using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();
            await using var cmd = new NpgsqlCommand("SELECT id, name, category, contact_email, payment_terms_days FROM vendors ORDER BY name", conn);
            await using var reader = await cmd.ExecuteReaderAsync();
            var results = new List<object>();
            while (await reader.ReadAsync())
                results.Add(new { id = reader.GetInt32(0), name = reader.GetString(1), category = reader.IsDBNull(2) ? null : reader.GetString(2), contactEmail = reader.IsDBNull(3) ? null : reader.GetString(3), paymentTermsDays = reader.IsDBNull(4) ? 0 : reader.GetInt32(4) });
            return Results.Ok(new { total = results.Count, items = results });
        });

        group.MapGet("/purchase-orders", async (IConfiguration config, int page = 1, int size = 50) =>
        {
            var connStr = config.GetConnectionString("CostPilotDb") ?? "Host=localhost;Database=costpilot;Username=postgres;Password=postgres";
            await using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();

            await using var countCmd = new NpgsqlCommand("SELECT COUNT(*) FROM purchase_orders", conn);
            var total = (long)(await countCmd.ExecuteScalarAsync())!;

            await using var cmd = new NpgsqlCommand($"SELECT po.id, v.name as vendor_name, po.item_description, po.quantity, po.unit_price, po.total_amount, po.order_date FROM purchase_orders po JOIN vendors v ON v.id = po.vendor_id ORDER BY po.order_date DESC LIMIT {size} OFFSET {(page-1)*size}", conn);
            await using var reader = await cmd.ExecuteReaderAsync();
            var results = new List<object>();
            while (await reader.ReadAsync())
                results.Add(new { id = reader.GetInt32(0), vendorName = reader.GetString(1), itemDescription = reader.IsDBNull(2) ? "" : reader.GetString(2), quantity = reader.GetInt32(3), unitPrice = reader.GetDecimal(4), totalAmount = reader.GetDecimal(5), orderDate = reader.GetDateTime(6) });
            return Results.Ok(new { total, page, size, items = results });
        });

        group.MapGet("/invoices", async (IConfiguration config, int page = 1, int size = 50) =>
        {
            var connStr = config.GetConnectionString("CostPilotDb") ?? "Host=localhost;Database=costpilot;Username=postgres;Password=postgres";
            await using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();

            await using var countCmd = new NpgsqlCommand("SELECT COUNT(*) FROM invoices", conn);
            var total = (long)(await countCmd.ExecuteScalarAsync())!;

            await using var cmd = new NpgsqlCommand($"SELECT i.id, v.name as vendor_name, i.invoice_number, i.amount, i.invoice_date, i.reconciled FROM invoices i JOIN vendors v ON v.id = i.vendor_id ORDER BY i.invoice_date DESC LIMIT {size} OFFSET {(page-1)*size}", conn);
            await using var reader = await cmd.ExecuteReaderAsync();
            var results = new List<object>();
            while (await reader.ReadAsync())
                results.Add(new { id = reader.GetInt32(0), vendorName = reader.GetString(1), invoiceNumber = reader.IsDBNull(2) ? "" : reader.GetString(2), amount = reader.GetDecimal(3), invoiceDate = reader.GetDateTime(4), reconciled = reader.GetBoolean(5) });
            return Results.Ok(new { total, page, size, items = results });
        });

        group.MapGet("/services", async (IConfiguration config) =>
        {
            var connStr = config.GetConnectionString("CostPilotDb") ?? "Host=localhost;Database=costpilot;Username=postgres;Password=postgres";
            await using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();
            await using var cmd = new NpgsqlCommand("SELECT id, name, sla_uptime_target, sla_response_time_ms, sla_resolution_hours FROM services ORDER BY name", conn);
            await using var reader = await cmd.ExecuteReaderAsync();
            var results = new List<object>();
            while (await reader.ReadAsync())
                results.Add(new { id = reader.GetInt32(0), name = reader.GetString(1), slaUptimeTarget = reader.GetDecimal(2), slaResponseTimeMs = reader.GetInt32(3), slaResolutionHours = reader.GetInt32(4) });
            return Results.Ok(new { total = results.Count, items = results });
        });

        group.MapGet("/servers", async (IConfiguration config) =>
        {
            var connStr = config.GetConnectionString("CostPilotDb") ?? "Host=localhost;Database=costpilot;Username=postgres;Password=postgres";
            await using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();
            await using var cmd = new NpgsqlCommand(@"SELECT s.id, s.name, s.type, s.monthly_cost,
                COALESCE((SELECT ROUND(AVG(m.cpu_pct)::numeric, 1) FROM server_metrics m WHERE m.server_id = s.id), 0) as avg_cpu,
                COALESCE((SELECT ROUND(AVG(m.memory_pct)::numeric, 1) FROM server_metrics m WHERE m.server_id = s.id), 0) as avg_memory
                FROM servers s ORDER BY s.name", conn);
            await using var reader = await cmd.ExecuteReaderAsync();
            var results = new List<object>();
            while (await reader.ReadAsync())
                results.Add(new { id = reader.GetInt32(0), name = reader.GetString(1), type = reader.IsDBNull(2) ? "" : reader.GetString(2), monthlyCost = reader.GetDecimal(3), avgCpu = reader.GetDecimal(4), avgMemory = reader.GetDecimal(5) });
            return Results.Ok(new { total = results.Count, items = results });
        });

        group.MapGet("/software-tools", async (IConfiguration config) =>
        {
            var connStr = config.GetConnectionString("CostPilotDb") ?? "Host=localhost;Database=costpilot;Username=postgres;Password=postgres";
            await using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();
            await using var cmd = new NpgsqlCommand("SELECT id, name, total_licenses, used_licenses, cost_per_license, annual_cost FROM software_tools ORDER BY annual_cost DESC", conn);
            await using var reader = await cmd.ExecuteReaderAsync();
            var results = new List<object>();
            while (await reader.ReadAsync())
                results.Add(new { id = reader.GetInt32(0), name = reader.GetString(1), totalLicenses = reader.GetInt32(2), usedLicenses = reader.GetInt32(3), costPerLicense = reader.GetDecimal(4), annualCost = reader.GetDecimal(5) });
            return Results.Ok(new { total = results.Count, items = results });
        });

        group.MapGet("/budget-vs-actual", async (IConfiguration config) =>
        {
            var connStr = config.GetConnectionString("CostPilotDb") ?? "Host=localhost;Database=costpilot;Username=postgres;Password=postgres";
            await using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();
            await using var cmd = new NpgsqlCommand("SELECT department, category, budgeted_amount, actual_amount, (actual_amount - budgeted_amount) as variance, period FROM budget_vs_actual WHERE period = (SELECT MAX(period) FROM budget_vs_actual) ORDER BY ABS(actual_amount - budgeted_amount) DESC LIMIT 50", conn);
            await using var reader = await cmd.ExecuteReaderAsync();
            var results = new List<object>();
            while (await reader.ReadAsync())
                results.Add(new { department = reader.GetString(0), category = reader.GetString(1), budgetedAmount = reader.GetDecimal(2), actualAmount = reader.GetDecimal(3), variance = reader.GetDecimal(4), period = reader.GetString(5) });
            return Results.Ok(new { total = results.Count, items = results });
        });

        group.MapGet("/stats", async (IConfiguration config) =>
        {
            var connStr = config.GetConnectionString("CostPilotDb") ?? "Host=localhost;Database=costpilot;Username=postgres;Password=postgres";
            await using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();
            var stats = new Dictionary<string, long>();
            foreach (var table in new[] { "vendors", "purchase_orders", "invoices", "vendor_contracts", "services", "sla_metrics", "servers", "server_metrics", "software_tools", "teams", "budget_vs_actual", "cost_allocations" })
            {
                await using var cmd = new NpgsqlCommand($"SELECT COUNT(*) FROM {table}", conn);
                stats[table] = (long)(await cmd.ExecuteScalarAsync())!;
            }
            return Results.Ok(stats);
        });
    }
}
