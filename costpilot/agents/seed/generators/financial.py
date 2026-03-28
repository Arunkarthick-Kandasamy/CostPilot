import random
from faker import Faker

fake = Faker()
random.seed(42)

DEPARTMENTS = ["Engineering", "Sales", "Marketing", "Operations", "Finance", "HR", "Legal", "Product"]
CATEGORIES = ["Cloud", "Licenses", "Consulting", "Hardware", "Travel", "Training", "Facilities", "Telecom"]


def generate_budget_vs_actual(cursor):
    record_id = 0
    periods = [f"2025-{m:02d}" for m in range(4, 13)] + [f"2026-{m:02d}" for m in range(1, 4)]

    for period in periods:
        for dept in DEPARTMENTS:
            for cat in CATEGORIES:
                record_id += 1
                budget = round(random.uniform(5000, 200000), 2)

                # Embed deliberate variances
                if random.random() < 0.1:
                    actual = budget * random.uniform(1.15, 1.40)  # Over budget
                elif random.random() < 0.1:
                    actual = budget * random.uniform(0.5, 0.75)   # Under budget
                else:
                    actual = budget * random.uniform(0.92, 1.08)  # Normal

                cursor.execute("""
                    INSERT INTO budget_vs_actual (id, department, category, budgeted_amount, actual_amount, period)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (record_id, dept, cat, budget, round(actual, 2), period))
