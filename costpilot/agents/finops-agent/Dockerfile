FROM python:3.12-slim

WORKDIR /app

COPY common/ /app/common/
COPY finops-agent/ /app/finops-agent/

RUN pip install --no-cache-dir /app/common /app/finops-agent

WORKDIR /app/finops-agent/src
EXPOSE 8000

CMD ["uvicorn", "finops_agent.main:app", "--host", "0.0.0.0", "--port", "8000"]
