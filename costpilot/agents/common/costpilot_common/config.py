import os

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://costpilot:costpilot_dev@localhost:5432/costpilot")
RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "amqp://costpilot:costpilot_dev@localhost:5672/")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
AGENT_TYPE = os.environ.get("AGENT_TYPE", "unknown")
