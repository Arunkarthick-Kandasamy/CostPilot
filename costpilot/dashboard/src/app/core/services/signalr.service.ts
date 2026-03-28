import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private connection?: signalR.HubConnection;
  newProposal$ = new Subject<any>();
  newAlert$ = new Subject<any>();
  correlatedFinding$ = new Subject<any>();
  proposalExecuted$ = new Subject<any>();

  constructor(private auth: AuthService) {}

  async start() {
    const token = this.auth.getToken();
    if (!token) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/notifications', { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build();

    this.connection.on('NewProposal', data => this.newProposal$.next(data));
    this.connection.on('NewAlert', data => this.newAlert$.next(data));
    this.connection.on('CorrelatedFinding', data => this.correlatedFinding$.next(data));
    this.connection.on('ProposalExecuted', data => this.proposalExecuted$.next(data));

    try { await this.connection.start(); } catch (err) { console.error('SignalR error:', err); }
  }

  async stop() {
    await this.connection?.stop();
  }
}
