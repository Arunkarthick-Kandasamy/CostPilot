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
        impact = float(f.get("financial_impact", 0))
        if impact > 0:
            save_proposal(
                agent_type="Finops",
                title=f"FinOps: {f.get('description', 'Financial finding')[:120]}",
                description=f.get("description", str(f)),
                estimated_savings=impact,
                risk_level="Low",
                evidence=f,
            )
        save_insight(
            source_agent="Finops",
            insight_type=f.get("type", "variance_detected"),
            entity_type=f.get("entity_type", "transaction"),
            entity_id=str(f.get("department", f.get("invoice_id", "unknown"))),
            summary=f.get("description", str(f))[:500],
            financial_impact=abs(impact),
            confidence=f.get("confidence", 0.9),
            related_data=f,
        )
    save_alert(
        agent_type="Finops",
        severity="Info",
        title="FinOps analysis completed",
        message=f"Found {len(findings)} findings",
    )


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
        return {"status": "completed", "mode": "ai" if USE_AI else "demo", "findings_count": len(findings), "findings": findings}
    except Exception as e:
        is_running = False
        logger.error("Analysis failed: %s", e)
        return {"status": "failed", "error": str(e)}


class AnalyzeRequest(BaseModel):
    variance_threshold_pct: float = 15.0  # flag above X%
    max_results: int = 10


@app.post("/analyze")
async def analyze_with_params(req: AnalyzeRequest):
    """Run FinOps analysis with user-configured thresholds and return results directly."""
    from costpilot_common.database import SessionLocal
    from sqlalchemy import text
    db = SessionLocal()
    results = {"budget_variances": [], "unreconciled_invoices": [], "summary": {}}
    try:
        # Budget variances
        variance_threshold = 1 + req.variance_threshold_pct / 100
        rows = db.execute(text("""
            SELECT department, category, budgeted_amount, actual_amount,
                   (actual_amount - budgeted_amount) as variance,
                   ROUND(((actual_amount - budgeted_amount) / budgeted_amount * 100)::numeric, 1) as pct
            FROM budget_vs_actual
            WHERE period = (SELECT MAX(period) FROM budget_vs_actual)
              AND actual_amount > budgeted_amount * :threshold
            ORDER BY (actual_amount - budgeted_amount) DESC
            LIMIT :lim
        """), {"threshold": variance_threshold, "lim": req.max_results}).fetchall()
        for r in rows:
            results["budget_variances"].append({
                "department": r[0],
                "category": r[1],
                "budgeted_amount": float(r[2]),
                "actual_amount": float(r[3]),
                "variance": float(r[4]),
                "variance_pct": float(r[5])
            })

        # Unreconciled invoices
        rows = db.execute(text("""
            SELECT v.name, COUNT(*) as cnt, SUM(i.amount) as total
            FROM invoices i
            JOIN vendors v ON v.id = i.vendor_id
            WHERE i.reconciled = false
            GROUP BY v.name
            ORDER BY SUM(i.amount) DESC
            LIMIT :lim
        """), {"lim": req.max_results}).fetchall()
        for r in rows:
            results["unreconciled_invoices"].append({
                "vendor": r[0],
                "invoice_count": r[1],
                "total_amount": float(r[2]),
                "potential_recovery": float(r[2]) * 0.02
            })

        total_variance = sum(v["variance"] for v in results["budget_variances"])
        total_unreconciled = sum(u["total_amount"] for u in results["unreconciled_invoices"])
        total_recovery = sum(u["potential_recovery"] for u in results["unreconciled_invoices"])
        results["summary"] = {
            "total_findings": len(results["budget_variances"]) + len(results["unreconciled_invoices"]),
            "variances_found": len(results["budget_variances"]),
            "unreconciled_vendors": len(results["unreconciled_invoices"]),
            "total_budget_variance": total_variance,
            "total_unreconciled_amount": total_unreconciled,
            "total_potential_recovery": total_recovery,
            "config_used": {
                "variance_threshold_pct": req.variance_threshold_pct
            }
        }
    finally:
        db.close()
    return results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
