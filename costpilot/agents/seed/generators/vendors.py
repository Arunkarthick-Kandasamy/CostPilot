from faker import Faker

fake = Faker()
Faker.seed(42)


def generate_vendors(cursor, count=50):
    categories = ["Cloud Services", "Software Licenses", "Consulting", "Hardware",
                   "Maintenance", "Training", "Telecom", "Facilities", "Security", "Data Services"]

    vendors = []
    for i in range(1, count + 1):
        name = fake.company()
        category = categories[i % len(categories)]
        cursor.execute("""
            INSERT INTO vendors (id, name, category, contact_email, payment_terms_days, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
        """, (i, name, category, fake.company_email(), fake.random_element([15, 30, 45, 60])))
        vendors.append({"id": i, "name": name, "category": category})

    return vendors
