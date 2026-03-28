FROM python:3.12-slim

WORKDIR /app

COPY common/ /app/common/
COPY spend-agent/ /app/spend-agent/

RUN pip install --no-cache-dir /app/common /app/spend-agent

WORKDIR /app/spend-agent/src
EXPOSE 8000

CMD ["uvicorn", "spend_agent.main:app", "--host", "0.0.0.0", "--port", "8000"]
