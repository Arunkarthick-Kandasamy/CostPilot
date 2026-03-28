import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from decimal import Decimal

from fastapi import FastAPI
from costpilot_common.messaging import publish_proposal, publish_insight, publish_alert
from costpilot_common.schemas import ProposalSchema, InsightSchema, AlertSchema
from finops_agent.crew import create_finops_crew

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("FinOps Agent starting...")
    yield


app = FastAPI(title="FinOps Agent", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "healthy", "agent": "finops", "timestamp": datetime.utcnow().isoformat()}


@app.post("/run")
async def run_analysis():
    logger.info("Starting FinOps analysis...")
    try:
        crew = create_finops_crew()
        result = crew.kickoff()

        try:
            findings = json.loads(result.raw) if isinstance(result.raw, str) else result.raw
        except (json.JSONDecodeError, TypeError):
            findings = [{"description": result.raw, "variance_amount": 0}]

        for finding in findings if isinstance(findings, list) else [findings]:
            amount = Decimal(str(finding.get("variance_amount", finding.get("total_amount", 0))))

            if amount > 0:
                publish_proposal(ProposalSchema(
                    agent_type="Finops",
                    title=f"FinOps finding: {finding.get('description', str(finding))[:100]}",
                    description=json.dumps(finding),
                    estimated_savings=amount,
                    risk_level="Low",
                    evidence=finding,
                ))

            publish_insight(InsightSchema(
                source_agent="Finops",
                insight_type=finding.get("type", "variance_detected"),
                entity_type=finding.get("entity_type", "transaction"),
                entity_id=str(finding.get("invoice_id", finding.get("department", "unknown"))),
                summary=finding.get("description", str(finding))[:500],
                financial_impact=abs(amount),
                confidence=Decimal(str(finding.get("confidence", 0.9))),
                related_data=finding,
            ))

        publish_alert(AlertSchema(
            agent_type="Finops", severity="Info",
            title="FinOps analysis completed",
            message=f"Found {len(findings) if isinstance(findings, list) else 1} findings",
        ))
        return {"status": "completed", "findings_count": len(findings) if isinstance(findings, list) else 1}

    except Exception as e:
        logger.error("FinOps analysis failed: %s", e)
        publish_alert(AlertSchema(
            agent_type="Finops", severity="Critical",
            title="FinOps analysis failed", message=str(e),
        ))
        return {"status": "failed", "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
