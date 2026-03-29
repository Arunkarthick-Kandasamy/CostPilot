import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
from costpilot_common.config import ANTHROPIC_API_KEY
from costpilot_common.gateway_client import save_proposal, save_insight, save_alert

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

AGENT_NAME = "resource"
SCAN_INTERVAL = int(os.environ.get("SCAN_INTERVAL_SECONDS", "300"))
USE_AI = bool(ANTHROPIC_API_KEY)

last_run_time: datetime | None = None
next_run_time: datetime | None = None
run_count: int = 0
is_running: bool = False


def run_analysis_demo():
    """Run SQL-based analysis (no LLM needed)."""
    from costpilot_common.demo_analysis import run_resource_analysis
    return run_resource_analysis()


def run_analysis_ai():
    """Run CrewAI-based analysis (needs API key)."""
    from resource_agent.crew import create_resource_crew
    crew = create_resource_crew()
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
                logger.info("Scheduled resource scan #%d starting (mode: %s)...", run_count + 1, "AI" if USE_AI else "demo")
                findings = run_analysis_ai() if USE_AI else run_analysis_demo()
                publish_findings(findings)
                last_run_time = datetime.utcnow()
                run_count += 1
                logger.info("Scheduled resource scan #%d completed — %d findings", run_count, len(findings))
                is_running = False
        except Exception as e:
            logger.error("Scheduled resource scan failed: %s", e)
            is_running = False
        next_run_time = datetime.utcnow()
        await asyncio.sleep(SCAN_INTERVAL)


def publish_findings(findings: list[dict]):
    for f in findings:
        impact = float(f.get("financial_impact", 0))
        if impact > 0:
            save_proposal(
                agent_type="Resource",
                title=f"Resource: {f.get('description', 'Optimization opportunity')[:120]}",
                description=f.get("description", str(f)),
                estimated_savings=impact,
                risk_level="Low" if impact < 60000 else "Medium",
                evidence=f,
            )
        save_insight(
            source_agent="Resource",
            insight_type=f.get("type", "underutilized"),
            entity_type=f.get("resource_type", "resource"),
            entity_id=str(f.get("resource_id", "unknown")),
            summary=f.get("description", str(f))[:500],
            financial_impact=impact,
            confidence=f.get("confidence", 0.85),
            related_data=f,
        )
    save_alert(
        agent_type="Resource",
        severity="Info",
        title="Resource analysis completed",
        message=f"Found {len(findings)} findings",
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Resource Optimization Agent starting (mode: %s, interval: %ds)...", "AI" if USE_AI else "DEMO", SCAN_INTERVAL)
    task = asyncio.create_task(scheduled_scan())
    yield
    task.cancel()


app = FastAPI(title="Resource Optimization Agent", lifespan=lifespan)


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
        return {"status": "completed", "mode": "ai" if USE_AI else "demo", "findings_count": len(findings), "findings": findings}
    except Exception as e:
        is_running = False
        logger.error("Analysis failed: %s", e)
        return {"status": "failed", "error": str(e)}


class AnalyzeRequest(BaseModel):
    license_utilization_threshold: float = 60.0  # flag below X%
    server_cpu_threshold: float = 10.0  # flag below X%
    lookback_days: int = 7
    max_results: int = 10


@app.post("/analyze")
async def analyze_with_params(req: AnalyzeRequest):
    """Run resource analysis with user-configured thresholds and return results directly."""
    from costpilot_common.database import SessionLocal
    from sqlalchemy import text
    db = SessionLocal()
    results = {"unused_licenses": [], "idle_servers": [], "summary": {}}
    try:
        # Unused licenses
        util_threshold = req.license_utilization_threshold / 100
        rows = db.execute(text("""
            SELECT id, name, total_licenses, used_licenses, cost_per_license,
                   (total_licenses - used_licenses) as unused,
                   (total_licenses - used_licenses) * cost_per_license * 12 as annual_waste,
                   ROUND((used_licenses::numeric / NULLIF(total_licenses, 0) * 100), 1) as util_pct
            FROM software_tools
            WHERE total_licenses > 0
              AND used_licenses < total_licenses * :threshold
            ORDER BY (total_licenses - used_licenses) * cost_per_license DESC
            LIMIT :lim
        """), {"threshold": util_threshold, "lim": req.max_results}).fetchall()
        for r in rows:
            results["unused_licenses"].append({
                "tool_name": r[1],
                "total_licenses": r[2],
                "used_licenses": r[3],
                "unused_licenses": r[5],
                "cost_per_license": float(r[4]),
                "utilization_pct": float(r[7]) if r[7] else 0.0,
                "annual_waste": float(r[6])
            })

        # Idle servers
        rows = db.execute(text("""
            SELECT s.id, s.name, s.type, s.monthly_cost,
                   ROUND(AVG(m.cpu_pct)::numeric, 1) as avg_cpu,
                   ROUND(AVG(m.memory_pct)::numeric, 1) as avg_mem
            FROM servers s
            JOIN server_metrics m ON m.server_id = s.id
            WHERE m.recorded_at >= NOW() - MAKE_INTERVAL(days => :days)
            GROUP BY s.id, s.name, s.type, s.monthly_cost
            HAVING AVG(m.cpu_pct) < :cpu_thresh
            ORDER BY s.monthly_cost DESC
            LIMIT :lim
        """), {"days": req.lookback_days, "cpu_thresh": req.server_cpu_threshold,
               "lim": req.max_results}).fetchall()
        for r in rows:
            results["idle_servers"].append({
                "server_name": r[1],
                "server_type": r[2],
                "monthly_cost": float(r[3]),
                "annual_cost": float(r[3]) * 12,
                "avg_cpu_pct": float(r[4]),
                "avg_memory_pct": float(r[5])
            })

        total_license_waste = sum(l["annual_waste"] for l in results["unused_licenses"])
        total_server_waste = sum(s["annual_cost"] for s in results["idle_servers"])
        results["summary"] = {
            "total_findings": len(results["unused_licenses"]) + len(results["idle_servers"]),
            "unused_licenses_found": len(results["unused_licenses"]),
            "idle_servers_found": len(results["idle_servers"]),
            "total_license_waste": total_license_waste,
            "total_server_waste": total_server_waste,
            "total_potential_savings": total_license_waste + total_server_waste,
            "config_used": {
                "license_utilization_threshold": req.license_utilization_threshold,
                "server_cpu_threshold": req.server_cpu_threshold,
                "lookback_days": req.lookback_days
            }
        }
    finally:
        db.close()
    return results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
