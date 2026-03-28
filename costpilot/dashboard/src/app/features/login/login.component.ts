import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>insights</mat-icon>
          <mat-card-title>CostPilot</mat-card-title>
          <mat-card-subtitle>Enterprise Cost Intelligence</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Email</mat-label>
            <input matInput [(ngModel)]="email" type="email">
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Password</mat-label>
            <input matInput [(ngModel)]="password" type="password" (keyup.enter)="login()">
          </mat-form-field>
          @if (error()) { <p class="error">{{ error() }}</p> }
        </mat-card-content>
        <mat-card-actions>
          <button mat-raised-button color="primary" (click)="login()" class="full-width">Login</button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container { display: flex; justify-content: center; align-items: center; height: 100vh; background: #1a1a2e; }
    .login-card { width: 400px; padding: 24px; }
    .full-width { width: 100%; }
    .error { color: red; text-align: center; }
  `],
})
export class LoginComponent {
  email = 'admin@costpilot.com';
  password = 'admin123';
  error = signal('');

  constructor(private auth: AuthService, private router: Router) {}

  login() {
    this.auth.login(this.email, this.password).subscribe({
      next: res => { this.auth.setSession(res.token, res.name, res.role); this.router.navigate(['/']); },
      error: () => this.error.set('Invalid credentials'),
    });
  }
}
