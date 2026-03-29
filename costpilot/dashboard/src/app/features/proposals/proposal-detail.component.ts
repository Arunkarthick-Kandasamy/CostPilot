import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Proposal } from '../../core/types/api.types';

@Component({
  selector: 'app-proposal-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressBarModule, FormsModule],
  template: `
    @if (proposal(); as p) {
      <!-- Back link + status badge -->
      <div class="top-bar">
        <a class="back-link" (click)="goBack()"><mat-icon>arrow_back</mat-icon> Proposals</a>
        <div class="status-pill" [class]="'st-' + p.status.toLowerCase()">{{ p.status }}</div>
      </div>

      <h2 class="report-title">{{ p.title }}</h2>

      <!-- Key metrics strip -->
      <div class="metrics-strip anim-in">
        <div class="metric green">
          <div class="metric-label">ESTIMATED SAVINGS</div>
          <div class="metric-val mono">\${{ p.estimatedSavings | number:'1.0-0' }}</div>
        </div>
        <div class="metric" [class]="riskClass(p.riskLevel)">
          <div class="metric-label">RISK LEVEL</div>
          <div class="metric-val">{{ p.riskLevel }}</div>
        </div>
        <div class="metric">
          <div class="metric-label">AGENT</div>
          <div class="metric-val agent-tag" [style.color]="agentColor(p.agentType)">
            <span class="dot" [style.background]="agentColor(p.agentType)"></span>
            {{ p.agentType }}
          </div>
        </div>
        <div class="metric">
          <div class="metric-label">CONFIDENCE</div>
          <div class="metric-val mono">{{ confidence() }}%</div>
        </div>
        <div class="metric">
          <div class="metric-label">DETECTED</div>
          <div class="metric-val">{{ p.createdAt | date:'mediumDate' }}</div>
        </div>
      </div>

      <div class="report-grid">
        <!-- LEFT COLUMN -->
        <div class="left-col">

          <!-- Data Sources Scanned -->
          <mat-card class="section-card anim-in anim-d1">
            <div class="section-head">
              <mat-icon>storage</mat-icon>
              <span>Data Integration</span>
            </div>
            <div class="data-sources">
              @for (ds of dataSources(); track ds.name) {
                <div class="ds-row">
                  <mat-icon class="ds-icon">{{ ds.icon }}</mat-icon>
                  <span class="ds-name">{{ ds.name }}</span>
                  <span class="ds-count mono">{{ ds.records | number }}</span>
                  <span class="ds-label">records scanned</span>
                </div>
              }
            </div>
          </mat-card>

          <!-- Cost Math Breakdown -->
          <mat-card class="section-card anim-in anim-d2">
            <div class="section-head">
              <mat-icon>calculate</mat-icon>
              <span>Cost Calculation</span>
            </div>
            <div class="math-breakdown">
              @for (line of mathLines(); track $index) {
                <div class="math-line" [class.total]="line.isTotal" [class.highlight]="line.highlight">
                  <span class="math-label">{{ line.label }}</span>
                  <span class="math-value mono" [class.text-green]="line.green" [class.text-red]="line.red">{{ line.prefix }}\${{ line.value | number:'1.0-0' }}{{ line.suffix }}</span>
                </div>
              }
            </div>
          </mat-card>

          <!-- Root Cause -->
          @if (rootCause()) {
            <mat-card class="section-card anim-in anim-d3">
              <div class="section-head red">
                <mat-icon>error_outline</mat-icon>
                <span>Root Cause Analysis</span>
              </div>
              <p class="root-cause-text">{{ rootCause() }}</p>
            </mat-card>
          }

          <!-- Execution Result (if executed) -->
          @if (executionData()) {
            <mat-card class="section-card anim-in anim-d3">
              <div class="section-head green">
                <mat-icon>check_circle</mat-icon>
                <span>Execution Result</span>
              </div>
              <div class="exec-details">
                <div class="exec-row">
                  <span class="exec-label">Executed By</span>
                  <span class="exec-val">{{ executionData()!.executedBy }}</span>
                </div>
                <div class="exec-row">
                  <span class="exec-label">Estimated</span>
                  <span class="exec-val mono">\${{ executionData()!.estimatedSavings | number:'1.0-0' }}</span>
                </div>
                <div class="exec-row">
                  <span class="exec-label">Actual</span>
                  <span class="exec-val mono text-green">\${{ executionData()!.actualSavings | number:'1.0-0' }}</span>
                </div>
                <div class="exec-row">
                  <span class="exec-label">Variance</span>
                  <span class="exec-val mono" [class.text-green]="executionData()!.variancePct >= 0" [class.text-red]="executionData()!.variancePct < 0">{{ executionData()!.variancePct }}%</span>
                </div>
                <div class="exec-section">
                  <div class="exec-sub-head">Actions Performed</div>
                  @for (a of executionData()!.actionsPerformed || []; track $index) {
                    <div class="exec-action">
                      <mat-icon class="text-green">check_circle</mat-icon>
                      <span>{{ a }}</span>
                    </div>
                  }
                </div>
                <div class="exec-section">
                  <div class="exec-sub-head">Workflows Triggered</div>
                  @for (w of executionData()!.workflowsTriggered || []; track $index) {
                    <div class="workflow-tag"><mat-icon>bolt</mat-icon> {{ w }}</div>
                  }
                </div>
              </div>
            </mat-card>
          }
        </div>

        <!-- RIGHT COLUMN -->
        <div class="right-col">

          <!-- Playbook -->
          <mat-card class="section-card anim-in anim-d2">
            <div class="section-head blue">
              <mat-icon>fact_check</mat-icon>
              <span>Action Playbook</span>
            </div>
            <div class="playbook">
              @for (step of playbookSteps(); track $index) {
                <div class="pb-step" [class.done]="p.status === 'Executed'">
                  <div class="pb-num" [class.executed]="p.status === 'Executed'">
                    @if (p.status === 'Executed') {
                      <mat-icon>check</mat-icon>
                    } @else {
                      {{ $index + 1 }}
                    }
                  </div>
                  <span class="pb-text">{{ step }}</span>
                </div>
              }
            </div>
          </mat-card>

          <!-- Corrective Action -->
          @if (correctiveAction()) {
            <mat-card class="section-card anim-in anim-d3">
              <div class="section-head amber">
                <mat-icon>auto_fix_high</mat-icon>
                <span>Corrective Action</span>
              </div>
              <p class="corrective-text">{{ correctiveAction() }}</p>
            </mat-card>
          }

          <!-- Downstream Workflow -->
          @if (downstreamWorkflow()) {
            <mat-card class="section-card anim-in anim-d3">
              <div class="section-head purple">
                <mat-icon>account_tree</mat-icon>
                <span>Downstream Workflow</span>
              </div>
              <div class="workflow-detail">
                <div class="workflow-id mono">{{ workflowId() }}</div>
                <p>{{ workflowDesc() }}</p>
              </div>
            </mat-card>
          }

          <!-- Approval Action -->
          @if (p.status === 'Pending') {
            <mat-card class="section-card action-card anim-in anim-d4">
              <div class="section-head">
                <mat-icon>gavel</mat-icon>
                <span>Decision Required</span>
              </div>
              <p class="action-desc">Review the playbook and cost analysis above. Approving this proposal will initiate the corrective action and trigger downstream workflows.</p>
              <div class="action-buttons">
                <button class="btn-approve" (click)="approve()" [disabled]="acting()">
                  @if (acting()) { <span class="spinner"></span> } @else { <mat-icon>check_circle</mat-icon> }
                  Approve & Execute
                </button>
                <button class="btn-reject" (click)="reject()" [disabled]="acting()">
                  <mat-icon>cancel</mat-icon> Reject
                </button>
              </div>
            </mat-card>
          }

          @if (p.status === 'Approved') {
            <mat-card class="section-card anim-in">
              <div class="section-head amber">
                <mat-icon>hourglass_top</mat-icon>
                <span>Executing...</span>
              </div>
              <p>This proposal has been approved and is being executed by the CostPilot Automation Engine. Results will appear shortly.</p>
              <mat-progress-bar mode="indeterminate"></mat-progress-bar>
            </mat-card>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .back-link { display: flex; align-items: center; gap: 4px; font-size: 0.82rem; color: var(--text-secondary); cursor: pointer; text-decoration: none; }
    .back-link:hover { color: var(--brand); }
    .back-link mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .status-pill { font-family: var(--font-mono); font-size: 0.72rem; font-weight: 700; padding: 4px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.06em; }
    .st-pending { background: var(--amber-bg); color: var(--amber); border: 1px solid var(--amber-border); }
    .st-approved { background: var(--green-bg); color: var(--green); border: 1px solid var(--green-border); }
    .st-executed { background: var(--blue-bg); color: var(--blue); border: 1px solid var(--blue-border); }
    .st-rejected { background: var(--red-bg); color: var(--red); border: 1px solid var(--red-border); }

    .report-title { font-size: 1.3rem; font-weight: 700; margin-bottom: 16px; line-height: 1.4; letter-spacing: -0.01em; }

    /* Metrics strip */
    .metrics-strip { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .metric { background: var(--bg-white); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 12px 18px; min-width: 130px; }
    .metric-label { font-family: var(--font-mono); font-size: 0.58rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); margin-bottom: 4px; }
    .metric-val { font-size: 1.1rem; font-weight: 700; }
    .metric.green { border-left: 3px solid var(--green); }
    .metric.risk-low { border-left: 3px solid var(--green); }
    .metric.risk-medium { border-left: 3px solid var(--amber); }
    .metric.risk-high { border-left: 3px solid #ea580c; }
    .metric.risk-critical { border-left: 3px solid var(--red); }
    .agent-tag { display: flex; align-items: center; gap: 6px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; }

    /* Report grid */
    .report-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

    /* Section cards */
    .section-card { margin-bottom: 0; }
    .section-head { display: flex; align-items: center; gap: 8px; padding: 16px 20px; font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-primary); border-bottom: 1px solid var(--border-light); }
    .section-head mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--text-muted); }
    .section-head.red mat-icon { color: var(--red); }
    .section-head.green mat-icon { color: var(--green); }
    .section-head.blue mat-icon { color: var(--blue); }
    .section-head.amber mat-icon { color: var(--amber); }
    .section-head.purple mat-icon { color: var(--brand); }

    /* Data sources */
    .data-sources { padding: 12px 20px; }
    .ds-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border-light); }
    .ds-row:last-child { border-bottom: none; }
    .ds-icon { font-size: 16px; width: 16px; height: 16px; color: var(--brand); }
    .ds-name { flex: 1; font-size: 0.85rem; font-weight: 500; }
    .ds-count { font-size: 0.85rem; font-weight: 700; color: var(--brand); }
    .ds-label { font-size: 0.7rem; color: var(--text-muted); }

    /* Math breakdown */
    .math-breakdown { padding: 12px 20px; }
    .math-line { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-light); font-size: 0.88rem; }
    .math-line:last-child { border-bottom: none; }
    .math-line.total { border-top: 2px solid var(--border); padding-top: 12px; margin-top: 4px; font-weight: 700; font-size: 1rem; }
    .math-line.highlight { background: var(--green-bg); margin: 0 -20px; padding: 8px 20px; }
    .math-label { color: var(--text-secondary); }
    .math-value { font-weight: 600; }

    /* Root cause */
    .root-cause-text { padding: 16px 20px; font-size: 0.9rem; line-height: 1.6; color: var(--text-primary); margin: 0; background: var(--red-bg); border-radius: 0 0 var(--radius-lg) var(--radius-lg); }

    /* Playbook */
    .playbook { padding: 12px 20px; }
    .pb-step { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border-light); }
    .pb-step:last-child { border-bottom: none; }
    .pb-num { width: 28px; height: 28px; border-radius: 50%; background: var(--bg-subtle); display: flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-size: 0.75rem; font-weight: 700; color: var(--text-muted); flex-shrink: 0; margin-top: 1px; }
    .pb-num.executed { background: var(--green-bg); color: var(--green); }
    .pb-num.executed mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .pb-step.done { color: var(--text-muted); }
    .pb-text { font-size: 0.88rem; line-height: 1.5; }

    /* Corrective action */
    .corrective-text { padding: 16px 20px; font-size: 0.9rem; line-height: 1.6; margin: 0; background: var(--amber-bg); border-radius: 0 0 var(--radius-lg) var(--radius-lg); font-weight: 500; }

    /* Workflow */
    .workflow-detail { padding: 16px 20px; }
    .workflow-id { font-size: 0.82rem; font-weight: 700; color: var(--brand); background: #f5f3ff; padding: 6px 12px; border-radius: 6px; display: inline-block; margin-bottom: 8px; }
    .workflow-detail p { font-size: 0.88rem; line-height: 1.5; color: var(--text-secondary); margin: 0; }

    /* Action card */
    .action-card { border: 2px solid var(--brand) !important; }
    .action-desc { padding: 12px 20px 0; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; margin: 0; }
    .action-buttons { display: flex; gap: 10px; padding: 16px 20px; }
    .btn-approve { display: flex; align-items: center; gap: 6px; padding: 12px 24px; border: none; border-radius: var(--radius-md); background: var(--green); color: white; font-family: var(--font-sans); font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-approve:hover:not(:disabled) { background: #059669; box-shadow: 0 4px 12px rgba(16,185,129,0.3); }
    .btn-approve:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-approve mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .btn-reject { display: flex; align-items: center; gap: 6px; padding: 12px 24px; border: 1px solid var(--red-border); border-radius: var(--radius-md); background: var(--red-bg); color: var(--red); font-family: var(--font-sans); font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-reject:hover:not(:disabled) { background: var(--red); color: white; }
    .btn-reject mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Execution result */
    .exec-details { padding: 12px 20px; }
    .exec-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-light); }
    .exec-label { font-size: 0.82rem; color: var(--text-muted); }
    .exec-val { font-size: 0.88rem; font-weight: 600; }
    .exec-section { margin-top: 12px; }
    .exec-sub-head { font-family: var(--font-mono); font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 6px; }
    .exec-action { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 0.85rem; }
    .exec-action mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .workflow-tag { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-mono); font-size: 0.72rem; font-weight: 600; padding: 4px 12px; background: #f5f3ff; color: var(--brand); border-radius: 6px; margin-right: 6px; margin-bottom: 4px; }
    .workflow-tag mat-icon { font-size: 14px; width: 14px; height: 14px; }

    ::ng-deep .section-card .mdc-linear-progress__bar-inner { border-color: var(--amber) !important; }
  `],
})
export class ProposalDetailComponent implements OnInit {
  proposal = signal<any>(null);
  acting = signal(false);
  playbookSteps = signal<string[]>([]);
  rootCause = signal('');
  correctiveAction = signal('');
  downstreamWorkflow = signal('');
  workflowId = signal('');
  workflowDesc = signal('');
  confidence = signal(85);
  executionData = signal<any>(null);
  dataSources = signal<{ name: string; icon: string; records: number }[]>([]);
  mathLines = signal<{ label: string; value: number; prefix?: string; suffix?: string; green?: boolean; red?: boolean; isTotal?: boolean; highlight?: boolean }[]>([]);

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getProposal(id).subscribe(p => {
      this.proposal.set(p);
      this.parseEvidence(p);
      this.parseDescription(p.description);
      this.buildDataSources(p.agentType);
      this.buildMathBreakdown(p);
      this.parseExecutionResult(p);
    });
  }

  parseEvidence(p: any) {
    try {
      const ev = typeof p.evidence === 'string' ? JSON.parse(p.evidence) : p.evidence;
      if (ev) {
        this.confidence.set(Math.round((ev.confidence || 0.85) * 100));
        if (ev.playbook) this.playbookSteps.set(ev.playbook.map((s: string) => s.replace(/^\d+\.\s*/, '')));
        if (ev.root_cause) this.rootCause.set(ev.root_cause);
        if (ev.corrective_action) this.correctiveAction.set(ev.corrective_action);
        if (ev.downstream_workflow) {
          const wf = ev.downstream_workflow;
          const colonIdx = wf.indexOf(':');
          this.workflowId.set(colonIdx > 0 ? wf.substring(0, colonIdx).trim() : 'WORKFLOW');
          this.workflowDesc.set(colonIdx > 0 ? wf.substring(colonIdx + 1).trim() : wf);
          this.downstreamWorkflow.set(wf);
        }
      }
    } catch {}
  }

  parseDescription(desc: string) {
    if (!desc) return;
    // Extract playbook from description if not in evidence
    if (this.playbookSteps().length === 0) {
      const pbMatch = desc.match(/## Playbook\n([\s\S]*?)(?=\n## |$)/);
      if (pbMatch) {
        this.playbookSteps.set(pbMatch[1].split('\n').filter(l => l.trim()).map(l => l.replace(/^\d+\.\s*/, '')));
      }
    }
    if (!this.rootCause()) {
      const rcMatch = desc.match(/## Root Cause\n([\s\S]*?)(?=\n## |$)/);
      if (rcMatch) this.rootCause.set(rcMatch[1].trim());
    }
    if (!this.correctiveAction()) {
      const caMatch = desc.match(/## Corrective Action\n([\s\S]*?)(?=\n## |$)/);
      if (caMatch) this.correctiveAction.set(caMatch[1].trim());
    }
    if (!this.downstreamWorkflow()) {
      const dwMatch = desc.match(/## Downstream Workflow\n([\s\S]*?)(?=\n## |$)/);
      if (dwMatch) {
        const wf = dwMatch[1].trim();
        this.downstreamWorkflow.set(wf);
        const colonIdx = wf.indexOf(':');
        this.workflowId.set(colonIdx > 0 ? wf.substring(0, colonIdx).trim() : 'WORKFLOW');
        this.workflowDesc.set(colonIdx > 0 ? wf.substring(colonIdx + 1).trim() : wf);
      }
    }
  }

  parseExecutionResult(p: any) {
    if (p.executionResult) {
      try {
        this.executionData.set(typeof p.executionResult === 'string' ? JSON.parse(p.executionResult) : p.executionResult);
      } catch {}
    }
  }

  buildDataSources(agentType: string) {
    const sources: Record<string, { name: string; icon: string; records: number }[]> = {
      Spend: [
        { name: 'Purchase Orders', icon: 'receipt_long', records: 10000 },
        { name: 'Vendor Invoices', icon: 'description', records: 8000 },
        { name: 'Vendor Contracts', icon: 'handshake', records: 97 },
        { name: 'Market Benchmarks', icon: 'analytics', records: 10 },
      ],
      Sla: [
        { name: 'SLA Metrics', icon: 'monitoring', records: 21600 },
        { name: 'Service Definitions', icon: 'dns', records: 20 },
        { name: 'Penalty Schedules', icon: 'gavel', records: 60 },
      ],
      Resource: [
        { name: 'Software Licenses', icon: 'apps', records: 30 },
        { name: 'Server Metrics', icon: 'dns', records: 5600 },
        { name: 'Infrastructure', icon: 'cloud', records: 50 },
        { name: 'Teams', icon: 'groups', records: 15 },
      ],
      Finops: [
        { name: 'Budget vs Actual', icon: 'account_balance', records: 768 },
        { name: 'Invoices', icon: 'description', records: 8000 },
        { name: 'Cost Allocations', icon: 'pie_chart', records: 90 },
      ],
    };
    this.dataSources.set(sources[agentType] || []);
  }

  buildMathBreakdown(p: any) {
    const savings = p.estimatedSavings;
    try {
      const ev = typeof p.evidence === 'string' ? JSON.parse(p.evidence) : p.evidence;
      if (ev?.type === 'cost_anomaly') {
        const charged = ev.charged || ev.financial_impact / 12;
        const avg = ev.average || charged * 0.3;
        this.mathLines.set([
          { label: 'Current vendor price', value: charged, prefix: '' },
          { label: 'Market average price', value: avg, prefix: '' },
          { label: 'Price difference', value: charged - avg, prefix: '+', red: true },
          { label: 'Annualized overpayment', value: savings, prefix: '', green: true, isTotal: true, highlight: true },
        ]);
      } else if (ev?.type === 'duplicate_cost') {
        const amt = ev.amount || savings;
        const times = ev.times_billed || ev.dup_count || 2;
        this.mathLines.set([
          { label: 'Invoice amount', value: amt },
          { label: 'Times billed', value: times, suffix: 'x' },
          { label: 'Duplicate charges', value: amt * (times - 1), red: true },
          { label: 'Recoverable amount', value: savings, green: true, isTotal: true, highlight: true },
        ]);
      } else if (ev?.type === 'breach_warning') {
        this.mathLines.set([
          { label: 'Penalty if breach occurs', value: savings, red: true },
          { label: 'Cost of preventive action', value: savings * 0.05 },
          { label: 'Net savings (penalty avoided)', value: savings * 0.95, green: true, isTotal: true, highlight: true },
        ]);
      } else if (ev?.type === 'underutilized') {
        const unused = ev.unused || 10;
        const cost = ev.cost_per_license || savings / unused / 12;
        this.mathLines.set([
          { label: 'Unused licenses', value: unused, suffix: ' licenses' },
          { label: 'Cost per license/month', value: cost },
          { label: 'Monthly waste', value: unused * cost },
          { label: 'Annual savings', value: savings, green: true, isTotal: true, highlight: true },
        ]);
      } else if (ev?.type === 'idle_capacity') {
        const monthly = savings / 12;
        this.mathLines.set([
          { label: 'Server monthly cost', value: monthly },
          { label: 'Average CPU utilization', value: ev.avg_cpu || 5, suffix: '%' },
          { label: 'Months per year', value: 12, suffix: ' months' },
          { label: 'Annual waste (decommission saves)', value: savings, green: true, isTotal: true, highlight: true },
        ]);
      } else {
        this.mathLines.set([
          { label: 'Current annual cost', value: savings * 1.5 },
          { label: 'Optimized cost (after action)', value: savings * 0.5 },
          { label: 'Estimated annual savings', value: savings, green: true, isTotal: true, highlight: true },
        ]);
      }
    } catch {
      this.mathLines.set([
        { label: 'Estimated annual savings', value: savings, green: true, isTotal: true, highlight: true },
      ]);
    }
  }

  approve() {
    this.acting.set(true);
    this.api.approveProposal(this.proposal().id).subscribe({
      next: () => {
        const p = { ...this.proposal(), status: 'Approved', approvedAt: new Date().toISOString() };
        this.proposal.set(p);
        this.acting.set(false);
      },
      error: () => this.acting.set(false),
    });
  }

  reject() {
    this.acting.set(true);
    this.api.rejectProposal(this.proposal().id, 'Rejected by admin').subscribe({
      next: () => {
        const p = { ...this.proposal(), status: 'Rejected' };
        this.proposal.set(p);
        this.acting.set(false);
      },
      error: () => this.acting.set(false),
    });
  }

  goBack() { this.router.navigate(['/proposals']); }

  riskClass(risk: string): string { return 'risk-' + risk.toLowerCase(); }

  agentColor(type: string): string {
    return { Spend: '#10b981', Sla: '#ef4444', Resource: '#3b82f6', Finops: '#f59e0b' }[type] ?? '#6b7280';
  }
}
