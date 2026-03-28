#!/usr/bin/env python3
"""Seed the CostPilot database with synthetic data for demo."""

import os
import sys
import psycopg2

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://costpilot:costpilot_dev@localhost:5432/costpilot"
)


def create_tables(cursor):
    """Create operational data tables (separate from EF Core managed tables)."""
    cursor.execute("""
        -- Vendors & Procurement
        CREATE TABLE IF NOT EXISTS vendors (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT,
            contact_email TEXT,
            payment_terms_days INT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS purchase_orders (
            id SERIAL PRIMARY KEY,
            vendor_id INT REFERENCES vendors(id),
            item_description TEXT,
            quantity INT,
            unit_price NUMERIC(18,2),
            total_amount NUMERIC(18,2),
            order_date DATE
        );

        CREATE TABLE IF NOT EXISTS invoices (
            id SERIAL PRIMARY KEY,
            vendor_id INT REFERENCES vendors(id),
            invoice_number TEXT,
            amount NUMERIC(18,2),
            invoice_date DATE,
            reconciled BOOLEAN DEFAULT FALSE
        );

        CREATE TABLE IF NOT EXISTS vendor_contracts (
            id SERIAL PRIMARY KEY,
            vendor_id INT REFERENCES vendors(id),
            service_category TEXT,
            annual_cost NUMERIC(18,2),
            start_date DATE,
            end_date DATE
        );

        CREATE TABLE IF NOT EXISTS market_benchmarks (
            id SERIAL PRIMARY KEY,
            service_category TEXT,
            benchmark_rate NUMERIC(18,2),
            market_average NUMERIC(18,2)
        );

        -- SLA & Services
        CREATE TABLE IF NOT EXISTS services (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            sla_uptime_target NUMERIC(6,3),
            sla_response_time_ms INT,
            sla_resolution_hours INT
        );

        CREATE TABLE IF NOT EXISTS sla_metrics (
            id SERIAL PRIMARY KEY,
            service_id INT REFERENCES services(id),
            uptime_pct NUMERIC(6,3),
            response_time_ms NUMERIC(10,1),
            resolution_hours NUMERIC(6,2),
            recorded_at TIMESTAMPTZ
        );

        CREATE TABLE IF NOT EXISTS sla_penalties (
            id SERIAL PRIMARY KEY,
            service_id INT REFERENCES services(id),
            breach_type TEXT,
            penalty_amount NUMERIC(18,2),
            escalation_hours INT
        );

        -- Resources
        CREATE TABLE IF NOT EXISTS teams (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            member_count INT,
            current_utilization_pct NUMERIC(5,1),
            skills TEXT
        );

        CREATE TABLE IF NOT EXISTS software_tools (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            total_licenses INT,
            used_licenses INT,
            cost_per_license NUMERIC(18,2),
            annual_cost NUMERIC(18,2)
        );

        CREATE TABLE IF NOT EXISTS servers (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT,
            monthly_cost NUMERIC(18,2)
        );

        CREATE TABLE IF NOT EXISTS server_metrics (
            id SERIAL PRIMARY KEY,
            server_id INT REFERENCES servers(id),
            cpu_pct NUMERIC(5,1),
            memory_pct NUMERIC(5,1),
            storage_pct NUMERIC(5,1),
            recorded_at TIMESTAMPTZ
        );

        CREATE TABLE IF NOT EXISTS cost_allocations (
            id SERIAL PRIMARY KEY,
            team_id INT REFERENCES teams(id),
            category TEXT,
            amount NUMERIC(18,2),
            period TEXT
        );

        -- Financial
        CREATE TABLE IF NOT EXISTS budget_vs_actual (
            id SERIAL PRIMARY KEY,
            department TEXT,
            category TEXT,
            budgeted_amount NUMERIC(18,2),
            actual_amount NUMERIC(18,2),
            period TEXT
        );
    """)


def seed_all(cursor):
    from generators.vendors import generate_vendors
    from generators.procurement import (
        generate_purchase_orders, generate_invoices,
        generate_vendor_contracts, generate_market_benchmarks,
    )
    from generators.sla_services import generate_services, generate_sla_metrics, generate_sla_penalties
    from generators.resources import (
        generate_teams, generate_software_tools, generate_servers,
        generate_server_metrics, generate_cost_allocations,
    )
    from generators.financial import generate_budget_vs_actual

    print("Generating vendors...")
    vendors = generate_vendors(cursor, 50)

    print("Generating procurement data...")
    generate_purchase_orders(cursor, vendors, 10000)
    generate_invoices(cursor, vendors, 8000)
    generate_vendor_contracts(cursor, vendors)
    generate_market_benchmarks(cursor)

    print("Generating SLA data...")
    service_count = generate_services(cursor)
    generate_sla_metrics(cursor, service_count)
    generate_sla_penalties(cursor, service_count)

    print("Generating resource data...")
    generate_teams(cursor)
    generate_software_tools(cursor)
    generate_servers(cursor)
    generate_server_metrics(cursor)
    generate_cost_allocations(cursor)

    print("Generating financial data...")
    generate_budget_vs_actual(cursor)


def main():
    print(f"Connecting to: {DATABASE_URL}")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cursor = conn.cursor()

    try:
        # Check if already seeded
        cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vendors')")
        if cursor.fetchone()[0]:
            cursor.execute("SELECT COUNT(*) FROM vendors")
            if cursor.fetchone()[0] > 0:
                print("Database already seeded. Use --force to reseed.")
                if "--force" not in sys.argv:
                    return
                print("Force reseeding...")
                cursor.execute("DROP TABLE IF EXISTS budget_vs_actual, cost_allocations, server_metrics, servers, software_tools, teams, sla_penalties, sla_metrics, services, market_benchmarks, vendor_contracts, invoices, purchase_orders, vendors CASCADE")
                conn.commit()

        print("Creating tables...")
        create_tables(cursor)
        conn.commit()

        print("Seeding data...")
        seed_all(cursor)
        conn.commit()

        print("Done! Database seeded successfully.")

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
