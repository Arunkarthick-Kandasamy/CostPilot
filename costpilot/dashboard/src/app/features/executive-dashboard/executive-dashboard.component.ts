import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { echarts } from '../../core/providers/echarts-setup';
import { ApiService } from '../../core/services/api.service';
import { ExcelExportService } from '../../core/services/excel-export.service';
import { SignalRService } from '../../core/services/signalr.service';
import { DashboardSummary, SavingsTrend, Proposal } from '../../core/types/api.types';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'app-executive-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatIconModule, MatCardModule, MatSelectModule, MatFormFieldModule, MatButtonToggleModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  template: `
    <div class="dash-header">
      <div>
        <h2>Executive Dashboard</h2>
        <p class="sub">Real-time cost intelligence across all agents</p>
      </div>
      <div class="header-actions">
        <button class="btn-export" (click)="exportData()">
          <mat-icon>download</mat-icon> Export Report
        </button>
        <button class="btn-export" (click)="refresh()">
          <mat-icon>refresh</mat-icon> Refresh
        </button>
      </div>
    </div>

    <!-- KPI Strip -->
    <div class="kpi-strip anim-in">
      <div class="kpi green">
        <div class="kpi-icon"><mat-icon>savings</mat-icon></div>
        <div class="kpi-body">
          <div class="kpi-val mono">\${{ formatCurrency(filteredSavingsIdentified()) }}</div>
          <div class="kpi-lbl">Savings Identified</div>
        </div>
        <div class="kpi-trend up"><mat-icon>trending_up</mat-icon></div>
      </div>
      <div class="kpi blue">
        <div class="kpi-icon"><mat-icon>account_balance_wallet</mat-icon></div>
        <div class="kpi-body">
          <div class="kpi-val mono">\${{ formatCurrency(summary()?.totalSavingsRealized ?? 0) }}</div>
          <div class="kpi-lbl">Savings Realized</div>
        </div>
      </div>
      <div class="kpi amber">
        <div class="kpi-icon"><mat-icon>pending_actions</mat-icon></div>
        <div class="kpi-body">
          <div class="kpi-val mono">{{ filteredPending() }}</div>
          <div class="kpi-lbl">Pending Approvals</div>
        </div>
        @if (filteredPending() > 0) {
          <a routerLink="/proposals" class="kpi-action">Review</a>
        }
      </div>
      <div class="kpi purple">
        <div class="kpi-icon"><mat-icon>verified</mat-icon></div>
        <div class="kpi-body">
          <div class="kpi-val mono">{{ filteredExecuted() }}</div>
          <div class="kpi-lbl">Executed Actions</div>
        </div>
      </div>
    </div>

    <!-- Global Filters -->
    <div class="filter-bar anim-in anim-d1">
      <div class="filter-group">
        <mat-icon class="filter-icon">filter_list</mat-icon>
        <span class="filter-label">Filters</span>
      </div>

      <div class="filter-chips">
        <mat-button-toggle-group [(ngModel)]="selectedAgent" (change)="applyFilters()" appearance="standard">
          <mat-button-toggle value="all">All Agents</mat-button-toggle>
          <mat-button-toggle value="Spend">
            <span class="chip-dot" style="background:#10b981"></span> Spend
          </mat-button-toggle>
          <mat-button-toggle value="Sla">
            <span class="chip-dot" style="background:#ef4444"></span> SLA
          </mat-button-toggle>
          <mat-button-toggle value="Resource">
            <span class="chip-dot" style="background:#3b82f6"></span> Resource
          </mat-button-toggle>
          <mat-button-toggle value="Finops">
            <span class="chip-dot" style="background:#f59e0b"></span> FinOps
          </mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      <div class="filter-chips">
        <mat-button-toggle-group [(ngModel)]="selectedPeriod" (change)="applyFilters()" appearance="standard">
          <mat-button-toggle value="3">3M</mat-button-toggle>
          <mat-button-toggle value="6">6M</mat-button-toggle>
          <mat-button-toggle value="12">12M</mat-button-toggle>
          <mat-button-toggle value="all">All</mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      <div class="filter-chips">
        <mat-button-toggle-group [(ngModel)]="selectedStatus" (change)="applyFilters()" appearance="standard">
          <mat-button-toggle value="all">All Status</mat-button-toggle>
          <mat-button-toggle value="Pending">Pending</mat-button-toggle>
          <mat-button-toggle value="Approved">Approved</mat-button-toggle>
          <mat-button-toggle value="Executed">Executed</mat-button-toggle>
          <mat-button-toggle value="Rejected">Rejected</mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      @if (isFiltered()) {
        <button class="clear-btn" (click)="clearFilters()">
          <mat-icon>close</mat-icon> Clear
        </button>
      }
    </div>

    <!-- Charts Row -->
    <div class="charts-grid anim-in anim-d2">
      <mat-card class="chart-card">
        <div class="card-head">
          <div>
            <div class="card-title">SAVINGS TREND</div>
            <div class="card-subtitle">
              {{ selectedAgent === 'all' ? 'All agents' : selectedAgent }} &middot;
              {{ selectedPeriod === 'all' ? 'All time' : selectedPeriod + ' months' }}
            </div>
          </div>
          <div class="chart-type-toggle">
            <button class="toggle-btn" [class.active]="trendChartType === 'bar'" (click)="trendChartType = 'bar'; applyFilters()">
              <mat-icon>bar_chart</mat-icon>
            </button>
            <button class="toggle-btn" [class.active]="trendChartType === 'line'" (click)="trendChartType = 'line'; applyFilters()">
              <mat-icon>show_chart</mat-icon>
            </button>
            <button class="toggle-btn" [class.active]="trendChartType === 'area'" (click)="trendChartType = 'area'; applyFilters()">
              <mat-icon>area_chart</mat-icon>
            </button>
          </div>
        </div>
        <div echarts [options]="trendChart()" style="height: 300px;"></div>
      </mat-card>

      <mat-card class="chart-card">
        <div class="card-head">
          <div>
            <div class="card-title">AGENT PERFORMANCE</div>
            <div class="card-subtitle">
              {{ selectedStatus === 'all' ? 'All statuses' : selectedStatus }} &middot;
              {{ selectedPeriod === 'all' ? 'All time' : selectedPeriod + ' months' }}
            </div>
          </div>
          <div class="chart-type-toggle">
            <button class="toggle-btn" [class.active]="agentChartType === 'pie'" (click)="agentChartType = 'pie'; applyFilters()">
              <mat-icon>pie_chart</mat-icon>
            </button>
            <button class="toggle-btn" [class.active]="agentChartType === 'bar'" (click)="agentChartType = 'bar'; applyFilters()">
              <mat-icon>bar_chart</mat-icon>
            </button>
          </div>
        </div>
        <div echarts [options]="agentChart()" style="height: 300px;"></div>
      </mat-card>
    </div>

    <!-- Risk Distribution + Status Breakdown -->
    <div class="charts-grid anim-in anim-d3">
      <mat-card class="chart-card">
        <div class="card-head">
          <div>
            <div class="card-title">RISK DISTRIBUTION</div>
            <div class="card-subtitle">Proposals by risk level</div>
          </div>
        </div>
        <div echarts [options]="riskChart()" style="height: 260px;"></div>
      </mat-card>

      <mat-card class="chart-card">
        <div class="card-head">
          <div>
            <div class="card-title">STATUS BREAKDOWN</div>
            <div class="card-subtitle">Pipeline overview</div>
          </div>
        </div>
        <div echarts [options]="statusChart()" style="height: 260px;"></div>
      </mat-card>
    </div>

    <!-- Agent Status + Top Findings -->
    <div class="bottom-grid anim-in anim-d4">
      <mat-card>
        <div class="card-head">
          <div>
            <div class="card-title">AGENT STATUS</div>
            <div class="card-subtitle">Real-time monitoring</div>
          </div>
        </div>
        <div class="agent-list">
          <div class="agent-row">
            <span class="dot-lg" style="background: var(--agent-spend)"></span>
            <span class="agent-name">Spend Intelligence</span>
            <span class="agent-stat mono text-green">Active</span>
            <a routerLink="/agents/spend" class="agent-link">View <mat-icon>chevron_right</mat-icon></a>
          </div>
          <div class="agent-row">
            <span class="dot-lg" style="background: var(--agent-sla)"></span>
            <span class="agent-name">SLA Prevention</span>
            <span class="agent-stat mono text-green">Active</span>
            <a routerLink="/agents/sla" class="agent-link">View <mat-icon>chevron_right</mat-icon></a>
          </div>
          <div class="agent-row">
            <span class="dot-lg" style="background: var(--agent-resource)"></span>
            <span class="agent-name">Resource Optimization</span>
            <span class="agent-stat mono text-green">Active</span>
            <a routerLink="/agents/resource" class="agent-link">View <mat-icon>chevron_right</mat-icon></a>
          </div>
          <div class="agent-row">
            <span class="dot-lg" style="background: var(--agent-finops)"></span>
            <span class="agent-name">FinOps</span>
            <span class="agent-stat mono text-green">Active</span>
            <a routerLink="/agents/finops" class="agent-link">View <mat-icon>chevron_right</mat-icon></a>
          </div>
        </div>
      </mat-card>

      <mat-card>
        <div class="card-head">
          <div>
            <div class="card-title">TOP FINDINGS</div>
            <div class="card-subtitle">
              Filtered: {{ filteredFindings().length }} results
            </div>
          </div>
          <a routerLink="/proposals" class="btn-export">View all <mat-icon>east</mat-icon></a>
        </div>
        @if (filteredFindings().length) {
          <div class="findings-list">
            @for (f of filteredFindings().slice(0, 6); track f.id) {
              <a [routerLink]="['/proposals', f.id]" class="finding-row">
                <div class="finding-agent" [style.color]="agentColor(f.agentType)">
                  <mat-icon>{{ agentIcon(f.agentType) }}</mat-icon>
                </div>
                <div class="finding-info">
                  <div class="finding-title">{{ f.title }}</div>
                  <div class="finding-meta">{{ f.agentType }} &middot; {{ f.riskLevel }} risk &middot; {{ f.status }}</div>
                </div>
                <div class="finding-amount mono">\${{ formatCurrency(f.estimatedSavings) }}</div>
              </a>
            }
          </div>
        } @else {
          <div class="empty-state">
            <mat-icon>filter_list_off</mat-icon>
            <p>No findings match current filters.</p>
          </div>
        }
      </mat-card>
    </div>

    <!-- Recent Alerts -->
    @if (summary()?.recentAlerts?.length) {
      <mat-card class="anim-in anim-d5">
        <div class="card-head">
          <div>
            <div class="card-title">RECENT ALERTS</div>
            <div class="card-subtitle">Unacknowledged notifications</div>
          </div>
        </div>
        <div class="alerts-list">
          @for (a of summary()!.recentAlerts; track a.id) {
            <div class="alert-row" [class]="'severity-' + a.severity.toLowerCase()">
              <mat-icon>{{ a.severity === 'Critical' ? 'error' : a.severity === 'Warning' ? 'warning_amber' : 'info' }}</mat-icon>
              <div class="alert-body">
                <div class="alert-title">{{ a.title }}</div>
                <div class="alert-msg">{{ a.message }}</div>
              </div>
              <span class="alert-time mono">{{ a.createdAt | date:'shortTime' }}</span>
            </div>
          }
        </div>
      </mat-card>
    }
  `,
  styles: [`
    .dash-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .dash-header h2 { margin-bottom: 2px; }
    .sub { color: var(--text-secondary); font-size: 0.88rem; margin: 0; }
    .header-actions { display: flex; gap: 8px; }

    /* Filter Bar */
    .filter-bar {
      display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
      padding: 14px 18px;
      background: var(--bg-white);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      margin-bottom: 20px;
      box-shadow: var(--shadow-xs);
    }
    .filter-group { display: flex; align-items: center; gap: 6px; }
    .filter-icon { font-size: 18px; width: 18px; height: 18px; color: var(--brand); }
    .filter-label { font-family: var(--font-mono); font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }

    .filter-chips { display: flex; }
    .chip-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; margin-right: 4px; }

    ::ng-deep .filter-bar .mat-button-toggle-group {
      border: 1px solid var(--border) !important;
      border-radius: 8px !important;
      overflow: hidden;
    }
    ::ng-deep .filter-bar .mat-button-toggle {
      border: none !important;
    }
    ::ng-deep .filter-bar .mat-button-toggle-appearance-standard .mat-button-toggle-label-content {
      font-family: var(--font-sans) !important;
      font-size: 0.78rem !important;
      font-weight: 500 !important;
      padding: 0 12px !important;
      line-height: 32px !important;
      color: var(--text-secondary) !important;
    }
    ::ng-deep .filter-bar .mat-button-toggle-checked {
      background: var(--brand) !important;
    }
    ::ng-deep .filter-bar .mat-button-toggle-checked .mat-button-toggle-label-content {
      color: white !important;
    }

    .clear-btn {
      display: flex; align-items: center; gap: 4px;
      padding: 6px 12px; border: 1px solid var(--red); border-radius: 8px;
      background: var(--red-bg); color: var(--red);
      font-family: var(--font-sans); font-size: 0.78rem; font-weight: 600;
      cursor: pointer; transition: all 0.15s;
    }
    .clear-btn:hover { background: var(--red); color: white; }
    .clear-btn mat-icon { font-size: 14px; width: 14px; height: 14px; }

    /* KPI Strip */
    .kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
    .kpi {
      background: var(--bg-white); border: 1px solid var(--border); border-radius: var(--radius-lg);
      padding: 20px; display: flex; align-items: flex-start; gap: 14px;
      box-shadow: var(--shadow-xs); transition: all 0.2s; position: relative;
    }
    .kpi:hover { box-shadow: var(--shadow-md); }
    .kpi-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .kpi-icon mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .green .kpi-icon { background: var(--green-bg); color: var(--green); }
    .blue .kpi-icon { background: var(--blue-bg); color: var(--blue); }
    .amber .kpi-icon { background: var(--amber-bg); color: var(--amber); }
    .purple .kpi-icon { background: #f5f3ff; color: var(--brand); }
    .kpi-body { flex: 1; }
    .kpi-val { font-size: 1.5rem; font-weight: 700; line-height: 1.2; color: var(--text-primary); }
    .kpi-lbl { font-size: 0.78rem; color: var(--text-muted); margin-top: 2px; }
    .kpi-trend { position: absolute; top: 16px; right: 16px; }
    .kpi-trend.up mat-icon { color: var(--green); font-size: 18px; width: 18px; height: 18px; }
    .kpi-action { position: absolute; bottom: 12px; right: 16px; font-family: var(--font-mono); font-size: 0.68rem; font-weight: 600; color: var(--brand); text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em; }
    .kpi-action:hover { text-decoration: underline; }

    /* Charts */
    .charts-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 16px; margin-bottom: 20px; }
    .chart-card { padding: 4px 0; }
    .card-head { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px 8px; }
    .card-title { font-family: var(--font-mono); font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
    .card-subtitle { font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px; }

    .chart-type-toggle { display: flex; gap: 2px; background: var(--bg-subtle); border-radius: 8px; padding: 2px; }
    .toggle-btn {
      padding: 4px 8px; border: none; background: none; border-radius: 6px;
      cursor: pointer; color: var(--text-muted); transition: all 0.15s;
    }
    .toggle-btn:hover { color: var(--text-primary); }
    .toggle-btn.active { background: var(--bg-white); color: var(--brand); box-shadow: var(--shadow-xs); }
    .toggle-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Bottom Grid */
    .bottom-grid { display: grid; grid-template-columns: 1fr 1.3fr; gap: 16px; margin-bottom: 20px; }

    .agent-list { padding: 8px 20px 16px; }
    .agent-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border-light); }
    .agent-row:last-child { border-bottom: none; }
    .dot-lg { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .agent-name { flex: 1; font-size: 0.88rem; font-weight: 500; }
    .agent-stat { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
    .agent-link { display: flex; align-items: center; gap: 2px; font-size: 0.78rem; color: var(--brand); text-decoration: none; font-weight: 500; }
    .agent-link mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .agent-link:hover { text-decoration: underline; }

    .findings-list { padding: 4px 20px 16px; }
    .finding-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border-light); text-decoration: none; color: inherit; transition: background 0.15s; }
    .finding-row:last-child { border-bottom: none; }
    .finding-row:hover { background: var(--bg-hover); margin: 0 -20px; padding: 10px 20px; border-radius: 8px; }
    .finding-agent { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: var(--bg-subtle); flex-shrink: 0; }
    .finding-agent mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .finding-info { flex: 1; min-width: 0; }
    .finding-title { font-size: 0.85rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .finding-meta { font-size: 0.72rem; color: var(--text-muted); margin-top: 1px; }
    .finding-amount { font-size: 0.88rem; font-weight: 600; color: var(--green); white-space: nowrap; }

    .empty-state { text-align: center; padding: 40px 20px; color: var(--text-muted); }
    .empty-state mat-icon { font-size: 36px; width: 36px; height: 36px; color: var(--border); margin-bottom: 12px; }
    .empty-state p { font-size: 0.88rem; max-width: 280px; margin: 0 auto; line-height: 1.5; }

    .alerts-list { padding: 4px 20px 16px; }
    .alert-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; border-radius: 10px; margin-bottom: 8px; }
    .alert-row mat-icon { margin-top: 1px; font-size: 18px; width: 18px; height: 18px; }
    .severity-critical { background: var(--red-bg); }
    .severity-critical mat-icon { color: var(--red); }
    .severity-warning { background: var(--amber-bg); }
    .severity-warning mat-icon { color: var(--amber); }
    .severity-info { background: var(--blue-bg); }
    .severity-info mat-icon { color: var(--blue); }
    .alert-body { flex: 1; }
    .alert-title { font-size: 0.85rem; font-weight: 600; }
    .alert-msg { font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px; }
    .alert-time { font-size: 0.7rem; color: var(--text-muted); white-space: nowrap; }
  `],
})
export class ExecutiveDashboardComponent implements OnInit {
  summary = signal<DashboardSummary | null>(null);
  allProposals = signal<Proposal[]>([]);
  trendData = signal<SavingsTrend[]>([]);
  trendChart = signal<EChartsOption>({});
  agentChart = signal<EChartsOption>({});
  riskChart = signal<EChartsOption>({});
  statusChart = signal<EChartsOption>({});

  // Filters
  selectedAgent = 'all';
  selectedPeriod = '12';
  selectedStatus = 'all';
  trendChartType: 'bar' | 'line' | 'area' = 'bar';
  agentChartType: 'pie' | 'bar' = 'pie';

  agentColors: Record<string, string> = { Spend: '#10b981', Sla: '#ef4444', Resource: '#3b82f6', Finops: '#f59e0b' };

  constructor(private api: ApiService, private signalR: SignalRService, private excel: ExcelExportService) {}

  ngOnInit() { this.loadData(); }
  refresh() { this.loadData(); }

  isFiltered(): boolean {
    return this.selectedAgent !== 'all' || this.selectedPeriod !== '12' || this.selectedStatus !== 'all';
  }

  clearFilters() {
    this.selectedAgent = 'all';
    this.selectedPeriod = '12';
    this.selectedStatus = 'all';
    this.applyFilters();
  }

  loadData() {
    this.api.getDashboardSummary().subscribe(s => {
      this.summary.set(s);
    });
    this.api.getSavingsTrend(24).subscribe(t => {
      this.trendData.set(t);
    });
    this.api.getProposals(1, 100).subscribe(res => {
      this.allProposals.set(res.items);
      this.applyFilters();
    });
  }

  filteredProposals(): Proposal[] {
    let items = this.allProposals();
    if (this.selectedAgent !== 'all') {
      items = items.filter(p => p.agentType === this.selectedAgent);
    }
    if (this.selectedStatus !== 'all') {
      items = items.filter(p => p.status === this.selectedStatus);
    }
    if (this.selectedPeriod !== 'all') {
      const months = parseInt(this.selectedPeriod);
      const since = new Date();
      since.setMonth(since.getMonth() - months);
      items = items.filter(p => new Date(p.createdAt) >= since);
    }
    return items;
  }

  filteredFindings(): Proposal[] {
    return this.filteredProposals().sort((a, b) => b.estimatedSavings - a.estimatedSavings);
  }

  filteredSavingsIdentified(): number {
    return this.filteredProposals().reduce((s, p) => s + p.estimatedSavings, 0);
  }

  filteredPending(): number {
    const base = this.selectedAgent !== 'all'
      ? this.allProposals().filter(p => p.agentType === this.selectedAgent)
      : this.allProposals();
    return base.filter(p => p.status === 'Pending').length;
  }

  filteredExecuted(): number {
    const base = this.selectedAgent !== 'all'
      ? this.allProposals().filter(p => p.agentType === this.selectedAgent)
      : this.allProposals();
    return base.filter(p => p.status === 'Executed').length;
  }

  applyFilters() {
    this.buildTrendChart();
    this.buildAgentChart();
    this.buildRiskChart();
    this.buildStatusChart();
  }

  buildTrendChart() {
    let trend = this.trendData();
    const months = this.selectedPeriod === 'all' ? 999 : parseInt(this.selectedPeriod);
    if (months < 999) {
      trend = trend.slice(-months);
    }

    const labels = trend.map(t => `${t.year}-${String(t.month).padStart(2, '0')}`);
    const values = trend.map(t => t.identified);

    const baseSeries: any = {
      data: values,
      itemStyle: { color: '#6366f1' },
      emphasis: { itemStyle: { color: '#4f46e5' } },
    };

    let series: any;
    if (this.trendChartType === 'bar') {
      series = { ...baseSeries, type: 'bar', barWidth: '55%', itemStyle: { ...baseSeries.itemStyle, borderRadius: [4, 4, 0, 0] } };
    } else if (this.trendChartType === 'line') {
      series = { ...baseSeries, type: 'line', smooth: true, symbolSize: 6, lineStyle: { width: 2.5 } };
    } else {
      series = {
        ...baseSeries, type: 'line', smooth: true, symbolSize: 6, lineStyle: { width: 2.5 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(99,102,241,0.25)' }, { offset: 1, color: 'rgba(99,102,241,0.02)' }] } },
      };
    }

    this.trendChart.set({
      tooltip: { trigger: 'axis', formatter: (p: any) => `${p[0]?.axisValue}<br/>Savings: $${p[0]?.value?.toLocaleString() ?? 0}` },
      grid: { left: 60, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: labels, axisLabel: { color: '#9ca3af', fontSize: 10, fontFamily: 'IBM Plex Mono', rotate: labels.length > 8 ? 30 : 0 }, axisLine: { lineStyle: { color: '#e5e7eb' } } },
      yAxis: { type: 'value', axisLabel: { color: '#9ca3af', fontSize: 10, fontFamily: 'IBM Plex Mono', formatter: (v: number) => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v) }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
      series: [series],
    });
  }

  buildAgentChart() {
    const proposals = this.filteredProposals();
    const agents = ['Spend', 'Sla', 'Resource', 'Finops'];
    const agentData = agents.map(a => ({
      name: a,
      value: proposals.filter(p => p.agentType === a).reduce((s, p) => s + p.estimatedSavings, 0),
      count: proposals.filter(p => p.agentType === a).length,
    })).filter(a => a.value > 0);

    const colors = agents.map(a => this.agentColors[a]);

    if (this.agentChartType === 'pie') {
      this.agentChart.set({
        tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}<br/>$${p.value?.toLocaleString()} (${p.percent}%)` },
        color: colors,
        series: [{
          type: 'pie', radius: ['45%', '72%'],
          label: { show: true, formatter: '{b}\n{d}%', fontSize: 11, color: '#6b7280' },
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.1)' } },
          data: agentData.map(a => ({ name: a.name, value: a.value, itemStyle: { color: this.agentColors[a.name] } })),
        }],
      });
    } else {
      this.agentChart.set({
        tooltip: { trigger: 'axis', formatter: (p: any) => `${p[0]?.name}<br/>$${p[0]?.value?.toLocaleString()}` },
        grid: { left: 70, right: 20, top: 20, bottom: 40 },
        xAxis: { type: 'category', data: agentData.map(a => a.name), axisLabel: { color: '#9ca3af', fontSize: 11 }, axisLine: { lineStyle: { color: '#e5e7eb' } } },
        yAxis: { type: 'value', axisLabel: { color: '#9ca3af', fontSize: 10, fontFamily: 'IBM Plex Mono', formatter: (v: number) => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v) }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
        series: [{ type: 'bar', barWidth: '50%', data: agentData.map(a => ({ value: a.value, itemStyle: { color: this.agentColors[a.name], borderRadius: [6, 6, 0, 0] } })) }],
      });
    }
  }

  buildRiskChart() {
    const proposals = this.filteredProposals();
    const risks = ['Low', 'Medium', 'High', 'Critical'];
    const rColors = ['#10b981', '#f59e0b', '#ea580c', '#ef4444'];
    const rData = risks.map((r, i) => ({
      name: r,
      value: proposals.filter(p => p.riskLevel === r).length,
      itemStyle: { color: rColors[i] },
    }));

    this.riskChart.set({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [{
        type: 'pie', radius: ['40%', '68%'],
        label: { show: true, formatter: '{b}\n{c}', fontSize: 11, color: '#6b7280' },
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        data: rData.filter(d => d.value > 0),
      }],
    });
  }

  buildStatusChart() {
    const proposals = this.selectedAgent !== 'all'
      ? this.allProposals().filter(p => p.agentType === this.selectedAgent)
      : this.allProposals();

    const statuses = ['Pending', 'Approved', 'Executed', 'Rejected'];
    const sColors = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

    this.statusChart.set({
      tooltip: { trigger: 'axis' },
      grid: { left: 20, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: statuses, axisLabel: { color: '#9ca3af', fontSize: 11 }, axisLine: { lineStyle: { color: '#e5e7eb' } } },
      yAxis: { type: 'value', show: false },
      series: [{
        type: 'bar', barWidth: '50%',
        data: statuses.map((s, i) => ({
          value: proposals.filter(p => p.status === s).length,
          itemStyle: { color: sColors[i], borderRadius: [6, 6, 0, 0] },
        })),
        label: { show: true, position: 'top', fontSize: 12, fontWeight: 'bold', color: '#6b7280' },
      }],
    });
  }

  formatCurrency(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
    return n.toFixed(0);
  }

  agentIcon(type: string): string {
    return { Spend: 'attach_money', Sla: 'shield', Resource: 'memory', Finops: 'account_balance' }[type] ?? 'smart_toy';
  }

  agentColor(type: string): string {
    return this.agentColors[type] ?? '#6b7280';
  }

  exportData() {
    const s = this.summary();
    if (!s) return;
    this.excel.exportDashboardReport(s);
  }
}
