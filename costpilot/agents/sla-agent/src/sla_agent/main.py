import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime
from decimal import Decimal

from fastapi import FastAPI
from costpilot_common.messaging import publish_proposal, publish_insight, publish_alert
from costpilot_common.schemas import ProposalSchema, InsightSchema, AlertSchema
from sla_agent.crew import create_sla_crew

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

AGENT_NAME = "sla"
SCAN_INTERVAL = int(os.environ.get("SCAN_INTERVAL_SECONDS", "300"))

# Scheduled scan state
last_run_time: datetime | None = None
next_run_time: datetime | None = None
run_count: int = 0
is_running: bool = False


async def scheduled_scan():
    """Background task that runs SLA analysis on a schedule."""
    global last_run_time, next_run_time, run_count, is_running
    await asyncio.sleep(10)  # initial delay before first scan
    while True:
        next_run_time = datetime.utcnow()
        try:
            if not is_running:
                is_running = True
                logger.info("Scheduled SLA scan #%d starting...", run_count + 1)
                # NOTE: actual CrewAI crew execution is disabled (no API key configured).
                # When ready, uncomment the crew call below:
                # crew = create_sla_crew()
                # result = crew.kickoff()
                logger.info("Scheduled SLA scan would run analysis here (crew execution disabled)")
                last_run_time = datetime.utcnow()
                run_count += 1
                logger.info("Scheduled SLA scan #%d completed", run_count)
                is_running = False
        except Exception as e:
            logger.error("Scheduled SLA scan failed: %s", e)
            is_running = False
        next_run_time = datetime.utcnow()
        await asyncio.sleep(SCAN_INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SLA Prevention Agent starting with %ds scan interval...", SCAN_INTERVAL)
    task = asyncio.create_task(scheduled_scan())
    yield
    task.cancel()
    logger.info("SLA Prevention Agent shutting down...")


app = FastAPI(title="SLA Prevention Agent", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "healthy", "agent": AGENT_NAME, "timestamp": datetime.utcnow().isoformat()}


@app.get("/status")
def status():
    return {
        "agent": AGENT_NAME,
        "status": "running" if is_running else "idle",
        "lastRunTime": last_run_time.isoformat() if last_run_time else None,
        "nextRunTime": next_run_time.isoformat() if next_run_time else None,
        "runCount": run_count,
        "scanIntervalSeconds": SCAN_INTERVAL,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/run")
async def run_analysis():
    """Trigger SLA monitoring and breach prediction."""
    logger.info("Starting SLA analysis...")

    try:
        crew = create_sla_crew()
        result = crew.kickoff()

        try:
            findings = json.loads(result.raw) if isinstance(result.raw, str) else result.raw
        except (json.JSONDecodeError, TypeError):
            findings = [{"description": result.raw, "penalty_amount": 0}]

        for finding in findings if isinstance(findings, list) else [findings]:
            penalty = Decimal(str(finding.get("penalty_amount", finding.get("penalty_avoided", 0))))
            if penalty > 0:
                publish_proposal(ProposalSchema(
                    agent_type="Sla",
                    title=f"SLA prevention: {finding.get('service', finding.get('description', 'SLA at risk'))[:100]}",
                    description=json.dumps(finding),
                    estimated_savings=penalty,
                    risk_level="Critical" if penalty > 100000 else "High",
                    evidence=finding,
                ))

            publish_insight(InsightSchema(
                source_agent="Sla",
                insight_type=finding.get("type", "breach_warning"),
                entity_type="service",
                entity_id=str(finding.get("service_id", finding.get("service", "unknown"))),
                summary=finding.get("description", str(finding))[:500],
                financial_impact=penalty,
                confidence=Decimal(str(finding.get("confidence", 0.8))),
                related_data=finding,
            ))

        publish_alert(AlertSchema(
            agent_type="Sla", severity="Info",
            title="SLA analysis completed",
            message=f"Found {len(findings) if isinstance(findings, list) else 1} findings",
        ))

        return {"status": "completed", "findings_count": len(findings) if isinstance(findings, list) else 1}

    except Exception as e:
        logger.error("SLA analysis failed: %s", e)
        publish_alert(AlertSchema(
            agent_type="Sla", severity="Critical",
            title="SLA analysis failed", message=str(e),
        ))
        return {"status": "failed", "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
