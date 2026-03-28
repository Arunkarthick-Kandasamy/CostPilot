FROM python:3.12-slim

WORKDIR /app

COPY common/ /app/common/
COPY sla-agent/ /app/sla-agent/

RUN pip install --no-cache-dir /app/common /app/sla-agent

WORKDIR /app/sla-agent/src
EXPOSE 8000

CMD ["uvicorn", "sla_agent.main:app", "--host", "0.0.0.0", "--port", "8000"]
