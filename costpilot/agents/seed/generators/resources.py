import random
from datetime import datetime, timedelta
from faker import Faker

fake = Faker()
random.seed(42)


def generate_teams(cursor, count=15):
    team_names = [
        "Platform", "Backend", "Frontend", "Mobile", "Data Engineering",
        "ML/AI", "DevOps", "Security", "QA", "Product",
        "Design", "Customer Success", "Sales Ops", "Finance", "HR Tech",
    ]
    skills_pool = ["Python", "Java", "Go", "TypeScript", "React", "AWS", "GCP", "Kubernetes", "SQL", "ML"]

    for i, name in enumerate(team_names[:count], 1):
        member_count = random.randint(5, 30)
        utilization = random.uniform(40, 95)
        skills = ",".join(random.sample(skills_pool, 3))

        cursor.execute("""
            INSERT INTO teams (id, name, member_count, current_utilization_pct, skills)
            VALUES (%s, %s, %s, %s, %s)
        """, (i, name, member_count, round(utilization, 1), skills))


def generate_software_tools(cursor):
    tools = [
        ("Jira", 200, 50), ("Confluence", 200, 30), ("Slack", 250, 15),
        ("GitHub Enterprise", 150, 40), ("Figma", 50, 35), ("DataDog", 30, 80),
        ("Snowflake", 20, 120), ("Salesforce", 80, 150), ("Zoom", 200, 20),
        ("AWS", 1, 50000), ("GCP", 1, 30000), ("Azure", 1, 20000),
        ("Notion", 100, 12), ("Linear", 80, 10), ("Vercel", 10, 200),
        ("PagerDuty", 30, 25), ("1Password", 200, 8), ("Grammarly", 50, 15),
        ("Miro", 40, 16), ("Loom", 60, 10), ("Asana", 30, 15),
        ("HubSpot", 20, 80), ("Stripe Dashboard", 5, 0), ("PostHog", 10, 50),
        ("CircleCI", 15, 40), ("LaunchDarkly", 10, 60), ("Sentry", 20, 30),
        ("Segment", 5, 100), ("Amplitude", 10, 70), ("dbt Cloud", 8, 90),
    ]

    for i, (name, total, cost) in enumerate(tools, 1):
        # 15% unused licenses embedded
        used = max(1, int(total * random.uniform(0.5, 1.0)))
        if random.random() < 0.15:
            used = max(1, int(total * random.uniform(0.1, 0.4)))  # deliberately underused

        cursor.execute("""
            INSERT INTO software_tools (id, name, total_licenses, used_licenses, cost_per_license, annual_cost)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (i, name, total, used, cost, total * cost * 12))


def generate_servers(cursor, count=50):
    types = ["Web Server", "API Server", "Database", "Cache", "Worker", "ML Training", "Storage"]

    for i in range(1, count + 1):
        server_type = random.choice(types)
        monthly_cost = round(random.uniform(100, 5000), 2)

        cursor.execute("""
            INSERT INTO servers (id, name, type, monthly_cost)
            VALUES (%s, %s, %s, %s)
        """, (i, f"{server_type.lower().replace(' ', '-')}-{i:03d}", server_type, monthly_cost))


def generate_server_metrics(cursor, server_count=50):
    base_date = datetime(2026, 3, 1)

    for server_id in range(1, server_count + 1):
        # 20% idle infrastructure
        is_idle = random.random() < 0.20
        base_cpu = random.uniform(2, 8) if is_idle else random.uniform(30, 80)

        for day in range(28):
            for hour in range(0, 24, 6):
                date = base_date + timedelta(days=day, hours=hour)
                cpu = max(0, min(100, base_cpu + random.uniform(-5, 5)))
                memory = max(0, min(100, cpu * random.uniform(0.8, 1.5)))
                storage = random.uniform(20, 90)

                cursor.execute("""
                    INSERT INTO server_metrics (server_id, cpu_pct, memory_pct, storage_pct, recorded_at)
                    VALUES (%s, %s, %s, %s, %s)
                """, (server_id, round(cpu, 1), round(memory, 1), round(storage, 1), date))


def generate_cost_allocations(cursor, team_count=15):
    categories = ["Compute", "Storage", "Licenses", "Consulting", "Training", "Telecom"]
    alloc_id = 0

    for team_id in range(1, team_count + 1):
        for cat in categories:
            alloc_id += 1
            amount = round(random.uniform(1000, 100000), 2)
            cursor.execute("""
                INSERT INTO cost_allocations (id, team_id, category, amount, period)
                VALUES (%s, %s, %s, %s, '2026-03')
            """, (alloc_id, team_id, cat, amount))
