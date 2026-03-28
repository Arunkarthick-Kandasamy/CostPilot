import asyncio
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from decimal import Decimal

from fastapi import FastAPI
from costpilot_common.messaging import publish_proposal, publish_insight, publish_alert
from costpilot_common.schemas import ProposalSchema, InsightSchema, AlertSchema
from sla_agent.crew import create_sla_crew

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SLA Prevention Agent starting...")
    yield
    logger.info("SLA Prevention Agent shutting down...")


app = FastAPI(title="SLA Prevention Agent", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "healthy", "agent": "sla", "timestamp": datetime.utcnow().isoformat()}


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
