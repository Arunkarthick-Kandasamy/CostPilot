import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { AuthService } from '../../core/services/auth.service';
import { SignalRService } from '../../core/services/signalr.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatToolbarModule, MatListModule, MatIconModule, MatButtonModule, MatBadgeModule],
  template: `
    <mat-sidenav-container class="shell">
      <mat-sidenav mode="side" opened class="sidenav">
        <div class="logo">
          <mat-icon>insights</mat-icon>
          <span>CostPilot</span>
        </div>
        <mat-nav-list>
          <a mat-list-item routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>Dashboard</span>
          </a>
          <a mat-list-item routerLink="/proposals" routerLinkActive="active">
            <mat-icon matListItemIcon>assignment</mat-icon>
            <span matListItemTitle>Proposals</span>
          </a>
          <a mat-list-item routerLink="/agents/spend" routerLinkActive="active">
            <mat-icon matListItemIcon>attach_money</mat-icon>
            <span matListItemTitle>Spend Agent</span>
          </a>
          <a mat-list-item routerLink="/agents/sla" routerLinkActive="active">
            <mat-icon matListItemIcon>warning</mat-icon>
            <span matListItemTitle>SLA Agent</span>
          </a>
          <a mat-list-item routerLink="/agents/resource" routerLinkActive="active">
            <mat-icon matListItemIcon>memory</mat-icon>
            <span matListItemTitle>Resource Agent</span>
          </a>
          <a mat-list-item routerLink="/agents/finops" routerLinkActive="active">
            <mat-icon matListItemIcon>account_balance</mat-icon>
            <span matListItemTitle>FinOps Agent</span>
          </a>
          <a mat-list-item routerLink="/impact" routerLinkActive="active">
            <mat-icon matListItemIcon>trending_up</mat-icon>
            <span matListItemTitle>Impact</span>
          </a>
          <a mat-list-item routerLink="/data-explorer" routerLinkActive="active">
            <mat-icon matListItemIcon>storage</mat-icon>
            <span matListItemTitle>Data Explorer</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content>
        <mat-toolbar color="primary">
          <span>{{ auth.userName() }}</span>
          <span class="spacer"></span>
          <span class="role-badge">{{ auth.userRole() }}</span>
          <button mat-icon-button (click)="auth.logout()"><mat-icon>logout</mat-icon></button>
        </mat-toolbar>
        <main class="content"><router-outlet /></main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .shell { height: 100vh; }
    .sidenav { width: 240px; background: #1a1a2e; }
    .logo { display: flex; align-items: center; gap: 12px; padding: 20px 16px; color: #00d4ff; font-size: 20px; font-weight: 600; }
    .logo mat-icon { font-size: 28px; width: 28px; height: 28px; }
    mat-nav-list a { color: #ccc; }
    mat-nav-list a.active { color: #00d4ff; background: rgba(0,212,255,0.1); }
    .content { padding: 24px; background: #f5f5f5; min-height: calc(100vh - 64px); }
    .spacer { flex: 1; }
    .role-badge { background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 12px; font-size: 12px; margin-right: 12px; }
  `],
})
export class ShellComponent {
  constructor(public auth: AuthService, private signalR: SignalRService) {
    this.signalR.start();
  }
}
