import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { echarts } from '../../core/providers/echarts-setup';
import { ApiService } from '../../core/services/api.service';
import { DashboardSummary, SavingsTrend } from '../../core/types/api.types';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'app-executive-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatListModule, MatChipsModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  template: `
    <h2>Executive Dashboard</h2>
    <div class="kpi-grid">
      <mat-card class="kpi-card savings">
        <mat-icon>savings</mat-icon>
        <div class="kpi-value">\${{ formatNumber(summary()?.totalSavingsIdentified ?? 0) }}</div>
        <div class="kpi-label">Savings Identified</div>
      </mat-card>
      <mat-card class="kpi-card realized">
        <mat-icon>trending_up</mat-icon>
        <div class="kpi-value">\${{ formatNumber(summary()?.totalSavingsRealized ?? 0) }}</div>
        <div class="kpi-label">Savings Realized</div>
      </mat-card>
      <mat-card class="kpi-card pending">
        <mat-icon>pending_actions</mat-icon>
        <div class="kpi-value">{{ summary()?.pendingProposals ?? 0 }}</div>
        <div class="kpi-label">Pending Approvals</div>
      </mat-card>
      <mat-card class="kpi-card executed">
        <mat-icon>check_circle</mat-icon>
        <div class="kpi-value">{{ summary()?.executedProposals ?? 0 }}</div>
        <div class="kpi-label">Executed Actions</div>
      </mat-card>
    </div>

    <div class="charts-row">
      <mat-card class="chart-card">
        <mat-card-header><mat-card-title>Savings Trend</mat-card-title></mat-card-header>
        <mat-card-content>
          <div echarts [options]="trendChartOptions()" style="height: 300px;"></div>
        </mat-card-content>
      </mat-card>
      <mat-card class="chart-card">
        <mat-card-header><mat-card-title>Savings by Agent</mat-card-title></mat-card-header>
        <mat-card-content>
          <div echarts [options]="agentChartOptions()" style="height: 300px;"></div>
        </mat-card-content>
      </mat-card>
    </div>

    <mat-card>
      <mat-card-header><mat-card-title>Top Findings by Impact</mat-card-title></mat-card-header>
      <mat-card-content>
        <mat-list>
          @for (f of summary()?.topFindings ?? []; track f.id) {
            <mat-list-item>
              <mat-icon matListItemIcon [style.color]="getAgentColor(f.agentType)">{{ getAgentIcon(f.agentType) }}</mat-icon>
              <span matListItemTitle>{{ f.title }}</span>
              <span matListItemLine>\${{ formatNumber(f.estimatedSavings) }} | {{ f.riskLevel }} risk | {{ f.status }}</span>
            </mat-list-item>
          }
        </mat-list>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .kpi-card { padding: 20px; text-align: center; }
    .kpi-card mat-icon { font-size: 32px; width: 32px; height: 32px; margin-bottom: 8px; }
    .kpi-value { font-size: 28px; font-weight: 700; }
    .kpi-label { color: #666; margin-top: 4px; }
    .savings mat-icon { color: #4caf50; }
    .realized mat-icon { color: #2196f3; }
    .pending mat-icon { color: #ff9800; }
    .executed mat-icon { color: #9c27b0; }
    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .chart-card { min-height: 350px; }
  `],
})
export class ExecutiveDashboardComponent implements OnInit {
  summary = signal<DashboardSummary | null>(null);
  trendChartOptions = signal<EChartsOption>({});
  agentChartOptions = signal<EChartsOption>({});

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getDashboardSummary().subscribe(s => {
      this.summary.set(s);
      this.agentChartOptions.set({
        tooltip: { trigger: 'item' },
        series: [{ type: 'pie', radius: ['40%', '70%'], data: s.savingsByAgent.map(a => ({ name: a.agentType, value: a.totalSavings })) }],
      });
    });

    this.api.getSavingsTrend().subscribe(trend => {
      this.trendChartOptions.set({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: trend.map(t => `${t.year}-${String(t.month).padStart(2, '0')}`) },
        yAxis: { type: 'value', name: 'Savings ($)' },
        series: [{ type: 'bar', data: trend.map(t => t.identified), itemStyle: { color: '#4caf50' } }],
      });
    });
  }

  formatNumber(n: number): string { return n >= 1000 ? (n / 1000).toFixed(0) + 'K' : n.toFixed(0); }
  getAgentIcon(type: string): string {
    const icons: Record<string, string> = { Spend: 'attach_money', Sla: 'warning', Resource: 'memory', Finops: 'account_balance' };
    return icons[type] ?? 'smart_toy';
  }
  getAgentColor(type: string): string {
    const colors: Record<string, string> = { Spend: '#4caf50', Sla: '#f44336', Resource: '#2196f3', Finops: '#ff9800' };
    return colors[type] ?? '#666';
  }
}
