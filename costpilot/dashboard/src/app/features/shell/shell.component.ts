import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { SignalRService } from '../../core/services/signalr.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <div class="layout">
      <aside class="sidebar">
        <div class="brand">
          <svg viewBox="0 0 28 28" fill="none" class="brand-icon">
            <rect width="28" height="28" rx="7" fill="#6366f1"/>
            <path d="M8 14 L14 8 L20 14 L14 20Z" stroke="white" stroke-width="1.5" fill="rgba(255,255,255,0.15)"/>
            <circle cx="14" cy="14" r="2" fill="white"/>
          </svg>
          <div>
            <div class="brand-name">CostPilot</div>
            <div class="brand-sub">INTELLIGENCE</div>
          </div>
        </div>

        <div class="nav-group">
          <div class="nav-label">Analytics</div>
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link">
            <mat-icon>space_dashboard</mat-icon>Dashboard
          </a>
          <a routerLink="/proposals" routerLinkActive="active" class="nav-link">
            <mat-icon>task_alt</mat-icon>Proposals
          </a>
          <a routerLink="/impact" routerLinkActive="active" class="nav-link">
            <mat-icon>trending_up</mat-icon>Impact
          </a>
        </div>

        <div class="nav-group">
          <div class="nav-label">AI Agents</div>
          <a routerLink="/agents/spend" routerLinkActive="active" class="nav-link">
            <span class="dot" style="background:#10b981"></span>Spend Intelligence
          </a>
          <a routerLink="/agents/sla" routerLinkActive="active" class="nav-link">
            <span class="dot" style="background:#ef4444"></span>SLA Prevention
          </a>
          <a routerLink="/agents/resource" routerLinkActive="active" class="nav-link">
            <span class="dot" style="background:#3b82f6"></span>Resource Optim.
          </a>
          <a routerLink="/agents/finops" routerLinkActive="active" class="nav-link">
            <span class="dot" style="background:#f59e0b"></span>FinOps
          </a>
        </div>

        <div class="nav-group">
          <div class="nav-label">System</div>
          <a routerLink="/data-explorer" routerLinkActive="active" class="nav-link">
            <mat-icon>explore</mat-icon>Data Explorer
          </a>
        </div>

        <div class="sidebar-foot">
          <div class="user-row">
            <div class="avatar">{{ auth.userName().charAt(0) }}</div>
            <div class="user-meta">
              <span class="uname">{{ auth.userName() }}</span>
              <span class="urole">{{ auth.userRole() }}</span>
            </div>
            <button class="icon-btn" (click)="auth.logout()" title="Sign out">
              <mat-icon>logout</mat-icon>
            </button>
          </div>
        </div>
      </aside>

      <main class="content-area">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .layout { display: flex; height: 100vh; }

    .sidebar {
      width: 250px; min-width: 250px;
      background: var(--bg-sidebar);
      display: flex; flex-direction: column;
      overflow-y: auto;
    }

    .brand {
      display: flex; align-items: center; gap: 11px;
      padding: 22px 18px 18px;
    }
    .brand-icon { width: 32px; height: 32px; flex-shrink: 0; }
    .brand-name { color: #fff; font-weight: 700; font-size: 1.05rem; letter-spacing: -0.01em; }
    .brand-sub { font-family: var(--font-mono); font-size: 0.55rem; color: rgba(99,102,241,0.8); letter-spacing: 0.22em; font-weight: 600; }

    .nav-group { padding: 14px 10px 4px; }
    .nav-label {
      font-family: var(--font-mono); font-size: 0.6rem; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.14em;
      color: rgba(148,163,184,0.5); padding: 0 8px; margin-bottom: 4px;
    }

    .nav-link {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 12px; border-radius: 8px;
      color: var(--text-sidebar); text-decoration: none;
      font-size: 0.84rem; font-weight: 500;
      transition: all 0.15s;
    }
    .nav-link mat-icon { font-size: 18px; width: 18px; height: 18px; opacity: 0.5; }
    .nav-link:hover { background: var(--bg-sidebar-hover); color: #e2e8f0; }
    .nav-link:hover mat-icon { opacity: 0.8; }
    .nav-link.active {
      background: var(--bg-sidebar-active); color: var(--text-sidebar-active);
    }
    .nav-link.active mat-icon { opacity: 1; color: #a5b4fc; }

    .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

    .sidebar-foot {
      margin-top: auto; padding: 14px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    .user-row { display: flex; align-items: center; gap: 10px; }
    .avatar {
      width: 32px; height: 32px; border-radius: 8px;
      background: linear-gradient(135deg, #6366f1, #818cf8);
      display: flex; align-items: center; justify-content: center;
      color: white; font-weight: 700; font-size: 0.8rem; flex-shrink: 0;
    }
    .user-meta { flex: 1; min-width: 0; }
    .uname { display: block; font-size: 0.8rem; color: #e2e8f0; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .urole { font-family: var(--font-mono); font-size: 0.6rem; color: var(--text-sidebar); text-transform: uppercase; letter-spacing: 0.05em; }

    .icon-btn {
      background: none; border: none; color: var(--text-sidebar);
      cursor: pointer; padding: 4px; border-radius: 6px;
      transition: all 0.15s;
    }
    .icon-btn:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
    .icon-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .content-area {
      flex: 1; overflow-y: auto;
      padding: 28px 32px;
      background: var(--bg-page);
    }
  `],
})
export class ShellComponent {
  constructor(public auth: AuthService, private signalR: SignalRService) {
    this.signalR.start();
  }
}
