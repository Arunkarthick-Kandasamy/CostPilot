import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../core/services/api.service';
import { AgentStatus, AgentAlert } from '../../core/types/api.types';

@Component({
  selector: 'app-agent-view',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatListModule, MatChipsModule],
  template: `
    <h2>{{ agentType() | titlecase }} Agent</h2>
    <div class="status-grid">
      <mat-card>
        <mat-card-content class="stat">
          <div class="stat-value">{{ status()?.proposalCount ?? 0 }}</div>
          <div class="stat-label">Proposals</div>
        </mat-card-content>
      </mat-card>
      <mat-card>
        <mat-card-content class="stat">
          <div class="stat-value">{{ status()?.insightCount ?? 0 }}</div>
          <div class="stat-label">Insights</div>
        </mat-card-content>
      </mat-card>
      <mat-card>
        <mat-card-content class="stat">
          <div class="stat-value">{{ status()?.status ?? 'unknown' }}</div>
          <div class="stat-label">Status</div>
        </mat-card-content>
      </mat-card>
    </div>
    <mat-card>
      <mat-card-header>
        <mat-card-title>Actions</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <button mat-raised-button color="primary" (click)="trigger()">
          <mat-icon>play_arrow</mat-icon> Trigger Analysis
        </button>
        <span class="trigger-status">{{ triggerMessage() }}</span>
      </mat-card-content>
    </mat-card>
    <mat-card>
      <mat-card-header><mat-card-title>Recent Alerts</mat-card-title></mat-card-header>
      <mat-card-content>
        <mat-list>
          @for (a of alerts(); track a.id) {
            <mat-list-item>
              <mat-icon matListItemIcon [class]="'severity-' + a.severity.toLowerCase()">
                {{ a.severity === 'Critical' ? 'error' : a.severity === 'Warning' ? 'warning' : 'info' }}
              </mat-icon>
              <span matListItemTitle>{{ a.title }}</span>
              <span matListItemLine>{{ a.message }} | {{ a.createdAt | date:'short' }}</span>
            </mat-list-item>
          } @empty { <p style="padding: 16px; color: #999;">No alerts yet. Trigger an analysis to get started.</p> }
        </mat-list>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .status-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat { text-align: center; padding: 16px; }
    .stat-value { font-size: 32px; font-weight: 700; }
    .stat-label { color: #666; }
    .trigger-status { margin-left: 16px; color: #4caf50; }
    .severity-critical { color: #f44336; }
    .severity-warning { color: #ff9800; }
    .severity-info { color: #2196f3; }
  `],
})
export class AgentViewComponent implements OnInit {
  agentType = signal('');
  status = signal<AgentStatus | null>(null);
  alerts = signal<AgentAlert[]>([]);
  triggerMessage = signal('');

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const type = params.get('type')!;
      this.agentType.set(type);
      this.api.getAgentStatus(type).subscribe(s => this.status.set(s));
      this.api.getAgentAlerts(type).subscribe(a => this.alerts.set(a));
    });
  }

  trigger() {
    this.api.triggerAgent(this.agentType()).subscribe(() => this.triggerMessage.set('Analysis triggered!'));
  }
}
