import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Proposal } from '../../core/types/api.types';

@Component({
  selector: 'app-proposal-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, FormsModule],
  template: `
    @if (proposal(); as p) {
      <div class="page-header">
        <div>
          <a class="back-link" (click)="goBack()"><mat-icon>arrow_back</mat-icon> Back to Proposals</a>
          <h2>{{ p.title }}</h2>
        </div>
        <div class="header-actions">
          <button class="btn-export" (click)="exportDetail()"><mat-icon>download</mat-icon> Export</button>
        </div>
      </div>

      <div class="detail-layout anim-in">
        <mat-card class="info-card">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Agent</span>
              <span class="info-value agent-badge" [style.color]="agentColor(p.agentType)" [style.background]="agentBg(p.agentType)">{{ p.agentType }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Estimated Savings</span>
              <span class="info-value mono text-green">\${{ p.estimatedSavings | number:'1.0-0' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Risk Level</span>
              <span class="info-value risk-tag" [class]="'risk-' + p.riskLevel.toLowerCase()">{{ p.riskLevel }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Status</span>
              <span class="info-value status-tag" [class]="'st-' + p.status.toLowerCase()">{{ p.status }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Created</span>
              <span class="info-value">{{ p.createdAt | date:'medium' }}</span>
            </div>
            @if (p.approvedAt) {
              <div class="info-item">
                <span class="info-label">Decision Date</span>
                <span class="info-value">{{ p.approvedAt | date:'medium' }}</span>
              </div>
            }
          </div>

          <div class="desc-section">
            <h3>Description</h3>
            <p>{{ p.description }}</p>
          </div>

          @if (p.status === 'Pending') {
            <div class="action-bar">
              <input class="comment-input" [(ngModel)]="comment" placeholder="Add a comment (optional)..." />
              <button class="btn-primary" (click)="approve()">
                <mat-icon>check_circle</mat-icon> Approve
              </button>
              <button class="btn-reject" (click)="reject()">
                <mat-icon>cancel</mat-icon> Reject
              </button>
            </div>
          }
        </mat-card>
      </div>
    }
  `,
  styles: [`
    .page-header { margin-bottom: 20px; }
    .page-header h2 { margin-top: 8px; margin-bottom: 0; }
    .back-link {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 0.82rem; color: var(--text-secondary); cursor: pointer;
      text-decoration: none;
    }
    .back-link:hover { color: var(--brand); }
    .back-link mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .header-actions { display: flex; gap: 8px; }

    .detail-layout { max-width: 800px; }
    .info-card { padding: 8px; }

    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding: 20px 24px; }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
    .info-label { font-family: var(--font-mono); font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); }
    .info-value { font-size: 0.95rem; font-weight: 600; }

    .agent-badge { display: inline-block; padding: 3px 10px; border-radius: 6px; font-family: var(--font-mono); font-size: 0.75rem; width: fit-content; }
    .risk-tag, .status-tag { font-family: var(--font-mono); font-size: 0.72rem; font-weight: 600; padding: 3px 10px; border-radius: 6px; width: fit-content; text-transform: uppercase; }
    .risk-low { background: var(--green-bg); color: var(--green); }
    .risk-medium { background: var(--amber-bg); color: var(--amber); }
    .risk-high { background: #fff7ed; color: #ea580c; }
    .risk-critical { background: var(--red-bg); color: var(--red); }
    .st-pending { background: var(--amber-bg); color: var(--amber); }
    .st-approved { background: var(--green-bg); color: var(--green); }
    .st-executed { background: var(--blue-bg); color: var(--blue); }
    .st-rejected { background: var(--red-bg); color: var(--red); }

    .desc-section { padding: 0 24px 16px; border-top: 1px solid var(--border-light); margin-top: 4px; }
    .desc-section h3 { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin: 16px 0 8px; }
    .desc-section p { font-size: 0.9rem; line-height: 1.6; color: var(--text-primary); }

    .action-bar {
      display: flex; gap: 10px; align-items: center;
      padding: 16px 24px 20px;
      border-top: 1px solid var(--border-light);
    }
    .comment-input {
      flex: 1; padding: 10px 14px;
      border: 1px solid var(--border); border-radius: var(--radius-md);
      font-family: var(--font-sans); font-size: 0.88rem;
      outline: none;
    }
    .comment-input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }

    .btn-reject {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 18px; border: 1px solid var(--red-border);
      border-radius: var(--radius-md);
      background: var(--red-bg); color: var(--red);
      font-family: var(--font-sans); font-size: 0.85rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
    }
    .btn-reject:hover { background: var(--red); color: white; border-color: var(--red); }
    .btn-reject mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `],
})
export class ProposalDetailComponent implements OnInit {
  proposal = signal<Proposal | null>(null);
  comment = '';

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getProposal(id).subscribe(p => this.proposal.set(p));
  }

  approve() {
    const p = this.proposal();
    if (!p) return;
    this.api.approveProposal(p.id, this.comment).subscribe(() => this.router.navigate(['/proposals']));
  }

  reject() {
    const p = this.proposal();
    if (!p) return;
    this.api.rejectProposal(p.id, this.comment || 'Rejected').subscribe(() => this.router.navigate(['/proposals']));
  }

  goBack() { this.router.navigate(['/proposals']); }

  agentColor(t: string): string { return { Spend: '#10b981', Sla: '#ef4444', Resource: '#3b82f6', Finops: '#f59e0b' }[t] ?? '#6b7280'; }
  agentBg(t: string): string { return { Spend: '#ecfdf5', Sla: '#fef2f2', Resource: '#eff6ff', Finops: '#fffbeb' }[t] ?? '#f9fafb'; }

  exportDetail() {
    const p = this.proposal();
    if (!p) return;
    const text = `Title: ${p.title}\nAgent: ${p.agentType}\nSavings: $${p.estimatedSavings}\nRisk: ${p.riskLevel}\nStatus: ${p.status}\nCreated: ${p.createdAt}\n\nDescription:\n${p.description}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `proposal-${p.id.slice(0,8)}.txt`;
    a.click();
  }
}
