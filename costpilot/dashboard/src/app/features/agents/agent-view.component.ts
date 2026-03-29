import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../core/services/api.service';
import { AgentStatus, AgentAlert } from '../../core/types/api.types';

interface AgentConfig {
  [key: string]: { label: string; value: number; min: number; max: number; step: number; unit: string };
}

@Component({
  selector: 'app-agent-view',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatIconModule, MatSliderModule, MatFormFieldModule, MatInputModule, MatProgressBarModule, MatTableModule],
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
    </div>

    <!-- Stats Row -->
    <div class="stat-strip anim-in">
      <div class="stat-card">
        <div class="stat-icon" [class]="agentType()"><mat-icon>lightbulb</mat-icon></div>
        <div><div class="stat-val mono">{{ status()?.proposalCount ?? 0 }}</div><div class="stat-lbl">Proposals</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue"><mat-icon>visibility</mat-icon></div>
        <div><div class="stat-val mono">{{ status()?.insightCount ?? 0 }}</div><div class="stat-lbl">Insights</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green"><mat-icon>fiber_manual_record</mat-icon></div>
        <div><div class="stat-val">{{ agentHealth() }}</div><div class="stat-lbl">Status</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon amber"><mat-icon>schedule</mat-icon></div>
        <div><div class="stat-val">{{ status()?.lastActivity ? (status()!.lastActivity | date:'shortTime') : 'Never' }}</div><div class="stat-lbl">Last Activity</div></div>
      </div>
    </div>

    <!-- Configuration + Run Panel -->
    <mat-card class="config-card anim-in anim-d2">
      <div class="card-head">
        <div>
          <div class="card-title">ANALYSIS CONFIGURATION</div>
          <div class="card-subtitle">Adjust detection thresholds and run analysis</div>
        </div>
      </div>

      <div class="config-body">
        <div class="config-grid">
          @for (key of configKeys(); track key) {
            <div class="config-item">
              <label class="config-label">{{ config()[key].label }}</label>
              <div class="slider-row">
                <input type="range"
                  [min]="config()[key].min" [max]="config()[key].max" [step]="config()[key].step"
                  [value]="config()[key].value"
                  (input)="updateConfig(key, $event)"
                  class="config-slider" />
                <span class="config-value mono">{{ config()[key].value }}{{ config()[key].unit }}</span>
              </div>
            </div>
          }
        </div>

        <div class="run-section">
          <button class="btn-primary run-btn" (click)="runAnalysis()" [disabled]="analyzing()">
            @if (analyzing()) {
              <span class="spinner"></span> Analyzing data...
            } @else {
              <mat-icon>play_arrow</mat-icon> Run Analysis
            }
          </button>
          <button class="btn-export" (click)="runAndSave()" [disabled]="analyzing()">
            <mat-icon>save</mat-icon> Run & Save to Dashboard
          </button>
        </div>

        @if (analyzing()) {
          <mat-progress-bar mode="indeterminate" class="analysis-progress"></mat-progress-bar>
        }
      </div>
    </mat-card>

    <!-- Live Results -->
    @if (analysisResults()) {
      <div class="results-section anim-in">
        <!-- Summary Banner -->
        <div class="results-banner">
          <div class="result-stat">
            <span class="result-num mono">{{ analysisResults()!.summary?.total_findings ?? 0 }}</span>
            <span class="result-lbl">Findings</span>
          </div>
          <div class="result-stat green">
            <span class="result-num mono">\${{ formatNum(analysisResults()!.summary?.total_potential_savings ?? 0) }}</span>
            <span class="result-lbl">Potential Savings</span>
          </div>
          <div class="result-stat">
            <span class="result-num mono">{{ analysisTime() }}s</span>
            <span class="result-lbl">Analysis Time</span>
          </div>
        </div>

        <!-- Result Tables -->
        @for (section of resultSections(); track section.key) {
          @if (section.data.length > 0) {
            <mat-card class="result-card">
              <div class="card-head">
                <div>
                  <div class="card-title">{{ section.title }}</div>
                  <div class="card-subtitle">{{ section.data.length }} found</div>
                </div>
              </div>
              <div class="result-table">
                @for (row of section.data; track $index) {
                  <div class="result-row">
                    <span class="row-num mono">{{ $index + 1 }}</span>
                    <div class="row-content">
                      @for (field of section.fields; track field.key) {
                        <div class="row-field">
                          <span class="field-label">{{ field.label }}</span>
                          <span class="field-value" [class.mono]="field.mono" [class.text-green]="field.green" [class.text-red]="field.red">
                            {{ field.prefix }}{{ getField(row, field.key) | number:(field.format || '1.0-0') }}{{ field.suffix }}
                          </span>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </mat-card>
          }
        }
      </div>
    }

    <!-- Alerts -->
    <mat-card class="anim-in anim-d3">
      <div class="card-head">
        <div>
          <div class="card-title">AGENT ALERTS</div>
          <div class="card-subtitle">Recent notifications</div>
        </div>
      </div>
      @if (alerts().length > 0) {
        <div class="alerts-list">
          @for (a of alerts(); track a.id) {
            <div class="alert-row" [class]="'sev-' + a.severity.toLowerCase()">
              <mat-icon>{{ a.severity === 'Critical' ? 'error' : a.severity === 'Warning' ? 'warning_amber' : 'info_outline' }}</mat-icon>
              <div class="alert-body">
                <span class="alert-title">{{ a.title }}</span>
                <span class="alert-msg">{{ a.message }}</span>
              </div>
              <span class="alert-time mono">{{ a.createdAt | date:'short' }}</span>
            </div>
          }
        </div>
      } @else {
        <div class="empty-state">
          <mat-icon>notifications_none</mat-icon>
          <p>No alerts. Configure thresholds above and click "Run Analysis" to start.</p>
        </div>
      }
    </mat-card>
  `,
  styles: [`
    .page-header { margin-bottom: 20px; }
    .page-header h2 { margin-bottom: 2px; }
    .sub { color: var(--text-secondary); font-size: 0.88rem; margin: 0; }

    .agent-badge { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 0.68rem; font-weight: 600; padding: 4px 12px; border-radius: 6px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.06em; }
    .dot-sm { width: 6px; height: 6px; border-radius: 50%; }

    .stat-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
    .stat-card { background: var(--bg-white); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 18px 20px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow-xs); }
    .stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
    .stat-icon mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .stat-icon.spend { background: #ecfdf5; color: #10b981; }
    .stat-icon.sla { background: #fef2f2; color: #ef4444; }
    .stat-icon.resource { background: #eff6ff; color: #3b82f6; }
    .stat-icon.finops { background: #fffbeb; color: #f59e0b; }
    .stat-icon.blue { background: var(--blue-bg); color: var(--blue); }
    .stat-icon.green { background: var(--green-bg); color: var(--green); }
    .stat-icon.amber { background: var(--amber-bg); color: var(--amber); }
    .stat-val { font-size: 1.25rem; font-weight: 700; }
    .stat-lbl { font-size: 0.75rem; color: var(--text-muted); }

    /* Config Card */
    .config-card { margin-bottom: 20px; }
    .card-head { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px 8px; }
    .card-title { font-family: var(--font-mono); font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
    .card-subtitle { font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px; }

    .config-body { padding: 12px 24px 24px; }
    .config-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .config-item { }
    .config-label { font-size: 0.82rem; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 8px; }
    .slider-row { display: flex; align-items: center; gap: 12px; }
    .config-slider { flex: 1; height: 6px; -webkit-appearance: none; appearance: none; background: var(--border); border-radius: 3px; outline: none; }
    .config-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--brand); cursor: pointer; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
    .config-value { font-size: 0.9rem; font-weight: 700; color: var(--brand); min-width: 60px; text-align: right; }

    .run-section { display: flex; gap: 10px; margin-bottom: 8px; }
    .run-btn { padding: 12px 28px; font-size: 0.9rem; }
    .analysis-progress { margin-top: 12px; border-radius: 4px; }
    ::ng-deep .analysis-progress .mdc-linear-progress__bar-inner { border-color: var(--brand) !important; }

    .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Results */
    .results-section { margin-bottom: 20px; }
    .results-banner { display: flex; gap: 16px; margin-bottom: 16px; }
    .result-stat { background: var(--bg-white); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px 24px; display: flex; flex-direction: column; box-shadow: var(--shadow-xs); }
    .result-stat.green { border-left: 3px solid var(--green); }
    .result-num { font-size: 1.5rem; font-weight: 700; }
    .result-lbl { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }

    .result-card { margin-bottom: 12px; }
    .result-table { padding: 4px 20px 16px; }
    .result-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border-light); }
    .result-row:last-child { border-bottom: none; }
    .row-num { font-size: 0.82rem; font-weight: 700; color: var(--text-muted); min-width: 24px; margin-top: 2px; }
    .row-content { display: flex; flex-wrap: wrap; gap: 16px; flex: 1; }
    .row-field { display: flex; flex-direction: column; min-width: 100px; }
    .field-label { font-family: var(--font-mono); font-size: 0.6rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
    .field-value { font-size: 0.88rem; font-weight: 500; margin-top: 2px; }

    /* Alerts */
    .alerts-list { padding: 8px 20px 16px; }
    .alert-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; border-radius: 10px; margin-bottom: 6px; }
    .alert-row mat-icon { margin-top: 1px; font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
    .sev-critical { background: var(--red-bg); }
    .sev-critical mat-icon { color: var(--red); }
    .sev-warning { background: var(--amber-bg); }
    .sev-warning mat-icon { color: var(--amber); }
    .sev-info { background: var(--blue-bg); }
    .sev-info mat-icon { color: var(--blue); }
    .alert-body { flex: 1; display: flex; flex-direction: column; }
    .alert-title { font-size: 0.85rem; font-weight: 600; }
    .alert-msg { font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px; }
    .alert-time { font-size: 0.7rem; color: var(--text-muted); white-space: nowrap; }

    .empty-state { text-align: center; padding: 40px 20px; color: var(--text-muted); }
    .empty-state mat-icon { font-size: 36px; width: 36px; height: 36px; color: var(--border); margin-bottom: 12px; }
    .empty-state p { max-width: 320px; margin: 0 auto; line-height: 1.5; font-size: 0.88rem; }
  `],
})
export class AgentViewComponent implements OnInit {
  agentType = signal('');
  status = signal<AgentStatus | null>(null);
  alerts = signal<AgentAlert[]>([]);
  analysisResults = signal<any>(null);
  analysisTime = signal('0.0');
  analyzing = signal(false);
  agentHealth = signal('Unknown');
  config = signal<AgentConfig>({});
  configKeys = signal<string[]>([]);

  private agentConfigs: Record<string, AgentConfig> = {
    spend: {
      price_anomaly_threshold: { label: 'Price Anomaly Threshold', value: 25, min: 5, max: 100, step: 5, unit: '%' },
      duplicate_window_days: { label: 'Duplicate Detection Window', value: 30, min: 7, max: 90, step: 1, unit: ' days' },
      rate_above_market_pct: { label: 'Above-Market Rate Threshold', value: 15, min: 5, max: 50, step: 5, unit: '%' },
      max_results: { label: 'Max Results Per Category', value: 10, min: 3, max: 25, step: 1, unit: '' },
    },
    sla: {
      lookback_days: { label: 'Lookback Period', value: 7, min: 1, max: 30, step: 1, unit: ' days' },
      uptime_margin_pct: { label: 'Uptime Breach Margin', value: 1.0, min: 0.1, max: 5.0, step: 0.1, unit: '%' },
      response_margin_pct: { label: 'Response Time Margin', value: 10, min: 5, max: 30, step: 1, unit: '%' },
      max_results: { label: 'Max Results', value: 10, min: 3, max: 20, step: 1, unit: '' },
    },
    resource: {
      license_utilization_threshold: { label: 'License Utilization Threshold', value: 60, min: 20, max: 90, step: 5, unit: '%' },
      server_cpu_threshold: { label: 'Idle Server CPU Threshold', value: 10, min: 2, max: 30, step: 1, unit: '%' },
      lookback_days: { label: 'Metrics Lookback Period', value: 7, min: 1, max: 30, step: 1, unit: ' days' },
      max_results: { label: 'Max Results Per Category', value: 10, min: 3, max: 25, step: 1, unit: '' },
    },
    finops: {
      variance_threshold_pct: { label: 'Budget Variance Threshold', value: 15, min: 5, max: 50, step: 5, unit: '%' },
      max_results: { label: 'Max Results', value: 10, min: 3, max: 25, step: 1, unit: '' },
    },
  };

  private resultFieldMap: Record<string, { key: string; title: string; fields: { key: string; label: string; mono?: boolean; green?: boolean; red?: boolean; prefix?: string; suffix?: string; format?: string }[] }[]> = {
    spend: [
      { key: 'anomalies', title: 'PRICE ANOMALIES', fields: [
        { key: 'vendor', label: 'Vendor' },
        { key: 'item', label: 'Item' },
        { key: 'charged', label: 'Charged', mono: true, prefix: '$' },
        { key: 'average', label: 'Average', mono: true, prefix: '$' },
        { key: 'pct_above', label: 'Above Avg', mono: true, red: true, suffix: '%', format: '1.1-1' },
        { key: 'overpayment', label: 'Overpayment', mono: true, green: true, prefix: '$' },
      ]},
      { key: 'duplicates', title: 'DUPLICATE INVOICES', fields: [
        { key: 'vendor', label: 'Vendor' },
        { key: 'amount', label: 'Amount', mono: true, prefix: '$' },
        { key: 'times_billed', label: 'Times Billed', mono: true, red: true },
        { key: 'wasted', label: 'Wasted', mono: true, green: true, prefix: '$' },
      ]},
      { key: 'rate_issues', title: 'ABOVE-MARKET RATES', fields: [
        { key: 'vendor', label: 'Vendor' },
        { key: 'category', label: 'Category' },
        { key: 'annual_cost', label: 'Current Cost', mono: true, prefix: '$' },
        { key: 'market_rate', label: 'Market Rate', mono: true, prefix: '$' },
        { key: 'pct_above', label: 'Above Market', mono: true, red: true, suffix: '%', format: '1.1-1' },
        { key: 'potential_savings', label: 'Savings', mono: true, green: true, prefix: '$' },
      ]},
    ],
    sla: [
      { key: 'sla_risks', title: 'SLA BREACH RISKS', fields: [
        { key: 'service', label: 'Service' },
        { key: 'current_uptime', label: 'Uptime', mono: true, suffix: '%', format: '1.2-2' },
        { key: 'uptime_target', label: 'Target', mono: true, suffix: '%', format: '1.3-3' },
        { key: 'current_response', label: 'Response', mono: true, suffix: 'ms', format: '1.0-0' },
        { key: 'response_limit', label: 'Limit', mono: true, suffix: 'ms' },
        { key: 'penalty_at_risk', label: 'Penalty', mono: true, green: true, prefix: '$' },
      ]},
    ],
    resource: [
      { key: 'unused_licenses', title: 'UNUSED LICENSES', fields: [
        { key: 'tool', label: 'Tool' },
        { key: 'used', label: 'Used', mono: true },
        { key: 'total', label: 'Total', mono: true },
        { key: 'utilization_pct', label: 'Utilization', mono: true, red: true, suffix: '%', format: '1.1-1' },
        { key: 'annual_waste', label: 'Annual Waste', mono: true, green: true, prefix: '$' },
      ]},
      { key: 'idle_servers', title: 'IDLE SERVERS', fields: [
        { key: 'server', label: 'Server' },
        { key: 'type', label: 'Type' },
        { key: 'avg_cpu', label: 'Avg CPU', mono: true, red: true, suffix: '%', format: '1.1-1' },
        { key: 'avg_memory', label: 'Avg Memory', mono: true, suffix: '%', format: '1.1-1' },
        { key: 'annual_cost', label: 'Annual Cost', mono: true, green: true, prefix: '$' },
      ]},
    ],
    finops: [
      { key: 'budget_variances', title: 'BUDGET VARIANCES', fields: [
        { key: 'department', label: 'Department' },
        { key: 'category', label: 'Category' },
        { key: 'budgeted', label: 'Budget', mono: true, prefix: '$' },
        { key: 'actual', label: 'Actual', mono: true, prefix: '$' },
        { key: 'variance_pct', label: 'Variance', mono: true, red: true, suffix: '%', format: '1.1-1' },
        { key: 'variance_amount', label: 'Over', mono: true, green: true, prefix: '$' },
      ]},
      { key: 'unreconciled_invoices', title: 'UNRECONCILED INVOICES', fields: [
        { key: 'vendor', label: 'Vendor' },
        { key: 'count', label: 'Count', mono: true },
        { key: 'total_amount', label: 'Total', mono: true, prefix: '$' },
      ]},
    ],
  };

  constructor(private api: ApiService, private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const type = params.get('type')!;
      this.agentType.set(type);
      this.analysisResults.set(null);
      this.config.set(JSON.parse(JSON.stringify(this.agentConfigs[type] || {})));
      this.configKeys.set(Object.keys(this.agentConfigs[type] || {}));
      this.api.getAgentStatus(type).subscribe(s => this.status.set(s));
      this.api.getAgentAlerts(type).subscribe(a => this.alerts.set(a));
      this.http.get<any>(`/agent/${type}/health`).subscribe({
        next: h => this.agentHealth.set(h.status === 'healthy' ? 'Online' : h.status),
        error: () => this.agentHealth.set('Offline'),
      });
    });
  }

  updateConfig(key: string, event: Event) {
    const val = parseFloat((event.target as HTMLInputElement).value);
    const c = { ...this.config() };
    c[key] = { ...c[key], value: val };
    this.config.set(c);
  }

  runAnalysis() {
    this.analyzing.set(true);
    this.analysisResults.set(null);
    const params: any = {};
    for (const [k, v] of Object.entries(this.config())) {
      params[k] = v.value;
    }
    const start = performance.now();
    this.http.post<any>(`/agent/${this.agentType()}/analyze`, params).subscribe({
      next: res => {
        this.analysisTime.set(((performance.now() - start) / 1000).toFixed(1));
        this.analysisResults.set(res);
        this.analyzing.set(false);
      },
      error: err => {
        console.error('Analysis failed:', err);
        this.analyzing.set(false);
      },
    });
  }

  runAndSave() {
    this.analyzing.set(true);
    this.http.post<any>(`/agent/${this.agentType()}/run`, {}).subscribe({
      next: res => {
        this.analysisResults.set({ summary: { total_findings: res.findings_count ?? res.findings?.length ?? 0, total_potential_savings: 0 }, ...res });
        this.analyzing.set(false);
        this.api.getAgentStatus(this.agentType()).subscribe(s => this.status.set(s));
        this.api.getAgentAlerts(this.agentType()).subscribe(a => this.alerts.set(a));
      },
      error: () => this.analyzing.set(false),
    });
  }

  resultSections(): { key: string; title: string; data: any[]; fields: any[] }[] {
    const res = this.analysisResults();
    if (!res) return [];
    const map = this.resultFieldMap[this.agentType()] || [];
    return map.map(s => ({ ...s, data: res[s.key] || [] })).filter(s => s.data.length > 0);
  }

  getField(row: any, key: string): any {
    return row[key] ?? '-';
  }

  formatNum(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
    return n.toFixed(0);
  }

  agentLabel(): string { return { spend: 'Spend Intelligence', sla: 'SLA Prevention', resource: 'Resource Optimization', finops: 'FinOps' }[this.agentType()] ?? this.agentType(); }
  agentDesc(): string {
    return { spend: 'Detects price anomalies, duplicate invoices, and above-market vendor rates', sla: 'Monitors SLA compliance and predicts breach risks with penalty exposure', resource: 'Identifies unused licenses and idle infrastructure for consolidation', finops: 'Analyzes budget variances and flags unreconciled transactions' }[this.agentType()] ?? '';
  }
  agentClr(): string { return { spend: '#10b981', sla: '#ef4444', resource: '#3b82f6', finops: '#f59e0b' }[this.agentType()] ?? '#6b7280'; }
  agentBg(): string { return { spend: '#ecfdf5', sla: '#fef2f2', resource: '#eff6ff', finops: '#fffbeb' }[this.agentType()] ?? '#f9fafb'; }
}
