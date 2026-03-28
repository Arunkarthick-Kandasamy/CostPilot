import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from decimal import Decimal

from fastapi import FastAPI
from costpilot_common.messaging import publish_proposal, publish_insight, publish_alert
from costpilot_common.schemas import ProposalSchema, InsightSchema, AlertSchema
from resource_agent.crew import create_resource_crew

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Resource Optimization Agent starting...")
    yield


app = FastAPI(title="Resource Optimization Agent", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "healthy", "agent": "resource", "timestamp": datetime.utcnow().isoformat()}


@app.post("/run")
async def run_analysis():
    logger.info("Starting resource analysis...")
    try:
        crew = create_resource_crew()
        result = crew.kickoff()

        try:
            findings = json.loads(result.raw) if isinstance(result.raw, str) else result.raw
        except (json.JSONDecodeError, TypeError):
            findings = [{"description": result.raw, "monthly_savings": 0}]

        for finding in findings if isinstance(findings, list) else [findings]:
            savings = Decimal(str(finding.get("monthly_savings", finding.get("waste_amount", 0))))
            annual = savings * 12

            if savings > 0:
                publish_proposal(ProposalSchema(
                    agent_type="Resource",
                    title=f"Resource optimization: {finding.get('action', finding.get('description', 'Consolidation opportunity'))[:100]}",
                    description=json.dumps(finding),
                    estimated_savings=annual,
                    risk_level="Low" if savings < 5000 else "Medium",
                    evidence=finding,
                ))

            publish_insight(InsightSchema(
                source_agent="Resource",
                insight_type=finding.get("type", "underutilized"),
                entity_type=finding.get("resource_type", "resource"),
                entity_id=str(finding.get("resource_id", finding.get("name", "unknown"))),
                summary=finding.get("description", str(finding))[:500],
                financial_impact=annual,
                confidence=Decimal(str(finding.get("confidence", 0.85))),
                related_data=finding,
            ))

        publish_alert(AlertSchema(
            agent_type="Resource", severity="Info",
            title="Resource analysis completed",
            message=f"Found {len(findings) if isinstance(findings, list) else 1} findings",
        ))
        return {"status": "completed", "findings_count": len(findings) if isinstance(findings, list) else 1}

    except Exception as e:
        logger.error("Resource analysis failed: %s", e)
        publish_alert(AlertSchema(
            agent_type="Resource", severity="Critical",
            title="Resource analysis failed", message=str(e),
        ))
        return {"status": "failed", "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
