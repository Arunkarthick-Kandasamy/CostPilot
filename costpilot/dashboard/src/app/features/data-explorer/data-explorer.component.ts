import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { ApiService } from '../../core/services/api.service';
import { AgentInsight, CorrelatedFinding } from '../../core/types/api.types';

@Component({
  selector: 'app-data-explorer',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTabsModule, MatListModule],
  template: `
    <h2>Data Explorer</h2>
    <mat-card>
      <mat-tab-group>
        <mat-tab label="Agent Insights">
          <mat-list>
            @for (i of insights(); track i.id) {
              <mat-list-item>
                <span matListItemTitle>[{{ i.sourceAgent }}] {{ i.summary }}</span>
                <span matListItemLine>\${{ i.financialImpact | number:'1.0-0' }} | Confidence: {{ (i.confidence * 100).toFixed(0) }}% | {{ i.createdAt | date:'short' }}</span>
              </mat-list-item>
            }
          </mat-list>
        </mat-tab>
        <mat-tab label="Correlated Findings">
          <mat-list>
            @for (f of correlatedFindings(); track f.id) {
              <mat-list-item>
                <span matListItemTitle>{{ f.summary }}</span>
                <span matListItemLine>Agents: {{ f.agentsInvolved.join(', ') }} | \${{ f.combinedImpact | number:'1.0-0' }} | {{ (f.confidence * 100).toFixed(0) }}%</span>
              </mat-list-item>
            }
          </mat-list>
        </mat-tab>
      </mat-tab-group>
    </mat-card>
  `,
})
export class DataExplorerComponent implements OnInit {
  insights = signal<AgentInsight[]>([]);
  correlatedFindings = signal<CorrelatedFinding[]>([]);

  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.getInsights().subscribe(i => this.insights.set(i));
    this.api.getCorrelatedFindings().subscribe(f => this.correlatedFindings.set(f));
  }
}
