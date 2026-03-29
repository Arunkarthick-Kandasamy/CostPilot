"""Gateway API client — agents use this to persist findings directly via the .NET Gateway REST API."""

import json
import logging
import os
import requests
from decimal import Decimal
from datetime import datetime
from uuid import UUID

logger = logging.getLogger(__name__)

GATEWAY_URL = os.environ.get("GATEWAY_URL", "http://localhost:5000")
_token: str | None = None


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        if isinstance(o, UUID):
            return str(o)
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)


def _get_token() -> str:
    global _token
    if _token:
        return _token
    resp = requests.post(f"{GATEWAY_URL}/api/auth/login", json={
        "email": "admin@costpilot.com",
        "password": "admin123"
    })
    resp.raise_for_status()
    _token = resp.json()["token"]
    return _token


def _headers():
    return {
        "Authorization": f"Bearer {_get_token()}",
        "Content-Type": "application/json"
    }


def save_proposal(agent_type: str, title: str, description: str,
                   estimated_savings: float, risk_level: str, evidence: dict | None = None):
    """Save a proposal directly to the gateway database."""
    from costpilot_common.database import SessionLocal
    from sqlalchemy import text
    import uuid

    db = SessionLocal()
    try:
        pid = str(uuid.uuid4())
        db.execute(text("""
            INSERT INTO "ActionProposals"
            ("Id", "AgentType", "Title", "Description", "EstimatedSavings",
             "RiskLevel", "Status", "Evidence", "CreatedAt")
            VALUES (:id, :agent, :title, :desc, :savings, :risk, 'Pending', :evidence, NOW())
        """), {
            "id": pid,
            "agent": agent_type,
            "title": title[:500],
            "desc": description,
            "savings": estimated_savings,
            "risk": risk_level,
            "evidence": json.dumps(evidence, cls=DecimalEncoder) if evidence else None,
        })
        db.commit()
        logger.info("Saved proposal: %s ($%.0f)", title[:80], estimated_savings)
        return pid
    except Exception as e:
        db.rollback()
        logger.error("Failed to save proposal: %s", e)
        return None
    finally:
        db.close()


def save_insight(source_agent: str, insight_type: str, entity_type: str,
                  entity_id: str, summary: str, financial_impact: float,
                  confidence: float, related_data: dict | None = None):
    """Save an insight directly to the gateway database."""
    from costpilot_common.database import SessionLocal
    from sqlalchemy import text
    import uuid

    db = SessionLocal()
    try:
        iid = str(uuid.uuid4())
        db.execute(text("""
            INSERT INTO "AgentInsights"
            ("Id", "SourceAgent", "InsightType", "EntityType", "EntityId",
             "Summary", "FinancialImpact", "Confidence", "RelatedData", "CreatedAt")
            VALUES (:id, :source, :itype, :etype, :eid, :summary, :impact, :conf, :data, NOW())
        """), {
            "id": iid,
            "source": source_agent,
            "itype": insight_type,
            "etype": entity_type,
            "eid": entity_id[:200],
            "summary": summary[:2000],
            "impact": financial_impact,
            "conf": confidence,
            "data": json.dumps(related_data, cls=DecimalEncoder) if related_data else None,
        })
        db.commit()
        logger.info("Saved insight: [%s] %s", source_agent, summary[:80])
        return iid
    except Exception as e:
        db.rollback()
        logger.error("Failed to save insight: %s", e)
        return None
    finally:
        db.close()


def save_alert(agent_type: str, severity: str, title: str, message: str,
                data_snapshot: dict | None = None):
    """Save an alert directly to the gateway database."""
    from costpilot_common.database import SessionLocal
    from sqlalchemy import text
    import uuid

    db = SessionLocal()
    try:
        aid = str(uuid.uuid4())
        db.execute(text("""
            INSERT INTO "AgentAlerts"
            ("Id", "AgentType", "Severity", "Title", "Message",
             "DataSnapshot", "Acknowledged", "CreatedAt")
            VALUES (:id, :agent, :severity, :title, :message, :snapshot, false, NOW())
        """), {
            "id": aid,
            "agent": agent_type,
            "severity": severity,
            "title": title[:500],
            "message": message,
            "snapshot": json.dumps(data_snapshot, cls=DecimalEncoder) if data_snapshot else None,
        })
        db.commit()
        logger.info("Saved alert: [%s] %s", agent_type, title[:80])
        return aid
    except Exception as e:
        db.rollback()
        logger.error("Failed to save alert: %s", e)
        return None
    finally:
        db.close()
