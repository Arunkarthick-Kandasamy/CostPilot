import asyncio
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from decimal import Decimal

from fastapi import FastAPI
from costpilot_common.config import AGENT_TYPE
from costpilot_common.messaging import publish_proposal, publish_insight, publish_alert
from costpilot_common.schemas import ProposalSchema, InsightSchema, AlertSchema
from spend_agent.crew import create_spend_crew

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Spend Intelligence Agent starting...")
    yield
    logger.info("Spend Intelligence Agent shutting down...")


app = FastAPI(title="Spend Intelligence Agent", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "healthy", "agent": "spend", "timestamp": datetime.utcnow().isoformat()}


@app.post("/run")
async def run_analysis():
    """Trigger a full spend analysis run."""
    logger.info("Starting spend analysis...")

    try:
        crew = create_spend_crew()
        result = crew.kickoff()

        # Parse results and publish findings
        try:
            findings = json.loads(result.raw) if isinstance(result.raw, str) else result.raw
        except (json.JSONDecodeError, TypeError):
            findings = [{"description": result.raw, "financial_impact": 0}]

        for finding in findings if isinstance(findings, list) else [findings]:
            impact = Decimal(str(finding.get("financial_impact", 0)))
            if impact > 0:
                publish_proposal(ProposalSchema(
                    agent_type="Spend",
                    title=f"Spend optimization: {finding.get('description', 'Cost saving opportunity')[:100]}",
                    description=json.dumps(finding),
                    estimated_savings=impact,
                    risk_level="Medium" if impact < 50000 else "High",
                    evidence=finding,
                ))

            publish_insight(InsightSchema(
                source_agent="Spend",
                insight_type=finding.get("type", "cost_anomaly"),
                entity_type="vendor",
                entity_id=str(finding.get("vendor_id", "unknown")),
                summary=finding.get("description", str(finding))[:500],
                financial_impact=impact,
                confidence=Decimal(str(finding.get("confidence", 0.7))),
                related_data=finding,
            ))

        publish_alert(AlertSchema(
            agent_type="Spend",
            severity="Info",
            title="Spend analysis completed",
            message=f"Found {len(findings) if isinstance(findings, list) else 1} findings",
        ))

        return {"status": "completed", "findings_count": len(findings) if isinstance(findings, list) else 1}

    except Exception as e:
        logger.error("Spend analysis failed: %s", e)
        publish_alert(AlertSchema(
            agent_type="Spend", severity="Critical",
            title="Spend analysis failed", message=str(e),
        ))
        return {"status": "failed", "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
