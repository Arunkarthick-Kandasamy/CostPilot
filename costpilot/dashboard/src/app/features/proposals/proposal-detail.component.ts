import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from '../../core/services/api.service';
import { Proposal } from '../../core/types/api.types';

@Component({
  selector: 'app-proposal-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatChipsModule, MatIconModule, FormsModule, MatFormFieldModule, MatInputModule],
  template: `
    @if (proposal(); as p) {
      <h2>{{ p.title }}</h2>
      <mat-card>
        <mat-card-content>
          <div class="detail-grid">
            <div><strong>Agent:</strong> {{ p.agentType }}</div>
            <div><strong>Estimated Savings:</strong> \${{ p.estimatedSavings | number:'1.0-0' }}</div>
            <div><strong>Risk Level:</strong> <mat-chip>{{ p.riskLevel }}</mat-chip></div>
            <div><strong>Status:</strong> <mat-chip>{{ p.status }}</mat-chip></div>
            <div><strong>Created:</strong> {{ p.createdAt | date:'medium' }}</div>
          </div>
          <h3>Description</h3>
          <p>{{ p.description }}</p>
          @if (p.status === 'Pending') {
            <div class="actions">
              <mat-form-field appearance="outline" class="comment-field">
                <mat-label>Comment</mat-label>
                <input matInput [(ngModel)]="comment">
              </mat-form-field>
              <button mat-raised-button color="primary" (click)="approve()">
                <mat-icon>check</mat-icon> Approve
              </button>
              <button mat-raised-button color="warn" (click)="reject()">
                <mat-icon>close</mat-icon> Reject
              </button>
            </div>
          }
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [`
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .actions { display: flex; gap: 12px; align-items: center; margin-top: 16px; }
    .comment-field { flex: 1; }
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
}
