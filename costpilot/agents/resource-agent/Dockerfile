FROM python:3.12-slim

WORKDIR /app

COPY common/ /app/common/
COPY resource-agent/ /app/resource-agent/

RUN pip install --no-cache-dir /app/common /app/resource-agent

WORKDIR /app/resource-agent/src
EXPOSE 8000

CMD ["uvicorn", "resource_agent.main:app", "--host", "0.0.0.0", "--port", "8000"]
