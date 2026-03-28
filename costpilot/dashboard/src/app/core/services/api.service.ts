import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { DashboardSummary, Proposal, PaginatedResponse, AgentStatus, AgentAlert, AgentInsight, CorrelatedFinding, CostImpact, SavingsTrend } from '../types/api.types';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  getDashboardSummary() {
    return this.http.get<DashboardSummary>('/api/dashboard/summary');
  }

  getSavingsTrend(months = 12) {
    return this.http.get<SavingsTrend[]>('/api/dashboard/savings-trend', { params: { months } });
  }

  getProposals(page = 1, size = 20, status?: string, agent?: string) {
    let params = new HttpParams().set('page', page).set('size', size);
    if (status) params = params.set('status', status);
    if (agent) params = params.set('agent', agent);
    return this.http.get<PaginatedResponse<Proposal>>('/api/proposals', { params });
  }

  getProposal(id: string) {
    return this.http.get<Proposal>(`/api/proposals/${id}`);
  }

  approveProposal(id: string, comment?: string) {
    return this.http.put<Proposal>(`/api/proposals/${id}/approve`, { comment });
  }

  rejectProposal(id: string, reason: string) {
    return this.http.put<Proposal>(`/api/proposals/${id}/reject`, { reason });
  }

  getAgentStatus(type: string) {
    return this.http.get<AgentStatus>(`/api/agents/${type}/status`);
  }

  triggerAgent(type: string) {
    return this.http.post(`/api/agents/${type}/trigger`, {});
  }

  getAgentAlerts(type: string) {
    return this.http.get<AgentAlert[]>(`/api/agents/${type}/alerts`);
  }

  getInsights() {
    return this.http.get<AgentInsight[]>('/api/insights');
  }

  getCorrelatedFindings() {
    return this.http.get<CorrelatedFinding[]>('/api/insights/correlated');
  }

  getImpacts() {
    return this.http.get<CostImpact[]>('/api/impacts');
  }

  getImpactSummary() {
    return this.http.get<{ totalRealized: number; byMonth: { year: number; month: number; total: number }[] }>('/api/impacts/summary');
  }

  getOperationalStats() {
    return this.http.get<Record<string, number>>('/api/data/stats');
  }

  getVendors() {
    return this.http.get<{ total: number; items: any[] }>('/api/data/vendors');
  }

  getPurchaseOrders(page = 1, size = 20) {
    return this.http.get<{ total: number; items: any[] }>('/api/data/purchase-orders', { params: { page, size } });
  }

  getInvoices(page = 1, size = 20) {
    return this.http.get<{ total: number; items: any[] }>('/api/data/invoices', { params: { page, size } });
  }

  getSLAServices() {
    return this.http.get<{ total: number; items: any[] }>('/api/data/services');
  }

  getServers() {
    return this.http.get<{ total: number; items: any[] }>('/api/data/servers');
  }

  getSoftwareTools() {
    return this.http.get<{ total: number; items: any[] }>('/api/data/software-tools');
  }

  getBudgetVsActual() {
    return this.http.get<{ total: number; items: any[] }>('/api/data/budget-vs-actual');
  }

  getImpactComparison() {
    return this.http.get<{ totalEstimated: number; totalActual: number; variance: number; items: any[] }>('/api/impacts/comparison');
  }

  getAuditLog(page = 1, size = 50) {
    return this.http.get<{ total: number; items: any[] }>('/api/audit', { params: { page, size } });
  }
}
