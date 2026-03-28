import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime
from decimal import Decimal

from fastapi import FastAPI
from costpilot_common.config import ANTHROPIC_API_KEY
from costpilot_common.messaging import publish_proposal, publish_insight, publish_alert
from costpilot_common.schemas import ProposalSchema, InsightSchema, AlertSchema

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

AGENT_NAME = "finops"
SCAN_INTERVAL = int(os.environ.get("SCAN_INTERVAL_SECONDS", "300"))
USE_AI = bool(ANTHROPIC_API_KEY)

last_run_time: datetime | None = None
next_run_time: datetime | None = None
run_count: int = 0
is_running: bool = False


def run_analysis_demo():
    """Run SQL-based analysis (no LLM needed)."""
    from costpilot_common.demo_analysis import run_finops_analysis
    return run_finops_analysis()


def run_analysis_ai():
    """Run CrewAI-based analysis (needs API key)."""
    from finops_agent.crew import create_finops_crew
    crew = create_finops_crew()
    result = crew.kickoff()
    try:
        return json.loads(result.raw) if isinstance(result.raw, str) else [result.raw]
    except (json.JSONDecodeError, TypeError):
        return [{"description": str(result.raw), "financial_impact": 0}]


async def scheduled_scan():
    global last_run_time, next_run_time, run_count, is_running
    await asyncio.sleep(10)
    while True:
        try:
            if not is_running:
                is_running = True
                logger.info("Scheduled FinOps scan #%d starting (mode: %s)...", run_count + 1, "AI" if USE_AI else "demo")
                findings = run_analysis_ai() if USE_AI else run_analysis_demo()
                publish_findings(findings)
                last_run_time = datetime.utcnow()
                run_count += 1
                logger.info("Scheduled FinOps scan #%d completed — %d findings", run_count, len(findings))
                is_running = False
        except Exception as e:
            logger.error("Scheduled FinOps scan failed: %s", e)
            is_running = False
        next_run_time = datetime.utcnow()
        await asyncio.sleep(SCAN_INTERVAL)


def publish_findings(findings: list[dict]):
    for f in findings:
        impact = Decimal(str(f.get("financial_impact", 0)))
        if impact > 0:
            publish_proposal(ProposalSchema(
                agent_type="Finops",
                title=f"FinOps: {f.get('description', 'Financial finding')[:120]}",
                description=f.get("description", json.dumps(f)),
                estimated_savings=impact,
                risk_level="Low",
                evidence=f,
            ))
        publish_insight(InsightSchema(
            source_agent="Finops",
            insight_type=f.get("type", "variance_detected"),
            entity_type=f.get("entity_type", "transaction"),
            entity_id=str(f.get("department", f.get("invoice_id", "unknown"))),
            summary=f.get("description", str(f))[:500],
            financial_impact=abs(impact),
            confidence=Decimal(str(f.get("confidence", 0.9))),
            related_data=f,
        ))

    publish_alert(AlertSchema(
        agent_type="Finops",
        severity="Info",
        title="FinOps analysis completed",
        message=f"Found {len(findings)} findings across financial data",
    ))


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("FinOps Agent starting (mode: %s, interval: %ds)...", "AI" if USE_AI else "DEMO", SCAN_INTERVAL)
    task = asyncio.create_task(scheduled_scan())
    yield
    task.cancel()


app = FastAPI(title="FinOps Agent", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "healthy", "agent": AGENT_NAME, "mode": "ai" if USE_AI else "demo", "timestamp": datetime.utcnow().isoformat()}


@app.get("/status")
def status():
    return {
        "agent": AGENT_NAME, "mode": "ai" if USE_AI else "demo",
        "status": "running" if is_running else "idle",
        "lastRunTime": last_run_time.isoformat() if last_run_time else None,
        "runCount": run_count, "scanIntervalSeconds": SCAN_INTERVAL,
    }


@app.post("/run")
async def run_now():
    global last_run_time, run_count, is_running
    if is_running:
        return {"status": "already_running"}
    is_running = True
    try:
        findings = run_analysis_ai() if USE_AI else run_analysis_demo()
        publish_findings(findings)
        last_run_time = datetime.utcnow()
        run_count += 1
        is_running = False
        return {"status": "completed", "mode": "ai" if USE_AI else "demo", "findings": len(findings)}
    except Exception as e:
        is_running = False
        logger.error("Analysis failed: %s", e)
        return {"status": "failed", "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
