import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'costpilot_token';
  isAuthenticated = signal(!!localStorage.getItem(this.tokenKey));
  userName = signal(localStorage.getItem('costpilot_user') ?? '');
  userRole = signal(localStorage.getItem('costpilot_role') ?? '');

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string) {
    return this.http.post<{ token: string; name: string; role: string }>('/api/auth/login', { email, password });
  }

  setSession(token: string, name: string, role: string) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem('costpilot_user', name);
    localStorage.setItem('costpilot_role', role);
    this.isAuthenticated.set(true);
    this.userName.set(name);
    this.userRole.set(role);
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem('costpilot_user');
    localStorage.removeItem('costpilot_role');
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }
}
