import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { echarts } from '../../core/providers/echarts-setup';
import { ApiService } from '../../core/services/api.service';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'app-impact-tracking',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  template: `
    <div class="page-header">
      <div>
        <h2>Impact Tracking</h2>
        <p class="sub">Quantified financial outcomes from executed cost actions</p>
      </div>
      <button class="btn-export" (click)="exportData()"><mat-icon>download</mat-icon> Export Report</button>
    </div>

    <div class="impact-kpis anim-in">
      <div class="impact-hero">
        <div class="hero-label">Total Savings Realized</div>
        <div class="hero-val mono">\${{ totalRealized() | number:'1.0-0' }}</div>
        <div class="hero-sub">Across all executed cost actions</div>
      </div>
    </div>

    <div class="charts-grid anim-in anim-d2">
      <mat-card>
        <div class="card-head">
          <div>
            <div class="card-title">MONTHLY SAVINGS REALIZED</div>
            <div class="card-subtitle">Cumulative impact over time</div>
          </div>
        </div>
        <div echarts [options]="monthlyChart()" style="height: 320px; padding: 0 16px;"></div>
      </mat-card>
    </div>

    @if (totalRealized() === 0) {
      <mat-card class="anim-in anim-d3">
        <div class="empty-state">
          <mat-icon>rocket_launch</mat-icon>
          <h3>No Impact Data Yet</h3>
          <p>Once you approve and execute proposals from the AI agents, their financial impact will be tracked here with detailed analytics.</p>
        </div>
      </mat-card>
    }
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-header h2 { margin-bottom: 2px; }
    .sub { color: var(--text-secondary); font-size: 0.88rem; margin: 0; }

    .impact-kpis { margin-bottom: 20px; }
    .impact-hero {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      border-radius: var(--radius-xl); padding: 36px 40px;
      color: white; box-shadow: 0 8px 24px rgba(99,102,241,0.2);
    }
    .hero-label { font-size: 0.82rem; font-weight: 500; opacity: 0.8; margin-bottom: 8px; }
    .hero-val { font-size: 3rem; font-weight: 800; letter-spacing: -0.02em; line-height: 1; }
    .hero-sub { font-size: 0.85rem; opacity: 0.65; margin-top: 8px; }

    .charts-grid { margin-bottom: 20px; }
    .card-head {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 20px 24px 8px;
    }
    .card-title { font-family: var(--font-mono); font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
    .card-subtitle { font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px; }

    .empty-state {
      text-align: center; padding: 48px 20px; color: var(--text-secondary);
    }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--brand); margin-bottom: 16px; opacity: 0.5; }
    .empty-state h3 { font-size: 1.1rem; margin-bottom: 8px; color: var(--text-primary); }
    .empty-state p { max-width: 400px; margin: 0 auto; line-height: 1.6; font-size: 0.9rem; }
  `],
})
export class ImpactTrackingComponent implements OnInit {
  totalRealized = signal(0);
  monthlyChart = signal<EChartsOption>({});

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getImpactSummary().subscribe(data => {
      this.totalRealized.set(data.totalRealized);
      this.monthlyChart.set({
        tooltip: { trigger: 'axis', formatter: (p: any) => `${p[0]?.axisValue}<br/>Savings: $${p[0]?.value?.toLocaleString() ?? 0}` },
        grid: { left: 60, right: 24, top: 24, bottom: 40 },
        xAxis: {
          type: 'category',
          data: data.byMonth.map(m => `${m.year}-${String(m.month).padStart(2, '0')}`),
          axisLabel: { color: '#9ca3af', fontSize: 11, fontFamily: 'IBM Plex Mono' },
          axisLine: { lineStyle: { color: '#e5e7eb' } },
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: '#9ca3af', fontSize: 11, fontFamily: 'IBM Plex Mono', formatter: (v: number) => '$' + (v >= 1000 ? (v/1000) + 'K' : v) },
          splitLine: { lineStyle: { color: '#f3f4f6' } },
        },
        series: [{
          type: 'line', data: data.byMonth.map(m => m.total), smooth: true,
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(99,102,241,0.2)' }, { offset: 1, color: 'rgba(99,102,241,0.02)' }] } },
          lineStyle: { color: '#6366f1', width: 2.5 },
          itemStyle: { color: '#6366f1' },
          symbolSize: 6,
        }],
      });
    });
  }

  exportData() {
    const blob = new Blob([`Total Savings Realized: $${this.totalRealized()}`], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'impact-report.txt';
    a.click();
  }
}
