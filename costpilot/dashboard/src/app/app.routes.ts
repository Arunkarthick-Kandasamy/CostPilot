import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    loadComponent: () => import('./features/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./features/executive-dashboard/executive-dashboard.component').then(m => m.ExecutiveDashboardComponent) },
      { path: 'proposals', loadComponent: () => import('./features/proposals/proposals-list.component').then(m => m.ProposalsListComponent) },
      { path: 'proposals/:id', loadComponent: () => import('./features/proposals/proposal-detail.component').then(m => m.ProposalDetailComponent) },
      { path: 'agents/:type', loadComponent: () => import('./features/agents/agent-view.component').then(m => m.AgentViewComponent) },
      { path: 'impact', loadComponent: () => import('./features/impact/impact-tracking.component').then(m => m.ImpactTrackingComponent) },
      { path: 'data-explorer', loadComponent: () => import('./features/data-explorer/data-explorer.component').then(m => m.DataExplorerComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
