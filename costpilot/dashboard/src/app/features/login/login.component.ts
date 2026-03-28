import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  template: `
    <div class="login-page">
      <div class="login-left">
        <div class="left-content">
          <div class="brand-badge">
            <svg viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="7" fill="#6366f1"/>
              <path d="M8 14 L14 8 L20 14 L14 20Z" stroke="white" stroke-width="1.5" fill="rgba(255,255,255,0.15)"/>
              <circle cx="14" cy="14" r="2" fill="white"/>
            </svg>
          </div>
          <h1>Welcome to CostPilot</h1>
          <p class="desc">Sign in to access your enterprise cost intelligence dashboard. Monitor agents, approve actions, and track financial impact in real-time.</p>
          <div class="features">
            <div class="feature"><mat-icon>auto_awesome</mat-icon><span>4 AI agents monitoring costs 24/7</span></div>
            <div class="feature"><mat-icon>speed</mat-icon><span>Real-time anomaly detection</span></div>
            <div class="feature"><mat-icon>savings</mat-icon><span>Quantifiable financial impact tracking</span></div>
          </div>
        </div>
      </div>

      <div class="login-right">
        <div class="form-container">
          <h2>Sign in</h2>
          <p class="subtitle">Enter your credentials to continue</p>

          <div class="field">
            <label>Email address</label>
            <input type="email" [(ngModel)]="email" (keyup.enter)="login()" placeholder="admin&#64;costpilot.com" />
          </div>
          <div class="field">
            <label>Password</label>
            <input type="password" [(ngModel)]="password" (keyup.enter)="login()" placeholder="Enter your password" />
          </div>

          @if (error()) {
            <div class="error-box">
              <mat-icon>warning</mat-icon>
              {{ error() }}
            </div>
          }

          <button class="sign-in-btn" (click)="login()" [disabled]="loading()">
            @if (loading()) {
              <span class="spinner"></span> Signing in...
            } @else {
              Sign in
              <mat-icon>east</mat-icon>
            }
          </button>

          <div class="demo-hint">
            <mat-icon>info</mat-icon>
            <span>Demo: <code>admin&#64;costpilot.com</code> / <code>admin123</code></span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      display: flex; height: 100vh;
    }

    .login-left {
      flex: 1;
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #3730a3 100%);
      display: flex; align-items: center; justify-content: center;
      padding: 60px;
      position: relative;
      overflow: hidden;
    }
    .login-left::before {
      content: '';
      position: absolute; inset: 0;
      background-image:
        radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08) 0%, transparent 50%),
        radial-gradient(circle at 70% 80%, rgba(255,255,255,0.05) 0%, transparent 40%);
    }
    .login-left::after {
      content: '';
      position: absolute; inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
      background-size: 40px 40px;
      mask-image: radial-gradient(ellipse at center, black 20%, transparent 70%);
    }

    .left-content {
      position: relative; z-index: 1;
      max-width: 440px; color: white;
    }
    .brand-badge {
      width: 48px; height: 48px;
      background: rgba(255,255,255,0.15);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      padding: 8px;
      margin-bottom: 28px;
      backdrop-filter: blur(8px);
    }
    .brand-badge svg { width: 100%; height: 100%; }
    .left-content h1 {
      font-size: 2.2rem; font-weight: 700;
      letter-spacing: -0.03em; line-height: 1.2;
      margin-bottom: 16px;
    }
    .desc {
      font-size: 1rem; line-height: 1.6;
      color: rgba(255,255,255,0.75);
      margin-bottom: 36px;
    }
    .features { display: flex; flex-direction: column; gap: 14px; }
    .feature {
      display: flex; align-items: center; gap: 12px;
      font-size: 0.9rem; color: rgba(255,255,255,0.85);
    }
    .feature mat-icon {
      font-size: 20px; width: 20px; height: 20px;
      color: rgba(255,255,255,0.6);
    }

    .login-right {
      width: 520px; min-width: 520px;
      display: flex; align-items: center; justify-content: center;
      background: var(--bg-white);
      padding: 60px;
    }

    .form-container { width: 100%; max-width: 380px; }
    .form-container h2 {
      font-size: 1.5rem; font-weight: 700;
      margin-bottom: 6px;
    }
    .subtitle {
      color: var(--text-secondary); font-size: 0.9rem;
      margin: 0 0 32px;
    }

    .field {
      display: flex; flex-direction: column; gap: 6px;
      margin-bottom: 20px;
    }
    .field label {
      font-size: 0.82rem; font-weight: 600;
      color: var(--text-primary);
    }
    .field input {
      width: 100%; padding: 12px 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      font-family: var(--font-sans);
      font-size: 0.9rem;
      color: var(--text-primary);
      background: var(--bg-white);
      outline: none;
      transition: all 0.2s;
    }
    .field input::placeholder { color: var(--text-muted); }
    .field input:focus {
      border-color: var(--brand);
      box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
    }

    .error-box {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px;
      background: var(--red-bg);
      border: 1px solid var(--red-border);
      border-radius: var(--radius-md);
      color: var(--red);
      font-size: 0.85rem;
      margin-bottom: 20px;
    }
    .error-box mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .sign-in-btn {
      width: 100%;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 13px;
      border: none; border-radius: var(--radius-md);
      background: var(--brand);
      color: white;
      font-family: var(--font-sans);
      font-size: 0.9rem; font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .sign-in-btn:hover:not(:disabled) { background: var(--brand-dark); box-shadow: 0 4px 12px rgba(99,102,241,0.3); }
    .sign-in-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .sign-in-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .demo-hint {
      display: flex; align-items: center; gap: 8px;
      margin-top: 24px;
      padding: 12px 14px;
      background: var(--bg-subtle);
      border-radius: var(--radius-md);
      font-size: 0.8rem; color: var(--text-secondary);
    }
    .demo-hint mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--brand); }
    .demo-hint code {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      background: var(--bg-white);
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid var(--border);
    }
  `],
})
export class LoginComponent {
  email = 'admin@costpilot.com';
  password = 'admin123';
  error = signal('');
  loading = signal(false);

  constructor(private auth: AuthService, private router: Router) {}

  login() {
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: res => { this.auth.setSession(res.token, res.name, res.role); this.router.navigate(['/']); },
      error: () => { this.error.set('Invalid credentials'); this.loading.set(false); },
    });
  }
}
