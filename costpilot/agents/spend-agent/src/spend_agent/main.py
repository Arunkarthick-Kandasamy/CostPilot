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
        return {"status": "completed", "mode": "ai" if USE_AI else "demo", "findings_count": len(findings), "findings": findings}
    except Exception as e:
        is_running = False
        logger.error("Analysis failed: %s", e)
        return {"status": "failed", "error": str(e)}


class AnalyzeRequest(BaseModel):
    price_anomaly_threshold: float = 25.0  # percentage above average
    duplicate_window_days: int = 30
    rate_above_market_pct: float = 15.0
    max_results: int = 10


@app.post("/analyze")
async def analyze_with_params(req: AnalyzeRequest):
    """Run analysis with user-configured thresholds and return results directly."""
    from costpilot_common.database import SessionLocal
    from sqlalchemy import text
    db = SessionLocal()
    results = {"anomalies": [], "duplicates": [], "rate_issues": [], "summary": {}}
    try:
        # Price anomalies
        threshold = 1 + req.price_anomaly_threshold / 100
        rows = db.execute(text("""
            SELECT v.name, po.item_description, ROUND(po.unit_price::numeric,0) as price,
                   ROUND(sub.avg_price::numeric,0) as avg_price,
                   ROUND(((po.unit_price - sub.avg_price)/sub.avg_price*100)::numeric,1) as pct_above,
                   po.quantity, ROUND((po.unit_price - sub.avg_price)::numeric * po.quantity, 0) as total_overpay
            FROM purchase_orders po
            JOIN vendors v ON v.id = po.vendor_id
            JOIN (SELECT item_description, AVG(unit_price) as avg_price
                  FROM purchase_orders GROUP BY item_description HAVING COUNT(*)>3) sub
                ON sub.item_description = po.item_description
            WHERE po.unit_price > sub.avg_price * :thresh
            ORDER BY (po.unit_price - sub.avg_price) * po.quantity DESC
            LIMIT :lim
        """), {"thresh": threshold, "lim": req.max_results}).fetchall()
        for r in rows:
            results["anomalies"].append({
                "vendor": r[0], "item": r[1], "charged": float(r[2]),
                "average": float(r[3]), "pct_above": float(r[4]),
                "quantity": r[5], "overpayment": float(r[6])
            })

        # Duplicates
        rows = db.execute(text("""
            SELECT v.name, a.amount, COUNT(*) as times,
                   a.amount * (COUNT(*)-1) as wasted
            FROM invoices a
            JOIN invoices b ON a.vendor_id=b.vendor_id AND a.amount=b.amount AND a.id<b.id
                AND ABS(a.invoice_date - b.invoice_date) < :days
            JOIN vendors v ON v.id = a.vendor_id
            GROUP BY v.name, a.amount
            ORDER BY a.amount DESC LIMIT :lim
        """), {"days": req.duplicate_window_days, "lim": req.max_results}).fetchall()
        for r in rows:
            results["duplicates"].append({
                "vendor": r[0], "amount": float(r[1]),
                "times_billed": r[2], "wasted": float(r[3])
            })

        # Rate issues
        rate_thresh = 1 + req.rate_above_market_pct / 100
        rows = db.execute(text("""
            SELECT v.name, vc.service_category, ROUND(vc.annual_cost::numeric,0) as cost,
                   ROUND(mb.market_average::numeric,0) as market,
                   ROUND(((vc.annual_cost-mb.market_average)/mb.market_average*100)::numeric,1) as pct,
                   ROUND((vc.annual_cost - mb.market_average)::numeric,0) as potential_savings
            FROM vendor_contracts vc
            JOIN vendors v ON v.id = vc.vendor_id
            JOIN market_benchmarks mb ON mb.service_category = vc.service_category
            WHERE vc.annual_cost > mb.market_average * :thresh
            ORDER BY (vc.annual_cost - mb.market_average) DESC LIMIT :lim
        """), {"thresh": rate_thresh, "lim": req.max_results}).fetchall()
        for r in rows:
            results["rate_issues"].append({
                "vendor": r[0], "category": r[1], "annual_cost": float(r[2]),
                "market_rate": float(r[3]), "pct_above": float(r[4]),
                "potential_savings": float(r[5])
            })

        total_anomaly_savings = sum(a["overpayment"] for a in results["anomalies"])
        total_duplicate_waste = sum(d["wasted"] for d in results["duplicates"])
        total_rate_savings = sum(r["potential_savings"] for r in results["rate_issues"])
        results["summary"] = {
            "total_findings": len(results["anomalies"]) + len(results["duplicates"]) + len(results["rate_issues"]),
            "anomalies_found": len(results["anomalies"]),
            "duplicates_found": len(results["duplicates"]),
            "rate_issues_found": len(results["rate_issues"]),
            "total_potential_savings": total_anomaly_savings + total_duplicate_waste + total_rate_savings,
            "config_used": {
                "price_threshold": req.price_anomaly_threshold,
                "duplicate_window": req.duplicate_window_days,
                "rate_threshold": req.rate_above_market_pct
            }
        }
    finally:
        db.close()
    return results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
