import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI
from costpilot_common.config import ANTHROPIC_API_KEY
from costpilot_common.gateway_client import save_proposal, save_insight, save_alert

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

AGENT_NAME = "spend"
SCAN_INTERVAL = int(os.environ.get("SCAN_INTERVAL_SECONDS", "300"))
USE_AI = bool(ANTHROPIC_API_KEY)

last_run_time: datetime | None = None
next_run_time: datetime | None = None
run_count: int = 0
is_running: bool = False


def run_analysis_demo():
    """Run SQL-based analysis (no LLM needed)."""
    from costpilot_common.demo_analysis import run_spend_analysis
    return run_spend_analysis()


def run_analysis_ai():
    """Run CrewAI-based analysis (needs API key)."""
    from spend_agent.crew import create_spend_crew
    crew = create_spend_crew()
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
                logger.info("Scheduled spend scan #%d starting (mode: %s)...", run_count + 1, "AI" if USE_AI else "demo")
                findings = run_analysis_ai() if USE_AI else run_analysis_demo()
                publish_findings(findings)
                last_run_time = datetime.utcnow()
                run_count += 1
                logger.info("Scheduled spend scan #%d completed — %d findings", run_count, len(findings))
                is_running = False
        except Exception as e:
            logger.error("Scheduled spend scan failed: %s", e)
            is_running = False
        next_run_time = datetime.utcnow()
        await asyncio.sleep(SCAN_INTERVAL)


def publish_findings(findings: list[dict]):
    for f in findings:
        impact = float(f.get("financial_impact", 0))
        if impact > 0:
            save_proposal(
                agent_type="Spend",
                title=f"Spend: {f.get('description', 'Cost saving opportunity')[:120]}",
                description=f.get("description", str(f)),
                estimated_savings=impact,
                risk_level="High" if impact > 50000 else "Medium" if impact > 10000 else "Low",
                evidence=f,
            )
        save_insight(
            source_agent="Spend",
            insight_type=f.get("type", "cost_anomaly"),
            entity_type="vendor",
            entity_id=str(f.get("vendor_id", "unknown")),
            summary=f.get("description", str(f))[:500],
            financial_impact=impact,
            confidence=f.get("confidence", 0.7),
            related_data=f,
        )
    save_alert(
        agent_type="Spend",
        severity="Info",
        title="Spend analysis completed",
        message=f"Found {len(findings)} findings",
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Spend Agent starting (mode: %s, interval: %ds)...", "AI" if USE_AI else "DEMO", SCAN_INTERVAL)
    task = asyncio.create_task(scheduled_scan())
    yield
    task.cancel()


app = FastAPI(title="Spend Intelligence Agent", lifespan=lifespan)


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
