import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ExcelExportService } from '../../core/services/excel-export.service';
import { Proposal } from '../../core/types/api.types';

@Component({
  selector: 'app-proposals-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatTableModule, MatCardModule, MatButtonModule, MatChipsModule, MatSelectModule, MatFormFieldModule, MatIconModule, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h2>Action Proposals</h2>
        <p class="sub">Review and approve cost-saving recommendations from AI agents</p>
      </div>
      <div class="header-actions">
        <button class="btn-export" (click)="exportCSV()">
          <mat-icon>download</mat-icon> Export Excel
        </button>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="summary-strip anim-in">
      <div class="sum-card">
        <span class="sum-val mono">{{ proposals().length }}</span>
        <span class="sum-lbl">Total Shown</span>
      </div>
      <div class="sum-card">
        <span class="sum-val mono text-amber">{{ pendingCount() }}</span>
        <span class="sum-lbl">Pending</span>
      </div>
      <div class="sum-card">
        <span class="sum-val mono text-green">{{ approvedCount() }}</span>
        <span class="sum-lbl">Approved</span>
      </div>
      <div class="sum-card">
        <span class="sum-val mono text-brand">\${{ totalSavings() }}</span>
        <span class="sum-lbl">Total Est. Savings</span>
      </div>
    </div>

    <mat-card class="anim-in anim-d2">
      <div class="table-toolbar">
        <div class="filters">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Status</mat-label>
            <mat-select [(value)]="statusFilter" (selectionChange)="load()">
              <mat-option value="">All Statuses</mat-option>
              <mat-option value="Pending">Pending</mat-option>
              <mat-option value="Approved">Approved</mat-option>
              <mat-option value="Executed">Executed</mat-option>
              <mat-option value="Rejected">Rejected</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Agent</mat-label>
            <mat-select [(value)]="agentFilter" (selectionChange)="load()">
              <mat-option value="">All Agents</mat-option>
              <mat-option value="Spend">Spend</mat-option>
              <mat-option value="Sla">SLA</mat-option>
              <mat-option value="Resource">Resource</mat-option>
              <mat-option value="Finops">FinOps</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      @if (proposals().length > 0) {
        <table mat-table [dataSource]="proposals()">
          <ng-container matColumnDef="title">
            <th mat-header-cell *matHeaderCellDef>Proposal</th>
            <td mat-cell *matCellDef="let p">
              <a [routerLink]="['/proposals', p.id]" class="proposal-link">{{ p.title }}</a>
            </td>
          </ng-container>
          <ng-container matColumnDef="agentType">
            <th mat-header-cell *matHeaderCellDef>Agent</th>
            <td mat-cell *matCellDef="let p">
              <span class="agent-pill" [style.color]="agentColor(p.agentType)" [style.background]="agentBg(p.agentType)">
                {{ p.agentType }}
              </span>
            </td>
          </ng-container>
          <ng-container matColumnDef="estimatedSavings">
            <th mat-header-cell *matHeaderCellDef>Est. Savings</th>
            <td mat-cell *matCellDef="let p"><span class="mono savings-val">\${{ p.estimatedSavings | number:'1.0-0' }}</span></td>
          </ng-container>
          <ng-container matColumnDef="riskLevel">
            <th mat-header-cell *matHeaderCellDef>Risk</th>
            <td mat-cell *matCellDef="let p"><span class="risk-tag" [class]="'risk-' + p.riskLevel.toLowerCase()">{{ p.riskLevel }}</span></td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let p"><span class="status-tag" [class]="'st-' + p.status.toLowerCase()">{{ p.status }}</span></td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
        </table>
      } @else {
        <div class="empty-table">
          <mat-icon>inbox</mat-icon>
          <p>No proposals found. Run agent analysis to generate cost-saving proposals.</p>
        </div>
      }
    </mat-card>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .page-header h2 { margin-bottom: 2px; }
    .sub { color: var(--text-secondary); font-size: 0.88rem; margin: 0; }
    .header-actions { display: flex; gap: 8px; }

    .summary-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .sum-card {
      background: var(--bg-white); border: 1px solid var(--border);
      border-radius: var(--radius-md); padding: 16px 18px;
      display: flex; flex-direction: column;
    }
    .sum-val { font-size: 1.4rem; font-weight: 700; }
    .sum-lbl { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }

    .table-toolbar { padding: 16px 24px 0; }
    .filters { display: flex; gap: 12px; }

    table { width: 100%; }
    .proposal-link { color: var(--brand); text-decoration: none; font-weight: 500; }
    .proposal-link:hover { text-decoration: underline; }

    .agent-pill {
      font-family: var(--font-mono); font-size: 0.72rem; font-weight: 600;
      padding: 3px 10px; border-radius: 6px; letter-spacing: 0.02em;
    }

    .savings-val { font-weight: 600; color: var(--green); }

    .risk-tag, .status-tag {
      font-family: var(--font-mono); font-size: 0.68rem; font-weight: 600;
      padding: 3px 10px; border-radius: 6px; letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .risk-low { background: var(--green-bg); color: var(--green); }
    .risk-medium { background: var(--amber-bg); color: var(--amber); }
    .risk-high { background: #fff7ed; color: #ea580c; }
    .risk-critical { background: var(--red-bg); color: var(--red); }
    .st-pending { background: var(--amber-bg); color: var(--amber); }
    .st-approved { background: var(--green-bg); color: var(--green); }
    .st-executed { background: var(--blue-bg); color: var(--blue); }
    .st-rejected { background: var(--red-bg); color: var(--red); }
    .st-failed { background: var(--red-bg); color: var(--red); }

    .empty-table {
      text-align: center; padding: 48px 20px; color: var(--text-muted);
    }
    .empty-table mat-icon { font-size: 40px; width: 40px; height: 40px; color: var(--border); margin-bottom: 12px; }
    .empty-table p { max-width: 300px; margin: 0 auto; line-height: 1.5; }
  `],
})
export class ProposalsListComponent implements OnInit {
  proposals = signal<Proposal[]>([]);
  columns = ['title', 'agentType', 'estimatedSavings', 'riskLevel', 'status'];
  statusFilter = '';
  agentFilter = '';

  constructor(private api: ApiService, private excel: ExcelExportService) {}
  ngOnInit() { this.load(); }

  load() {
    this.api.getProposals(1, 50, this.statusFilter || undefined, this.agentFilter || undefined)
      .subscribe(res => this.proposals.set(res.items));
  }

  pendingCount(): number {
    return this.proposals().filter(p => p.status === 'Pending').length;
  }
  approvedCount(): number {
    return this.proposals().filter(p => p.status === 'Approved' || p.status === 'Executed').length;
  }
  totalSavings(): string {
    const t = this.proposals().reduce((s, p) => s + p.estimatedSavings, 0);
    return t >= 1000 ? (t / 1000).toFixed(0) + 'K' : t.toFixed(0);
  }

  agentColor(t: string): string {
    return { Spend: '#10b981', Sla: '#ef4444', Resource: '#3b82f6', Finops: '#f59e0b' }[t] ?? '#6b7280';
  }
  agentBg(t: string): string {
    return { Spend: '#ecfdf5', Sla: '#fef2f2', Resource: '#eff6ff', Finops: '#fffbeb' }[t] ?? '#f9fafb';
  }

  exportCSV() {
    this.excel.exportProposals(this.proposals());
  }
}
