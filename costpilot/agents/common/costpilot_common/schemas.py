from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field
from uuid import UUID, uuid4


class InsightSchema(BaseModel):
    insight_id: UUID = Field(default_factory=uuid4)
    source_agent: str
    insight_type: str
    entity_type: str
    entity_id: str
    summary: str
    financial_impact: Decimal
    confidence: Decimal
    related_data: dict | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ProposalSchema(BaseModel):
    proposal_id: UUID = Field(default_factory=uuid4)
    agent_type: str
    title: str
    description: str
    estimated_savings: Decimal
    risk_level: str = "Medium"
    evidence: dict | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AlertSchema(BaseModel):
    alert_id: UUID = Field(default_factory=uuid4)
    agent_type: str
    severity: str = "Info"
    title: str
    message: str
    data_snapshot: dict | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
