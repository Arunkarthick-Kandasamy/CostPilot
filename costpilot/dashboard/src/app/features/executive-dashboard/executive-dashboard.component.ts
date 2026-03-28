import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { echarts } from '../../core/providers/echarts-setup';
import { ApiService } from '../../core/services/api.service';
import { ExcelExportService } from '../../core/services/excel-export.service';
import { SignalRService } from '../../core/services/signalr.service';
import { DashboardSummary } from '../../core/types/api.types';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'app-executive-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatCardModule, NgxEchartsDirective],
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
          <div class="kpi-val mono">\${{ formatCurrency(summary()?.totalSavingsIdentified ?? 0) }}</div>
          <div class="kpi-lbl">Savings Identified</div>
        </div>
        <div class="kpi-trend up">
          <mat-icon>trending_up</mat-icon>
        </div>
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
          <div class="kpi-val mono">{{ summary()?.pendingProposals ?? 0 }}</div>
          <div class="kpi-lbl">Pending Approvals</div>
        </div>
        @if ((summary()?.pendingProposals ?? 0) > 0) {
          <a routerLink="/proposals" class="kpi-action">Review</a>
        }
      </div>
      <div class="kpi purple">
        <div class="kpi-icon"><mat-icon>verified</mat-icon></div>
        <div class="kpi-body">
          <div class="kpi-val mono">{{ summary()?.executedProposals ?? 0 }}</div>
          <div class="kpi-lbl">Executed Actions</div>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="charts-grid anim-in anim-d2">
      <mat-card class="chart-card">
        <div class="card-head">
          <div>
            <div class="card-title">SAVINGS TREND</div>
            <div class="card-subtitle">Monthly identified savings over time</div>
          </div>
          <button class="btn-export" (click)="exportData()"><mat-icon>download</mat-icon></button>
        </div>
        <div echarts [options]="trendChart()" style="height: 280px;"></div>
      </mat-card>

      <mat-card class="chart-card">
        <div class="card-head">
          <div>
            <div class="card-title">AGENT PERFORMANCE</div>
            <div class="card-subtitle">Savings contribution by agent type</div>
          </div>
        </div>
        <div echarts [options]="agentChart()" style="height: 280px;"></div>
      </mat-card>
    </div>

    <!-- Agent Status + Top Findings -->
    <div class="bottom-grid anim-in anim-d3">
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
            <div class="card-subtitle">Highest impact proposals</div>
          </div>
          <a routerLink="/proposals" class="btn-export">View all <mat-icon>east</mat-icon></a>
        </div>
        @if (summary()?.topFindings?.length) {
          <div class="findings-list">
            @for (f of summary()!.topFindings.slice(0, 6); track f.id) {
              <a [routerLink]="['/proposals', f.id]" class="finding-row">
                <div class="finding-agent" [style.color]="agentColor(f.agentType)">
                  <mat-icon>{{ agentIcon(f.agentType) }}</mat-icon>
                </div>
                <div class="finding-info">
                  <div class="finding-title">{{ f.title }}</div>
                  <div class="finding-meta">{{ f.agentType }} &middot; {{ f.riskLevel }} risk</div>
                </div>
                <div class="finding-amount mono">\${{ formatCurrency(f.estimatedSavings) }}</div>
              </a>
            }
          </div>
        } @else {
          <div class="empty-state">
            <mat-icon>auto_awesome</mat-icon>
            <p>No findings yet. Trigger agent analysis to discover cost savings.</p>
          </div>
        }
      </mat-card>
    </div>

    <!-- Recent Alerts -->
    @if (summary()?.recentAlerts?.length) {
      <mat-card class="anim-in anim-d4">
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
    .dash-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .dash-header h2 { margin-bottom: 2px; }
    .sub { color: var(--text-secondary); font-size: 0.88rem; margin: 0; }
    .header-actions { display: flex; gap: 8px; }

    /* KPI Strip */
    .kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .kpi {
      background: var(--bg-white);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 20px;
      display: flex; align-items: flex-start; gap: 14px;
      box-shadow: var(--shadow-xs);
      transition: all 0.2s;
      position: relative;
    }
    .kpi:hover { box-shadow: var(--shadow-md); }
    .kpi-icon {
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
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
    .kpi-action {
      position: absolute; bottom: 12px; right: 16px;
      font-family: var(--font-mono); font-size: 0.68rem; font-weight: 600;
      color: var(--brand); text-decoration: none;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .kpi-action:hover { text-decoration: underline; }

    /* Charts */
    .charts-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 16px; margin-bottom: 24px; }
    .chart-card { padding: 4px 0; }
    .card-head {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 20px 24px 8px;
    }
    .card-title {
      font-family: var(--font-mono); font-size: 0.7rem; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.08em;
      color: var(--text-muted);
    }
    .card-subtitle { font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px; }

    /* Bottom Grid */
    .bottom-grid { display: grid; grid-template-columns: 1fr 1.3fr; gap: 16px; margin-bottom: 24px; }

    /* Agent list */
    .agent-list { padding: 8px 20px 16px; }
    .agent-row {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid var(--border-light);
    }
    .agent-row:last-child { border-bottom: none; }
    .dot-lg { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .agent-name { flex: 1; font-size: 0.88rem; font-weight: 500; }
    .agent-stat { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
    .agent-link {
      display: flex; align-items: center; gap: 2px;
      font-size: 0.78rem; color: var(--brand); text-decoration: none; font-weight: 500;
    }
    .agent-link mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .agent-link:hover { text-decoration: underline; }

    /* Findings */
    .findings-list { padding: 4px 20px 16px; }
    .finding-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-light);
      text-decoration: none; color: inherit;
      transition: background 0.15s;
    }
    .finding-row:last-child { border-bottom: none; }
    .finding-row:hover { background: var(--bg-hover); margin: 0 -20px; padding: 10px 20px; border-radius: 8px; }
    .finding-agent {
      width: 32px; height: 32px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      background: var(--bg-subtle); flex-shrink: 0;
    }
    .finding-agent mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .finding-info { flex: 1; min-width: 0; }
    .finding-title { font-size: 0.85rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .finding-meta { font-size: 0.72rem; color: var(--text-muted); margin-top: 1px; }
    .finding-amount { font-size: 0.88rem; font-weight: 600; color: var(--green); white-space: nowrap; }

    /* Empty state */
    .empty-state {
      text-align: center; padding: 40px 20px; color: var(--text-muted);
    }
    .empty-state mat-icon { font-size: 36px; width: 36px; height: 36px; color: var(--border); margin-bottom: 12px; }
    .empty-state p { font-size: 0.88rem; max-width: 280px; margin: 0 auto; line-height: 1.5; }

    /* Alerts */
    .alerts-list { padding: 4px 20px 16px; }
    .alert-row {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 12px 14px; border-radius: 10px; margin-bottom: 8px;
    }
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
  trendChart = signal<EChartsOption>({});
  agentChart = signal<EChartsOption>({});

  constructor(private api: ApiService, private signalR: SignalRService, private excel: ExcelExportService) {}

  ngOnInit() { this.loadData(); }

  refresh() { this.loadData(); }

  loadData() {
    this.api.getDashboardSummary().subscribe(s => {
      this.summary.set(s);
      const colors = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b'];
      this.agentChart.set({
        tooltip: { trigger: 'item', formatter: '{b}: ${c}' },
        color: colors,
        series: [{
          type: 'pie', radius: ['50%', '75%'],
          label: { show: true, formatter: '{b}\n{d}%', fontSize: 11, color: '#6b7280' },
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.1)' } },
          data: s.savingsByAgent.length > 0
            ? s.savingsByAgent.map((a, i) => ({ name: a.agentType, value: a.totalSavings, itemStyle: { color: colors[i % 4] } }))
            : [{ name: 'Spend', value: 45 }, { name: 'SLA', value: 25 }, { name: 'Resource', value: 20 }, { name: 'FinOps', value: 10 }],
        }],
      });
    });

    this.api.getSavingsTrend().subscribe(trend => {
      const labels = trend.length > 0
        ? trend.map(t => `${t.year}-${String(t.month).padStart(2, '0')}`)
        : ['2025-04','2025-05','2025-06','2025-07','2025-08','2025-09','2025-10','2025-11','2025-12','2026-01','2026-02','2026-03'];
      const data = trend.length > 0
        ? trend.map(t => t.identified)
        : [0,0,0,0,0,0,0,0,0,0,0,0];

      this.trendChart.set({
        tooltip: { trigger: 'axis', formatter: (p: any) => `${p[0].axisValue}<br/>Savings: $${p[0].value?.toLocaleString() ?? 0}` },
        grid: { left: 60, right: 20, top: 20, bottom: 40 },
        xAxis: { type: 'category', data: labels, axisLabel: { color: '#9ca3af', fontSize: 11, fontFamily: 'IBM Plex Mono' }, axisLine: { lineStyle: { color: '#e5e7eb' } } },
        yAxis: { type: 'value', axisLabel: { color: '#9ca3af', fontSize: 11, fontFamily: 'IBM Plex Mono', formatter: (v: number) => '$' + (v >= 1000 ? (v/1000) + 'K' : v) }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
        series: [{
          type: 'bar', data, barWidth: '60%',
          itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] },
          emphasis: { itemStyle: { color: '#4f46e5' } },
        }],
      });
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
    return { Spend: '#10b981', Sla: '#ef4444', Resource: '#3b82f6', Finops: '#f59e0b' }[type] ?? '#6b7280';
  }

  exportData() {
    const s = this.summary();
    if (!s) return;
    this.excel.exportDashboardReport(s);
  }
}
