import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { echarts } from '../../core/providers/echarts-setup';
import { ApiService } from '../../core/services/api.service';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'app-impact-tracking',
  standalone: true,
  imports: [CommonModule, MatCardModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  template: `
    <h2>Impact Tracking</h2>
    <mat-card class="kpi">
      <div class="kpi-value">\${{ totalRealized() | number:'1.0-0' }}</div>
      <div class="kpi-label">Total Savings Realized</div>
    </mat-card>
    <div class="charts-row">
      <mat-card>
        <mat-card-header><mat-card-title>Monthly Savings</mat-card-title></mat-card-header>
        <mat-card-content>
          <div echarts [options]="monthlyChart()" style="height: 350px;"></div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .kpi { text-align: center; padding: 24px; margin-bottom: 24px; }
    .kpi-value { font-size: 48px; font-weight: 700; color: #4caf50; }
    .kpi-label { color: #666; font-size: 18px; }
    .charts-row { display: grid; gap: 16px; }
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
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: data.byMonth.map(m => `${m.year}-${String(m.month).padStart(2, '0')}`) },
        yAxis: { type: 'value', name: 'Savings ($)' },
        series: [{ type: 'line', data: data.byMonth.map(m => m.total), areaStyle: { color: 'rgba(76,175,80,0.2)' }, lineStyle: { color: '#4caf50' }, itemStyle: { color: '#4caf50' } }],
      });
    });
  }
}
