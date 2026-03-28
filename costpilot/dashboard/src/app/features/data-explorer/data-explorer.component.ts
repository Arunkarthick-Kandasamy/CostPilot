import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { echarts } from '../../core/providers/echarts-setup';
import { ApiService } from '../../core/services/api.service';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'app-data-explorer',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTabsModule, MatIconModule, MatTableModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  template: `
    <div class="page-header">
      <div>
        <h2>Data Explorer</h2>
        <p class="sub">Browse operational data ingested from enterprise systems</p>
      </div>
    </div>

    <!-- Data Stats Banner -->
    <div class="stats-banner anim-in">
      @for (s of statItems(); track s.label) {
        <div class="stat-chip">
          <span class="stat-num mono">{{ s.count | number }}</span>
          <span class="stat-lbl">{{ s.label }}</span>
        </div>
      }
    </div>

    <mat-card class="anim-in anim-d2">
      <mat-tab-group (selectedTabChange)="onTabChange($event)">

        <!-- Vendors -->
        <mat-tab>
          <ng-template mat-tab-label><mat-icon>business</mat-icon>&nbsp; Vendors</ng-template>
          <div class="tab-content">
            <table mat-table [dataSource]="vendors()">
              <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Name</th><td mat-cell *matCellDef="let r">{{ r.name }}</td></ng-container>
              <ng-container matColumnDef="category"><th mat-header-cell *matHeaderCellDef>Category</th><td mat-cell *matCellDef="let r"><span class="cat-tag">{{ r.category }}</span></td></ng-container>
              <ng-container matColumnDef="contactEmail"><th mat-header-cell *matHeaderCellDef>Contact</th><td mat-cell *matCellDef="let r">{{ r.contactEmail }}</td></ng-container>
              <ng-container matColumnDef="paymentTermsDays"><th mat-header-cell *matHeaderCellDef>Payment Terms</th><td mat-cell *matCellDef="let r" class="mono">{{ r.paymentTermsDays }} days</td></ng-container>
              <tr mat-header-row *matHeaderRowDef="['name','category','contactEmail','paymentTermsDays']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['name','category','contactEmail','paymentTermsDays']"></tr>
            </table>
          </div>
        </mat-tab>

        <!-- Purchase Orders -->
        <mat-tab>
          <ng-template mat-tab-label><mat-icon>receipt_long</mat-icon>&nbsp; Purchase Orders</ng-template>
          <div class="tab-content">
            <table mat-table [dataSource]="purchaseOrders()">
              <ng-container matColumnDef="vendorName"><th mat-header-cell *matHeaderCellDef>Vendor</th><td mat-cell *matCellDef="let r">{{ r.vendorName }}</td></ng-container>
              <ng-container matColumnDef="itemDescription"><th mat-header-cell *matHeaderCellDef>Item</th><td mat-cell *matCellDef="let r">{{ r.itemDescription }}</td></ng-container>
              <ng-container matColumnDef="quantity"><th mat-header-cell *matHeaderCellDef>Qty</th><td mat-cell *matCellDef="let r" class="mono">{{ r.quantity }}</td></ng-container>
              <ng-container matColumnDef="unitPrice"><th mat-header-cell *matHeaderCellDef>Unit Price</th><td mat-cell *matCellDef="let r" class="mono">\${{ r.unitPrice | number:'1.2-2' }}</td></ng-container>
              <ng-container matColumnDef="totalAmount"><th mat-header-cell *matHeaderCellDef>Total</th><td mat-cell *matCellDef="let r" class="mono text-green">\${{ r.totalAmount | number:'1.0-0' }}</td></ng-container>
              <ng-container matColumnDef="orderDate"><th mat-header-cell *matHeaderCellDef>Date</th><td mat-cell *matCellDef="let r" class="mono">{{ r.orderDate | date:'shortDate' }}</td></ng-container>
              <tr mat-header-row *matHeaderRowDef="['vendorName','itemDescription','quantity','unitPrice','totalAmount','orderDate']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['vendorName','itemDescription','quantity','unitPrice','totalAmount','orderDate']"></tr>
            </table>
            <div class="table-footer mono">Showing {{ purchaseOrders().length }} of {{ poTotal() | number }} records</div>
          </div>
        </mat-tab>

        <!-- Invoices -->
        <mat-tab>
          <ng-template mat-tab-label><mat-icon>description</mat-icon>&nbsp; Invoices</ng-template>
          <div class="tab-content">
            <table mat-table [dataSource]="invoices()">
              <ng-container matColumnDef="invoiceNumber"><th mat-header-cell *matHeaderCellDef>Invoice #</th><td mat-cell *matCellDef="let r" class="mono">{{ r.invoiceNumber }}</td></ng-container>
              <ng-container matColumnDef="vendorName"><th mat-header-cell *matHeaderCellDef>Vendor</th><td mat-cell *matCellDef="let r">{{ r.vendorName }}</td></ng-container>
              <ng-container matColumnDef="amount"><th mat-header-cell *matHeaderCellDef>Amount</th><td mat-cell *matCellDef="let r" class="mono">\${{ r.amount | number:'1.2-2' }}</td></ng-container>
              <ng-container matColumnDef="invoiceDate"><th mat-header-cell *matHeaderCellDef>Date</th><td mat-cell *matCellDef="let r" class="mono">{{ r.invoiceDate | date:'shortDate' }}</td></ng-container>
              <ng-container matColumnDef="reconciled"><th mat-header-cell *matHeaderCellDef>Reconciled</th><td mat-cell *matCellDef="let r"><span [class]="r.reconciled ? 'badge-green' : 'badge-amber'">{{ r.reconciled ? 'Yes' : 'No' }}</span></td></ng-container>
              <tr mat-header-row *matHeaderRowDef="['invoiceNumber','vendorName','amount','invoiceDate','reconciled']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['invoiceNumber','vendorName','amount','invoiceDate','reconciled']"></tr>
            </table>
            <div class="table-footer mono">Showing {{ invoices().length }} of {{ invTotal() | number }} records</div>
          </div>
        </mat-tab>

        <!-- SLA Services -->
        <mat-tab>
          <ng-template mat-tab-label><mat-icon>verified_user</mat-icon>&nbsp; SLA Services</ng-template>
          <div class="tab-content">
            <table mat-table [dataSource]="slaServices()">
              <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Service</th><td mat-cell *matCellDef="let r">{{ r.name }}</td></ng-container>
              <ng-container matColumnDef="slaUptimeTarget"><th mat-header-cell *matHeaderCellDef>Uptime Target</th><td mat-cell *matCellDef="let r" class="mono">{{ r.slaUptimeTarget }}%</td></ng-container>
              <ng-container matColumnDef="slaResponseTimeMs"><th mat-header-cell *matHeaderCellDef>Response (ms)</th><td mat-cell *matCellDef="let r" class="mono">{{ r.slaResponseTimeMs }}ms</td></ng-container>
              <ng-container matColumnDef="slaResolutionHours"><th mat-header-cell *matHeaderCellDef>Resolution (hrs)</th><td mat-cell *matCellDef="let r" class="mono">{{ r.slaResolutionHours }}h</td></ng-container>
              <tr mat-header-row *matHeaderRowDef="['name','slaUptimeTarget','slaResponseTimeMs','slaResolutionHours']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['name','slaUptimeTarget','slaResponseTimeMs','slaResolutionHours']"></tr>
            </table>
          </div>
        </mat-tab>

        <!-- Software Licenses -->
        <mat-tab>
          <ng-template mat-tab-label><mat-icon>apps</mat-icon>&nbsp; Licenses</ng-template>
          <div class="tab-content">
            <div echarts [options]="licenseChart()" style="height: 300px; margin-bottom: 16px;"></div>
            <table mat-table [dataSource]="softwareTools()">
              <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Tool</th><td mat-cell *matCellDef="let r">{{ r.name }}</td></ng-container>
              <ng-container matColumnDef="usedLicenses"><th mat-header-cell *matHeaderCellDef>Used</th><td mat-cell *matCellDef="let r" class="mono">{{ r.usedLicenses }}</td></ng-container>
              <ng-container matColumnDef="totalLicenses"><th mat-header-cell *matHeaderCellDef>Total</th><td mat-cell *matCellDef="let r" class="mono">{{ r.totalLicenses }}</td></ng-container>
              <ng-container matColumnDef="utilization"><th mat-header-cell *matHeaderCellDef>Utilization</th><td mat-cell *matCellDef="let r">
                <div class="util-bar"><div class="util-fill" [style.width.%]="r.totalLicenses > 0 ? (r.usedLicenses/r.totalLicenses*100) : 0" [class.low]="r.usedLicenses/r.totalLicenses < 0.5"></div></div>
                <span class="mono" style="font-size:0.72rem">{{ r.totalLicenses > 0 ? (r.usedLicenses/r.totalLicenses*100).toFixed(0) : 0 }}%</span>
              </td></ng-container>
              <ng-container matColumnDef="annualCost"><th mat-header-cell *matHeaderCellDef>Annual Cost</th><td mat-cell *matCellDef="let r" class="mono">\${{ r.annualCost | number:'1.0-0' }}</td></ng-container>
              <tr mat-header-row *matHeaderRowDef="['name','usedLicenses','totalLicenses','utilization','annualCost']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['name','usedLicenses','totalLicenses','utilization','annualCost']"></tr>
            </table>
          </div>
        </mat-tab>

        <!-- Servers -->
        <mat-tab>
          <ng-template mat-tab-label><mat-icon>dns</mat-icon>&nbsp; Infrastructure</ng-template>
          <div class="tab-content">
            <div echarts [options]="serverChart()" style="height: 300px; margin-bottom: 16px;"></div>
            <table mat-table [dataSource]="servers()">
              <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Server</th><td mat-cell *matCellDef="let r" class="mono">{{ r.name }}</td></ng-container>
              <ng-container matColumnDef="type"><th mat-header-cell *matHeaderCellDef>Type</th><td mat-cell *matCellDef="let r">{{ r.type }}</td></ng-container>
              <ng-container matColumnDef="avgCpu"><th mat-header-cell *matHeaderCellDef>Avg CPU</th><td mat-cell *matCellDef="let r">
                <span class="mono" [class.text-red]="r.avgCpu < 10" [class.text-green]="r.avgCpu >= 30">{{ r.avgCpu }}%</span>
              </td></ng-container>
              <ng-container matColumnDef="avgMemory"><th mat-header-cell *matHeaderCellDef>Avg Memory</th><td mat-cell *matCellDef="let r" class="mono">{{ r.avgMemory }}%</td></ng-container>
              <ng-container matColumnDef="monthlyCost"><th mat-header-cell *matHeaderCellDef>Monthly Cost</th><td mat-cell *matCellDef="let r" class="mono">\${{ r.monthlyCost | number:'1.0-0' }}</td></ng-container>
              <tr mat-header-row *matHeaderRowDef="['name','type','avgCpu','avgMemory','monthlyCost']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['name','type','avgCpu','avgMemory','monthlyCost']"></tr>
            </table>
          </div>
        </mat-tab>

        <!-- Budget vs Actual -->
        <mat-tab>
          <ng-template mat-tab-label><mat-icon>account_balance</mat-icon>&nbsp; Budget</ng-template>
          <div class="tab-content">
            <div echarts [options]="budgetChart()" style="height: 300px; margin-bottom: 16px;"></div>
            <table mat-table [dataSource]="budgetData()">
              <ng-container matColumnDef="department"><th mat-header-cell *matHeaderCellDef>Department</th><td mat-cell *matCellDef="let r">{{ r.department }}</td></ng-container>
              <ng-container matColumnDef="category"><th mat-header-cell *matHeaderCellDef>Category</th><td mat-cell *matCellDef="let r">{{ r.category }}</td></ng-container>
              <ng-container matColumnDef="budgetedAmount"><th mat-header-cell *matHeaderCellDef>Budget</th><td mat-cell *matCellDef="let r" class="mono">\${{ r.budgetedAmount | number:'1.0-0' }}</td></ng-container>
              <ng-container matColumnDef="actualAmount"><th mat-header-cell *matHeaderCellDef>Actual</th><td mat-cell *matCellDef="let r" class="mono">\${{ r.actualAmount | number:'1.0-0' }}</td></ng-container>
              <ng-container matColumnDef="variance"><th mat-header-cell *matHeaderCellDef>Variance</th><td mat-cell *matCellDef="let r" class="mono" [class.text-red]="r.variance > 0" [class.text-green]="r.variance < 0">\${{ r.variance | number:'1.0-0' }}</td></ng-container>
              <tr mat-header-row *matHeaderRowDef="['department','category','budgetedAmount','actualAmount','variance']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['department','category','budgetedAmount','actualAmount','variance']"></tr>
            </table>
          </div>
        </mat-tab>

      </mat-tab-group>
    </mat-card>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .page-header h2 { margin-bottom: 2px; }
    .sub { color: var(--text-secondary); font-size: 0.88rem; margin: 0; }

    .stats-banner {
      display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px;
    }
    .stat-chip {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 16px;
      background: var(--bg-white); border: 1px solid var(--border);
      border-radius: 20px; box-shadow: var(--shadow-xs);
    }
    .stat-num { font-size: 1rem; font-weight: 700; color: var(--brand); }
    .stat-lbl { font-size: 0.75rem; color: var(--text-muted); }

    .tab-content { padding: 16px; }
    table { width: 100%; }
    .table-footer { text-align: center; padding: 12px; color: var(--text-muted); font-size: 0.75rem; }

    .cat-tag { font-family: var(--font-mono); font-size: 0.72rem; padding: 2px 8px; background: var(--bg-subtle); border-radius: 4px; color: var(--text-secondary); }
    .badge-green { font-family: var(--font-mono); font-size: 0.72rem; font-weight: 600; padding: 2px 10px; border-radius: 6px; background: var(--green-bg); color: var(--green); }
    .badge-amber { font-family: var(--font-mono); font-size: 0.72rem; font-weight: 600; padding: 2px 10px; border-radius: 6px; background: var(--amber-bg); color: var(--amber); }

    .util-bar { width: 60px; height: 6px; background: var(--border); border-radius: 3px; display: inline-block; vertical-align: middle; margin-right: 6px; }
    .util-fill { height: 100%; background: var(--green); border-radius: 3px; transition: width 0.3s; }
    .util-fill.low { background: var(--red); }
  `],
})
export class DataExplorerComponent implements OnInit {
  vendors = signal<any[]>([]);
  purchaseOrders = signal<any[]>([]);
  poTotal = signal(0);
  invoices = signal<any[]>([]);
  invTotal = signal(0);
  slaServices = signal<any[]>([]);
  servers = signal<any[]>([]);
  softwareTools = signal<any[]>([]);
  budgetData = signal<any[]>([]);
  statItems = signal<{ label: string; count: number }[]>([]);
  licenseChart = signal<EChartsOption>({});
  serverChart = signal<EChartsOption>({});
  budgetChart = signal<EChartsOption>({});

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getOperationalStats().subscribe(stats => {
      this.statItems.set([
        { label: 'Vendors', count: stats['vendors'] || 0 },
        { label: 'Purchase Orders', count: stats['purchase_orders'] || 0 },
        { label: 'Invoices', count: stats['invoices'] || 0 },
        { label: 'Services', count: stats['services'] || 0 },
        { label: 'Servers', count: stats['servers'] || 0 },
        { label: 'SLA Metrics', count: stats['sla_metrics'] || 0 },
        { label: 'Server Metrics', count: stats['server_metrics'] || 0 },
      ]);
    });
    this.loadVendors();
  }

  onTabChange(event: any) {
    const idx = event.index;
    if (idx === 0) this.loadVendors();
    if (idx === 1) this.loadPOs();
    if (idx === 2) this.loadInvoices();
    if (idx === 3) this.loadSLAServices();
    if (idx === 4) this.loadSoftwareTools();
    if (idx === 5) this.loadServers();
    if (idx === 6) this.loadBudget();
  }

  loadVendors() { this.api.getVendors().subscribe(r => this.vendors.set(r.items)); }
  loadPOs() { this.api.getPurchaseOrders(1, 30).subscribe(r => { this.purchaseOrders.set(r.items); this.poTotal.set(r.total); }); }
  loadInvoices() { this.api.getInvoices(1, 30).subscribe(r => { this.invoices.set(r.items); this.invTotal.set(r.total); }); }
  loadSLAServices() { this.api.getSLAServices().subscribe(r => this.slaServices.set(r.items)); }

  loadSoftwareTools() {
    this.api.getSoftwareTools().subscribe(r => {
      this.softwareTools.set(r.items);
      const top = r.items.slice(0, 15);
      this.licenseChart.set({
        tooltip: { trigger: 'axis' },
        grid: { left: 100, right: 20, top: 10, bottom: 30 },
        xAxis: { type: 'value', axisLabel: { color: '#9ca3af', fontSize: 10 }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
        yAxis: { type: 'category', data: top.map((t: any) => t.name), axisLabel: { color: '#6b7280', fontSize: 11 } },
        series: [
          { name: 'Used', type: 'bar', stack: 'lic', data: top.map((t: any) => t.usedLicenses), itemStyle: { color: '#6366f1', borderRadius: [0,0,0,0] } },
          { name: 'Unused', type: 'bar', stack: 'lic', data: top.map((t: any) => t.totalLicenses - t.usedLicenses), itemStyle: { color: '#fecaca', borderRadius: [0,4,4,0] } },
        ],
      });
    });
  }

  loadServers() {
    this.api.getServers().subscribe(r => {
      this.servers.set(r.items);
      const sorted = [...r.items].sort((a: any, b: any) => a.avgCpu - b.avgCpu).slice(0, 20);
      this.serverChart.set({
        tooltip: { trigger: 'axis', formatter: (p: any) => `${p[0]?.name}<br/>CPU: ${p[0]?.value}%<br/>Memory: ${p[1]?.value}%` },
        legend: { data: ['CPU %', 'Memory %'], bottom: 0, textStyle: { color: '#9ca3af', fontSize: 11 } },
        grid: { left: 100, right: 20, top: 10, bottom: 40 },
        xAxis: { type: 'value', max: 100, axisLabel: { color: '#9ca3af', fontSize: 10, formatter: '{value}%' }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
        yAxis: { type: 'category', data: sorted.map((s: any) => s.name), axisLabel: { color: '#6b7280', fontSize: 10, fontFamily: 'IBM Plex Mono' } },
        series: [
          { name: 'CPU %', type: 'bar', data: sorted.map((s: any) => ({ value: s.avgCpu, itemStyle: { color: s.avgCpu < 10 ? '#ef4444' : s.avgCpu < 30 ? '#f59e0b' : '#10b981' } })) },
          { name: 'Memory %', type: 'bar', data: sorted.map((s: any) => s.avgMemory), itemStyle: { color: '#93c5fd' } },
        ],
      });
    });
  }

  loadBudget() {
    this.api.getBudgetVsActual().subscribe(r => {
      this.budgetData.set(r.items);
      const depts = [...new Set(r.items.map((b: any) => b.department))].slice(0, 8);
      const budgeted = depts.map(d => r.items.filter((b: any) => b.department === d).reduce((s: number, b: any) => s + b.budgetedAmount, 0));
      const actual = depts.map(d => r.items.filter((b: any) => b.department === d).reduce((s: number, b: any) => s + b.actualAmount, 0));
      this.budgetChart.set({
        tooltip: { trigger: 'axis' },
        legend: { data: ['Budget', 'Actual'], bottom: 0, textStyle: { color: '#9ca3af' } },
        grid: { left: 70, right: 20, top: 10, bottom: 40 },
        xAxis: { type: 'category', data: depts, axisLabel: { color: '#6b7280', fontSize: 11, rotate: 20 }, axisLine: { lineStyle: { color: '#e5e7eb' } } },
        yAxis: { type: 'value', axisLabel: { color: '#9ca3af', fontSize: 10, fontFamily: 'IBM Plex Mono', formatter: (v: number) => '$' + (v >= 1000 ? (v/1000).toFixed(0) + 'K' : v) }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
        series: [
          { name: 'Budget', type: 'bar', data: budgeted, itemStyle: { color: '#6366f1', borderRadius: [4,4,0,0] } },
          { name: 'Actual', type: 'bar', data: actual, itemStyle: { color: '#f59e0b', borderRadius: [4,4,0,0] } },
        ],
      });
    });
  }
}
