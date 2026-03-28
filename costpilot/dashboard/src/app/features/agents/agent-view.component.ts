import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { echarts } from '../../core/providers/echarts-setup';
import { ApiService } from '../../core/services/api.service';
import { AgentStatus, AgentAlert } from '../../core/types/api.types';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'app-agent-view',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  template: `
    <div class="page-header">
      <div>
        <div class="agent-badge" [style.background]="agentBg()" [style.color]="agentClr()">
          <span class="dot-sm" [style.background]="agentClr()"></span>
          {{ agentLabel() }}
        </div>
        <h2>{{ agentLabel() }} Agent</h2>
        <p class="sub">{{ agentDesc() }}</p>
      </div>
      <div class="header-actions">
        <button class="btn-primary" (click)="trigger()" [disabled]="triggering()">
          @if (triggering()) {
            <span class="spinner"></span> Running...
          } @else {
            <mat-icon>play_arrow</mat-icon> Run Analysis
          }
        </button>
        <button class="btn-export" (click)="exportAlerts()">
          <mat-icon>download</mat-icon> Export
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stat-strip anim-in">
      <div class="stat-card">
        <div class="stat-icon brand"><mat-icon>lightbulb</mat-icon></div>
        <div><div class="stat-val mono">{{ status()?.proposalCount ?? 0 }}</div><div class="stat-lbl">Proposals</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue"><mat-icon>visibility</mat-icon></div>
        <div><div class="stat-val mono">{{ status()?.insightCount ?? 0 }}</div><div class="stat-lbl">Insights</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green"><mat-icon>fiber_manual_record</mat-icon></div>
        <div><div class="stat-val">{{ status()?.status ?? 'Unknown' }}</div><div class="stat-lbl">Status</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon amber"><mat-icon>schedule</mat-icon></div>
        <div><div class="stat-val">{{ status()?.lastActivity ? (status()!.lastActivity | date:'shortTime') : 'Never' }}</div><div class="stat-lbl">Last Activity</div></div>
      </div>
    </div>

    @if (triggerMsg()) {
      <div class="success-toast anim-in">
        <mat-icon>check_circle</mat-icon> {{ triggerMsg() }}
      </div>
    }

    <!-- Alerts -->
    <mat-card class="anim-in anim-d3">
      <div class="card-head">
        <div>
          <div class="card-title">AGENT ALERTS</div>
          <div class="card-subtitle">Recent notifications and findings</div>
        </div>
        <span class="mono text-muted" style="font-size: 0.72rem;">{{ alerts().length }} alerts</span>
      </div>

      @if (alerts().length > 0) {
        <div class="alerts-list">
          @for (a of alerts(); track a.id) {
            <div class="alert-row" [class]="'sev-' + a.severity.toLowerCase()">
              <mat-icon>{{ a.severity === 'Critical' ? 'error' : a.severity === 'Warning' ? 'warning_amber' : 'info_outline' }}</mat-icon>
              <div class="alert-body">
                <div class="alert-head">
                  <span class="alert-title">{{ a.title }}</span>
                  <span class="alert-sev mono">{{ a.severity }}</span>
                </div>
                <div class="alert-msg">{{ a.message }}</div>
              </div>
              <span class="alert-time mono">{{ a.createdAt | date:'short' }}</span>
            </div>
          }
        </div>
      } @else {
        <div class="empty-state">
          <mat-icon>notifications_none</mat-icon>
          <p>No alerts yet. Click "Run Analysis" to trigger the {{ agentLabel() }} agent.</p>
        </div>
      }
    </mat-card>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .page-header h2 { margin-bottom: 2px; }
    .sub { color: var(--text-secondary); font-size: 0.88rem; margin: 0; }
    .header-actions { display: flex; gap: 8px; }

    .agent-badge {
      display: inline-flex; align-items: center; gap: 6px;
      font-family: var(--font-mono); font-size: 0.68rem; font-weight: 600;
      padding: 4px 12px; border-radius: 6px; margin-bottom: 8px;
      text-transform: uppercase; letter-spacing: 0.06em;
    }
    .dot-sm { width: 6px; height: 6px; border-radius: 50%; }

    .stat-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
    .stat-card {
      background: var(--bg-white); border: 1px solid var(--border);
      border-radius: var(--radius-lg); padding: 18px 20px;
      display: flex; align-items: center; gap: 14px;
      box-shadow: var(--shadow-xs);
    }
    .stat-icon {
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
    }
    .stat-icon mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .stat-icon.brand { background: #f5f3ff; color: var(--brand); }
    .stat-icon.blue { background: var(--blue-bg); color: var(--blue); }
    .stat-icon.green { background: var(--green-bg); color: var(--green); }
    .stat-icon.amber { background: var(--amber-bg); color: var(--amber); }
    .stat-val { font-size: 1.25rem; font-weight: 700; }
    .stat-lbl { font-size: 0.75rem; color: var(--text-muted); }

    .success-toast {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 16px; background: var(--green-bg);
      border: 1px solid var(--green-border);
      border-radius: var(--radius-md); color: var(--green);
      font-size: 0.88rem; font-weight: 500; margin-bottom: 16px;
    }
    .success-toast mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .card-head {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 20px 24px 8px;
    }
    .card-title { font-family: var(--font-mono); font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
    .card-subtitle { font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px; }

    .alerts-list { padding: 8px 20px 16px; }
    .alert-row {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 14px 16px; border-radius: 10px; margin-bottom: 8px;
    }
    .alert-row mat-icon { margin-top: 1px; font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
    .sev-critical { background: var(--red-bg); }
    .sev-critical mat-icon { color: var(--red); }
    .sev-warning { background: var(--amber-bg); }
    .sev-warning mat-icon { color: var(--amber); }
    .sev-info { background: var(--blue-bg); }
    .sev-info mat-icon { color: var(--blue); }

    .alert-body { flex: 1; }
    .alert-head { display: flex; align-items: center; gap: 8px; }
    .alert-title { font-size: 0.88rem; font-weight: 600; }
    .alert-sev { font-size: 0.62rem; text-transform: uppercase; }
    .alert-msg { font-size: 0.82rem; color: var(--text-secondary); margin-top: 3px; line-height: 1.4; }
    .alert-time { font-size: 0.7rem; color: var(--text-muted); white-space: nowrap; }

    .empty-state { text-align: center; padding: 48px 20px; color: var(--text-muted); }
    .empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; color: var(--border); margin-bottom: 12px; }
    .empty-state p { max-width: 320px; margin: 0 auto; line-height: 1.5; font-size: 0.88rem; }

    .spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class AgentViewComponent implements OnInit {
  agentType = signal('');
  status = signal<AgentStatus | null>(null);
  alerts = signal<AgentAlert[]>([]);
  triggerMsg = signal('');
  triggering = signal(false);

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const type = params.get('type')!;
      this.agentType.set(type);
      this.triggerMsg.set('');
      this.api.getAgentStatus(type).subscribe(s => this.status.set(s));
      this.api.getAgentAlerts(type).subscribe(a => this.alerts.set(a));
    });
  }

  trigger() {
    this.triggering.set(true);
    this.api.triggerAgent(this.agentType()).subscribe({
      next: () => {
        this.triggerMsg.set('Analysis triggered successfully! Results will appear shortly.');
        this.triggering.set(false);
        setTimeout(() => {
          this.api.getAgentAlerts(this.agentType()).subscribe(a => this.alerts.set(a));
          this.api.getAgentStatus(this.agentType()).subscribe(s => this.status.set(s));
        }, 3000);
      },
      error: () => { this.triggering.set(false); }
    });
  }

  agentLabel(): string {
    return { spend: 'Spend Intelligence', sla: 'SLA Prevention', resource: 'Resource Optimization', finops: 'FinOps' }[this.agentType()] ?? this.agentType();
  }
  agentDesc(): string {
    return {
      spend: 'Detects anomalies, duplicate costs, and rate optimization opportunities in procurement data',
      sla: 'Monitors SLA metrics, predicts breaches, and recommends preventive actions',
      resource: 'Tracks utilization across licenses, infrastructure, and teams to find waste',
      finops: 'Reconciles transactions, analyzes variances, and accelerates financial close'
    }[this.agentType()] ?? '';
  }
  agentClr(): string { return { spend: '#10b981', sla: '#ef4444', resource: '#3b82f6', finops: '#f59e0b' }[this.agentType()] ?? '#6b7280'; }
  agentBg(): string { return { spend: '#ecfdf5', sla: '#fef2f2', resource: '#eff6ff', finops: '#fffbeb' }[this.agentType()] ?? '#f9fafb'; }

  exportAlerts() {
    const csv = ['Title,Severity,Message,Date', ...this.alerts().map(a =>
      `"${a.title}",${a.severity},"${a.message}",${a.createdAt}`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${this.agentType()}-alerts.csv`;
    a.click();
  }
}
