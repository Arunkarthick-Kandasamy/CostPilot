import json
import logging
import pika
from decimal import Decimal
from datetime import datetime
from uuid import UUID
from costpilot_common.config import RABBITMQ_URL
from costpilot_common.schemas import InsightSchema, ProposalSchema, AlertSchema

logger = logging.getLogger(__name__)


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        if isinstance(o, UUID):
            return str(o)
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)


def _get_connection():
    params = pika.URLParameters(RABBITMQ_URL)
    return pika.BlockingConnection(params)


def publish_insight(insight: InsightSchema):
    """Publish an insight to the MassTransit-compatible exchange."""
    conn = _get_connection()
    channel = conn.channel()
    exchange = "CostPilot.Contracts:InsightPublished"
    channel.exchange_declare(exchange=exchange, exchange_type="fanout", durable=True)

    body = {
        "insightId": str(insight.insight_id),
        "sourceAgent": insight.source_agent,
        "insightType": insight.insight_type,
        "entityType": insight.entity_type,
        "entityId": insight.entity_id,
        "summary": insight.summary,
        "financialImpact": float(insight.financial_impact),
        "confidence": float(insight.confidence),
        "relatedData": json.dumps(insight.related_data) if insight.related_data else None,
        "createdAt": insight.created_at.isoformat(),
    }

    channel.basic_publish(
        exchange=exchange,
        routing_key="",
        body=json.dumps(body, cls=DecimalEncoder),
        properties=pika.BasicProperties(
            content_type="application/json",
            delivery_mode=2,
            headers={"MT-MessageType": "urn:message:CostPilot.Contracts:InsightPublished"},
        ),
    )
    conn.close()
    logger.info("Published insight: %s", insight.summary)


def publish_proposal(proposal: ProposalSchema):
    """Publish a proposal to the MassTransit-compatible exchange."""
    conn = _get_connection()
    channel = conn.channel()
    exchange = "CostPilot.Contracts:ProposalCreated"
    channel.exchange_declare(exchange=exchange, exchange_type="fanout", durable=True)

    body = {
        "proposalId": str(proposal.proposal_id),
        "agentType": proposal.agent_type,
        "title": proposal.title,
        "description": proposal.description,
        "estimatedSavings": float(proposal.estimated_savings),
        "riskLevel": proposal.risk_level,
        "evidence": json.dumps(proposal.evidence) if proposal.evidence else None,
        "createdAt": proposal.created_at.isoformat(),
    }

    channel.basic_publish(
        exchange=exchange,
        routing_key="",
        body=json.dumps(body, cls=DecimalEncoder),
        properties=pika.BasicProperties(
            content_type="application/json",
            delivery_mode=2,
            headers={"MT-MessageType": "urn:message:CostPilot.Contracts:ProposalCreated"},
        ),
    )
    conn.close()
    logger.info("Published proposal: %s", proposal.title)


def publish_alert(alert: AlertSchema):
    """Publish an alert to the MassTransit-compatible exchange."""
    conn = _get_connection()
    channel = conn.channel()
    exchange = "CostPilot.Contracts:AgentAlertRaised"
    channel.exchange_declare(exchange=exchange, exchange_type="fanout", durable=True)

    body = {
        "alertId": str(alert.alert_id),
        "agentType": alert.agent_type,
        "severity": alert.severity,
        "title": alert.title,
        "message": alert.message,
        "dataSnapshot": json.dumps(alert.data_snapshot) if alert.data_snapshot else None,
        "createdAt": alert.created_at.isoformat(),
    }

    channel.basic_publish(
        exchange=exchange,
        routing_key="",
        body=json.dumps(body, cls=DecimalEncoder),
        properties=pika.BasicProperties(
            content_type="application/json",
            delivery_mode=2,
            headers={"MT-MessageType": "urn:message:CostPilot.Contracts:AgentAlertRaised"},
        ),
    )
    conn.close()
    logger.info("Published alert: %s", alert.title)
