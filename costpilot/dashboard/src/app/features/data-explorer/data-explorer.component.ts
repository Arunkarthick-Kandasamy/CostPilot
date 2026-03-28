import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/services/api.service';
import { AgentInsight, CorrelatedFinding } from '../../core/types/api.types';

@Component({
  selector: 'app-data-explorer',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTabsModule, MatIconModule],
  template: `
    <div class="page-header">
      <div>
        <h2>Data Explorer</h2>
        <p class="sub">Browse raw agent insights and cross-agent correlated findings</p>
      </div>
      <button class="btn-export" (click)="exportAll()"><mat-icon>download</mat-icon> Export All</button>
    </div>

    <mat-card class="anim-in">
      <mat-tab-group>
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>visibility</mat-icon>&nbsp; Agent Insights ({{ insights().length }})
          </ng-template>
          @if (insights().length > 0) {
            <div class="data-list">
              @for (i of insights(); track i.id) {
                <div class="data-row">
                  <div class="row-dot" [style.background]="agentColor(i.sourceAgent)"></div>
                  <div class="row-body">
                    <div class="row-title">{{ i.summary }}</div>
                    <div class="row-meta">
                      <span class="agent-tag" [style.color]="agentColor(i.sourceAgent)" [style.background]="agentBg(i.sourceAgent)">{{ i.sourceAgent }}</span>
                      <span>{{ i.insightType }}</span>
                      <span>&middot;</span>
                      <span>{{ i.entityType }}: {{ i.entityId }}</span>
                    </div>
                  </div>
                  <div class="row-stats">
                    <div class="mono stat-green">\${{ i.financialImpact | number:'1.0-0' }}</div>
                    <div class="confidence-bar">
                      <div class="confidence-fill" [style.width.%]="i.confidence * 100"></div>
                    </div>
                    <div class="conf-label mono">{{ (i.confidence * 100).toFixed(0) }}%</div>
                  </div>
                  <div class="row-time mono">{{ i.createdAt | date:'short' }}</div>
                </div>
              }
            </div>
          } @else {
            <div class="empty-tab">
              <mat-icon>lightbulb</mat-icon>
              <p>No insights yet. Trigger agent analysis to generate data.</p>
            </div>
          }
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>hub</mat-icon>&nbsp; Correlated Findings ({{ correlatedFindings().length }})
          </ng-template>
          @if (correlatedFindings().length > 0) {
            <div class="data-list">
              @for (f of correlatedFindings(); track f.id) {
                <div class="data-row">
                  <div class="row-icon correlated"><mat-icon>link</mat-icon></div>
                  <div class="row-body">
                    <div class="row-title">{{ f.summary }}</div>
                    <div class="row-meta">
                      @for (agent of f.agentsInvolved; track agent) {
                        <span class="agent-tag" [style.color]="agentColor(agent)" [style.background]="agentBg(agent)">{{ agent }}</span>
                      }
                    </div>
                  </div>
                  <div class="row-stats">
                    <div class="mono stat-green">\${{ f.combinedImpact | number:'1.0-0' }}</div>
                    <div class="conf-label mono">{{ (f.confidence * 100).toFixed(0) }}% conf.</div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="empty-tab">
              <mat-icon>hub</mat-icon>
              <p>No correlated findings. When multiple agents identify related issues, cross-agent correlations appear here.</p>
            </div>
          }
        </mat-tab>
      </mat-tab-group>
    </mat-card>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .page-header h2 { margin-bottom: 2px; }
    .sub { color: var(--text-secondary); font-size: 0.88rem; margin: 0; }

    .data-list { padding: 8px 16px; }
    .data-row {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 14px 8px;
      border-bottom: 1px solid var(--border-light);
      transition: background 0.15s;
    }
    .data-row:last-child { border-bottom: none; }
    .data-row:hover { background: var(--bg-hover); border-radius: 8px; margin: 0 -8px; padding: 14px 16px; }

    .row-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
    .row-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .row-icon.correlated { background: #f5f3ff; color: var(--brand); }
    .row-icon mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .row-body { flex: 1; min-width: 0; }
    .row-title { font-size: 0.88rem; font-weight: 500; line-height: 1.4; }
    .row-meta {
      display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
      font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;
    }
    .agent-tag {
      font-family: var(--font-mono); font-size: 0.65rem; font-weight: 600;
      padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.03em;
    }

    .row-stats { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; min-width: 100px; }
    .stat-green { font-weight: 700; color: var(--green); font-size: 0.9rem; }
    .confidence-bar { width: 60px; height: 4px; background: var(--border-light); border-radius: 2px; overflow: hidden; }
    .confidence-fill { height: 100%; background: var(--brand); border-radius: 2px; }
    .conf-label { font-size: 0.65rem; color: var(--text-muted); }

    .row-time { font-size: 0.7rem; color: var(--text-muted); white-space: nowrap; min-width: 70px; text-align: right; margin-top: 2px; }

    .empty-tab { text-align: center; padding: 48px 20px; color: var(--text-muted); }
    .empty-tab mat-icon { font-size: 36px; width: 36px; height: 36px; color: var(--border); margin-bottom: 12px; }
    .empty-tab p { max-width: 340px; margin: 0 auto; line-height: 1.5; font-size: 0.88rem; }
  `],
})
export class DataExplorerComponent implements OnInit {
  insights = signal<AgentInsight[]>([]);
  correlatedFindings = signal<CorrelatedFinding[]>([]);

  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.getInsights().subscribe(i => this.insights.set(i));
    this.api.getCorrelatedFindings().subscribe(f => this.correlatedFindings.set(f));
  }

  agentColor(t: string): string { return { Spend: '#10b981', Sla: '#ef4444', Resource: '#3b82f6', Finops: '#f59e0b' }[t] ?? '#6b7280'; }
  agentBg(t: string): string { return { Spend: '#ecfdf5', Sla: '#fef2f2', Resource: '#eff6ff', Finops: '#fffbeb' }[t] ?? '#f9fafb'; }

  exportAll() {
    const csv = ['Source,Type,Entity,Summary,Impact,Confidence,Date',
      ...this.insights().map(i => `${i.sourceAgent},${i.insightType},${i.entityType}:${i.entityId},"${i.summary}",${i.financialImpact},${i.confidence},${i.createdAt}`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `data-explorer-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }
}
