export interface DashboardSummary {
  totalSavingsIdentified: number;
  totalSavingsRealized: number;
  pendingProposals: number;
  executedProposals: number;
  topFindings: Proposal[];
  savingsByAgent: AgentSavings[];
  recentAlerts: AgentAlert[];
}

export interface Proposal {
  id: string;
  agentType: string;
  title: string;
  description: string;
  estimatedSavings: number;
  riskLevel: string;
  status: string;
  evidence?: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  executedAt?: string;
}

export interface AgentSavings {
  agentType: string;
  totalSavings: number;
  count: number;
}

export interface AgentAlert {
  id: string;
  agentType: string;
  severity: string;
  title: string;
  message: string;
  createdAt: string;
}

export interface AgentInsight {
  id: string;
  sourceAgent: string;
  insightType: string;
  entityType: string;
  entityId: string;
  summary: string;
  financialImpact: number;
  confidence: number;
  createdAt: string;
}

export interface CorrelatedFinding {
  id: string;
  agentsInvolved: string[];
  summary: string;
  combinedImpact: number;
  confidence: number;
  createdAt: string;
}

export interface CostImpact {
  id: string;
  proposalId: string;
  actualSavings: number;
  recordedAt: string;
  proposal?: Proposal;
}

export interface SavingsTrend {
  year: number;
  month: number;
  identified: number;
  count: number;
}

export interface AgentStatus {
  agentType: string;
  proposalCount: number;
  insightCount: number;
  lastActivity?: string;
  status: string;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}
