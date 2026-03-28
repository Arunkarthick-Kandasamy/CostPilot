import random
from datetime import datetime, timedelta
from faker import Faker

fake = Faker()
Faker.seed(42)
random.seed(42)

ITEMS = [
    "Cloud Compute Instance", "SaaS License", "Consulting Hours", "Network Equipment",
    "Security Audit", "Training Workshop", "Data Pipeline Service", "Support Contract",
    "Storage Volume", "Load Balancer", "API Gateway Usage", "Monitoring Service",
]


def generate_purchase_orders(cursor, vendors, count=10000):
    base_date = datetime(2025, 4, 1)

    for i in range(1, count + 1):
        vendor = random.choice(vendors)
        item = random.choice(ITEMS)
        base_price = random.uniform(100, 50000)

        # 5% chance of anomalous price (spike)
        if random.random() < 0.05:
            unit_price = base_price * random.uniform(1.3, 2.0)
        else:
            unit_price = base_price * random.uniform(0.9, 1.1)

        quantity = random.randint(1, 100)
        order_date = base_date + timedelta(days=random.randint(0, 365))

        cursor.execute("""
            INSERT INTO purchase_orders (id, vendor_id, item_description, quantity, unit_price, total_amount, order_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (i, vendor["id"], item, quantity, round(unit_price, 2),
              round(unit_price * quantity, 2), order_date))


def generate_invoices(cursor, vendors, count=8000):
    base_date = datetime(2025, 4, 1)

    for i in range(1, count + 1):
        vendor = random.choice(vendors)
        amount = round(random.uniform(500, 100000), 2)
        invoice_date = base_date + timedelta(days=random.randint(0, 365))

        # 5% chance of duplicate (same vendor, same amount, within 30 days)
        is_duplicate = random.random() < 0.05 and i > 100
        if is_duplicate:
            amount = round(random.choice([5000, 10000, 25000, 50000]) * random.uniform(0.99, 1.01), 2)

        cursor.execute("""
            INSERT INTO invoices (id, vendor_id, invoice_number, amount, invoice_date, reconciled)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (i, vendor["id"], f"INV-{i:06d}", amount, invoice_date,
              random.random() > 0.3))  # 70% reconciled


def generate_vendor_contracts(cursor, vendors):
    categories = ["Cloud Services", "Software Licenses", "Consulting", "Security", "Data Services"]
    contract_id = 0

    for vendor in vendors:
        for _ in range(random.randint(1, 3)):
            contract_id += 1
            category = random.choice(categories)
            start = datetime(2025, 1, 1) + timedelta(days=random.randint(0, 180))
            end = start + timedelta(days=random.randint(180, 730))
            annual_cost = round(random.uniform(10000, 500000), 2)

            cursor.execute("""
                INSERT INTO vendor_contracts (id, vendor_id, service_category, annual_cost, start_date, end_date)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (contract_id, vendor["id"], category, annual_cost, start, end))


def generate_market_benchmarks(cursor):
    categories = ["Cloud Services", "Software Licenses", "Consulting", "Security",
                   "Data Services", "Hardware", "Maintenance", "Training", "Telecom", "Facilities"]

    for i, cat in enumerate(categories, 1):
        benchmark = round(random.uniform(20000, 200000), 2)
        cursor.execute("""
            INSERT INTO market_benchmarks (id, service_category, benchmark_rate, market_average)
            VALUES (%s, %s, %s, %s)
        """, (i, cat, benchmark * 0.9, benchmark))
