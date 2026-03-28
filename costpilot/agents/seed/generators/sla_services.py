import random
from datetime import datetime, timedelta
from faker import Faker

fake = Faker()
random.seed(42)

SERVICE_NAMES = [
    "Payment Gateway", "User Auth Service", "Order Processing", "Inventory API",
    "Notification Service", "Search Engine", "Analytics Pipeline", "CDN",
    "Database Cluster", "Cache Layer", "Email Service", "File Storage",
    "API Gateway", "Load Balancer", "Monitoring Stack", "CI/CD Pipeline",
    "Log Aggregator", "Message Queue", "Identity Provider", "Rate Limiter",
]


def generate_services(cursor):
    for i, name in enumerate(SERVICE_NAMES, 1):
        uptime_target = random.choice([99.9, 99.95, 99.99])
        response_time = random.choice([100, 200, 500, 1000])
        resolution = random.choice([1, 2, 4, 8, 24])

        cursor.execute("""
            INSERT INTO services (id, name, sla_uptime_target, sla_response_time_ms, sla_resolution_hours)
            VALUES (%s, %s, %s, %s, %s)
        """, (i, name, uptime_target, response_time, resolution))

    return len(SERVICE_NAMES)


def generate_sla_metrics(cursor, service_count):
    base_date = datetime(2025, 10, 1)

    for service_id in range(1, service_count + 1):
        base_uptime = random.uniform(99.5, 100.0)
        base_response = random.uniform(50, 400)

        # 3 services trending toward breach
        degrading = service_id in [3, 7, 15]

        for day in range(180):
            for hour in range(0, 24, 4):  # 6 data points per day
                date = base_date + timedelta(days=day, hours=hour)

                if degrading and day > 150:
                    degradation = (day - 150) * 0.03
                    uptime = max(95.0, base_uptime - degradation + random.uniform(-0.1, 0.1))
                    response = base_response * (1 + degradation * 0.1) + random.uniform(-20, 20)
                else:
                    uptime = base_uptime + random.uniform(-0.3, 0.1)
                    response = base_response + random.uniform(-30, 30)

                resolution = random.uniform(0.5, 8.0)

                cursor.execute("""
                    INSERT INTO sla_metrics (service_id, uptime_pct, response_time_ms, resolution_hours, recorded_at)
                    VALUES (%s, %s, %s, %s, %s)
                """, (service_id, round(uptime, 3), round(response, 1), round(resolution, 2), date))


def generate_sla_penalties(cursor, service_count):
    penalty_id = 0
    breach_types = ["uptime", "response_time", "resolution_time"]

    for service_id in range(1, service_count + 1):
        for breach_type in breach_types:
            penalty_id += 1
            amount = random.choice([10000, 25000, 50000, 75000, 100000, 150000])
            cursor.execute("""
                INSERT INTO sla_penalties (id, service_id, breach_type, penalty_amount, escalation_hours)
                VALUES (%s, %s, %s, %s, %s)
            """, (penalty_id, service_id, breach_type, amount, random.choice([1, 2, 4, 8])))
