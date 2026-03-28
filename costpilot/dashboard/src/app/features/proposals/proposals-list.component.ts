import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Proposal } from '../../core/types/api.types';

@Component({
  selector: 'app-proposals-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatTableModule, MatCardModule, MatButtonModule, MatChipsModule, MatSelectModule, MatFormFieldModule, FormsModule],
  template: `
    <h2>Action Proposals</h2>
    <mat-card>
      <div class="filters">
        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select [(value)]="statusFilter" (selectionChange)="load()">
            <mat-option value="">All</mat-option>
            <mat-option value="Pending">Pending</mat-option>
            <mat-option value="Approved">Approved</mat-option>
            <mat-option value="Executed">Executed</mat-option>
            <mat-option value="Rejected">Rejected</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Agent</mat-label>
          <mat-select [(value)]="agentFilter" (selectionChange)="load()">
            <mat-option value="">All</mat-option>
            <mat-option value="Spend">Spend</mat-option>
            <mat-option value="Sla">SLA</mat-option>
            <mat-option value="Resource">Resource</mat-option>
            <mat-option value="Finops">FinOps</mat-option>
          </mat-select>
        </mat-form-field>
      </div>
      <table mat-table [dataSource]="proposals()">
        <ng-container matColumnDef="title"><th mat-header-cell *matHeaderCellDef>Title</th><td mat-cell *matCellDef="let p"><a [routerLink]="['/proposals', p.id]">{{ p.title }}</a></td></ng-container>
        <ng-container matColumnDef="agentType"><th mat-header-cell *matHeaderCellDef>Agent</th><td mat-cell *matCellDef="let p">{{ p.agentType }}</td></ng-container>
        <ng-container matColumnDef="estimatedSavings"><th mat-header-cell *matHeaderCellDef>Est. Savings</th><td mat-cell *matCellDef="let p">\${{ p.estimatedSavings | number:'1.0-0' }}</td></ng-container>
        <ng-container matColumnDef="riskLevel"><th mat-header-cell *matHeaderCellDef>Risk</th><td mat-cell *matCellDef="let p"><mat-chip [class]="'risk-' + p.riskLevel.toLowerCase()">{{ p.riskLevel }}</mat-chip></td></ng-container>
        <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let p"><mat-chip [class]="'status-' + p.status.toLowerCase()">{{ p.status }}</mat-chip></td></ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns;"></tr>
      </table>
    </mat-card>
  `,
  styles: [`
    .filters { display: flex; gap: 16px; padding: 16px; }
    table { width: 100%; }
    a { color: #1976d2; text-decoration: none; }
    .risk-low { background: #c8e6c9 !important; }
    .risk-medium { background: #fff9c4 !important; }
    .risk-high { background: #ffccbc !important; }
    .risk-critical { background: #ffcdd2 !important; }
    .status-pending { background: #fff9c4 !important; }
    .status-approved { background: #c8e6c9 !important; }
    .status-executed { background: #bbdefb !important; }
    .status-rejected { background: #ffcdd2 !important; }
  `],
})
export class ProposalsListComponent implements OnInit {
  proposals = signal<Proposal[]>([]);
  columns = ['title', 'agentType', 'estimatedSavings', 'riskLevel', 'status'];
  statusFilter = '';
  agentFilter = '';

  constructor(private api: ApiService) {}
  ngOnInit() { this.load(); }

  load() {
    this.api.getProposals(1, 50, this.statusFilter || undefined, this.agentFilter || undefined)
      .subscribe(res => this.proposals.set(res.items));
  }
}
