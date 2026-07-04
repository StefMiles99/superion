import type {
  IWsClient,
  WsConnectionState,
  WsConnectionStateHandler,
  WsEvent,
  WsEventHandler,
} from '@superion/domain';

import { matchesEventPattern } from './event_pattern';
import { readLastSeq, writeLastSeq } from './last_seq_storage';
import type { CatchUpEventItem, CatchUpResponse } from './types';

interface Subscription {
  pattern: string;
  handler: WsEventHandler;
}

const BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000] as const;
const PING_INTERVAL_MS = 25_000;
const DISCONNECTED_RETRY_CTA_MS = 30_000;

function wsBaseToHttp(baseUrl: string): string {
  if (baseUrl.startsWith('wss://')) {
    return `https://${baseUrl.slice('wss://'.length)}`;
  }
  if (baseUrl.startsWith('ws://')) {
    return `http://${baseUrl.slice('ws://'.length)}`;
  }
  return baseUrl;
}

function jitterDelay(baseMs: number): number {
  const jitter = Math.floor(Math.random() * 250);
  return baseMs + jitter;
}

export class RealWsClient implements IWsClient {
  private subscriptions: Subscription[] = [];
  private stateHandlers = new Set<WsConnectionStateHandler>();
  private connectionState: WsConnectionState = 'closed';
  private socket: WebSocket | null = null;
  private sessionId: string | null = null;
  private adminPlantId: string | null = null;
  private token: string | null = null;
  private lastSeq = 0;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private disconnectedAt: number | null = null;
  private intentionalClose = false;
  private readonly httpBaseUrl: string;

  constructor(
    private readonly wsBaseUrl: string,
    apiBaseUrl?: string,
  ) {
    this.httpBaseUrl = apiBaseUrl ?? wsBaseToHttp(wsBaseUrl);
  }

  async connect(sessionId: string, token: string, lastSeq = readLastSeq(sessionId)): Promise<void> {
    this.sessionId = sessionId;
    this.adminPlantId = null;
    this.token = token;
    this.lastSeq = lastSeq;
    this.intentionalClose = false;
    this.clearReconnectTimer();
    await this.openSocket();
  }

  async connectAdmin(plantId: string, token: string, lastSeq = 0): Promise<void> {
    this.adminPlantId = plantId;
    this.sessionId = null;
    this.token = token;
    this.lastSeq = lastSeq;
    this.intentionalClose = false;
    this.clearReconnectTimer();
    this.setConnectionState('connecting');
    this.setConnectionState('open');
  }

  subscribe(eventPattern: string, handler: WsEventHandler): () => void {
    const subscription: Subscription = { pattern: eventPattern, handler };
    this.subscriptions.push(subscription);

    return () => {
      this.subscriptions = this.subscriptions.filter((item) => item !== subscription);
    };
  }

  onConnectionStateChange(handler: WsConnectionStateHandler): () => void {
    this.stateHandlers.add(handler);
    handler(this.connectionState);

    return () => {
      this.stateHandlers.delete(handler);
    };
  }

  getConnectionState(): WsConnectionState {
    return this.connectionState;
  }

  getDisconnectedDurationMs(): number {
    if (this.connectionState === 'open' || this.disconnectedAt === null) {
      return 0;
    }
    return Date.now() - this.disconnectedAt;
  }

  shouldShowRetryCta(): boolean {
    return this.getDisconnectedDurationMs() >= DISCONNECTED_RETRY_CTA_MS;
  }

  async disconnect(): Promise<void> {
    this.intentionalClose = true;
    this.clearReconnectTimer();
    this.clearPingTimer();
    this.closeSocket(1000);
    this.setConnectionState('closed');
  }

  async reconnect(): Promise<void> {
    if (!this.token) {
      return;
    }

    if (this.adminPlantId) {
      await this.connectAdmin(this.adminPlantId, this.token, this.lastSeq);
      return;
    }

    if (!this.sessionId) {
      return;
    }

    this.reconnectAttempt = 0;
    this.disconnectedAt = null;
    this.clearReconnectTimer();
    await this.connect(this.sessionId, this.token, this.lastSeq);
  }

  private async openSocket(): Promise<void> {
    if (!this.sessionId || !this.token) {
      return;
    }

    this.setConnectionState(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');

    await this.catchUpMissedEvents();

    const url = `${this.wsBaseUrl}/v1/ws/sessions/${this.sessionId}?token=${encodeURIComponent(this.token)}&last_seq=${String(this.lastSeq)}`;
    this.closeSocket();
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.reconnectAttempt = 0;
      this.disconnectedAt = null;
      this.setConnectionState('open');
      this.sendSubscribeMessage();
      this.startPingTimer();
    };

    this.socket.onmessage = (messageEvent) => {
      this.handleMessage(String(messageEvent.data));
    };

    this.socket.onclose = () => {
      this.clearPingTimer();
      if (this.intentionalClose) {
        this.setConnectionState('closed');
        return;
      }
      this.scheduleReconnect();
    };

    this.socket.onerror = () => {
      if (this.connectionState !== 'closed') {
        this.setConnectionState('reconnecting');
      }
    };
  }

  private sendSubscribeMessage(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.sessionId) {
      return;
    }

    this.socket.send(
      JSON.stringify({
        type: 'subscribe',
        channels: [`session:${this.sessionId}`],
        last_seq: this.lastSeq,
      }),
    );
  }

  private handleMessage(raw: string): void {
    let parsed: WsEvent;
    try {
      parsed = JSON.parse(raw) as WsEvent;
    } catch {
      return;
    }

    if (parsed.type === 'pong') {
      return;
    }

    this.trackSeq(parsed);
    this.dispatchEvent(parsed);
  }

  private dispatchEvent(event: WsEvent): void {
    for (const subscription of this.subscriptions) {
      if (matchesEventPattern(event.type, subscription.pattern)) {
        subscription.handler(event);
      }
    }
  }

  private trackSeq(event: WsEvent): void {
    if (typeof event.seq !== 'number' || !this.sessionId) {
      return;
    }

    this.lastSeq = Math.max(this.lastSeq, event.seq);
    writeLastSeq(this.sessionId, this.lastSeq);
  }

  private async catchUpMissedEvents(): Promise<void> {
    if (!this.sessionId || !this.token || this.lastSeq <= 0) {
      return;
    }

    const response = await fetch(
      `${this.httpBaseUrl}/v1/sessions/${this.sessionId}/events?since_seq=${String(this.lastSeq)}&limit=500`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      },
    );

    if (!response.ok) {
      return;
    }

    const body = (await response.json()) as CatchUpResponse;
    for (const item of body.items) {
      const event = catchUpItemToWsEvent(item);
      this.trackSeq(event);
      this.dispatchEvent(event);
    }
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose || !this.sessionId || !this.token) {
      return;
    }

    if (this.disconnectedAt === null) {
      this.disconnectedAt = Date.now();
    }

    this.setConnectionState('reconnecting');
    const delay = BACKOFF_MS[Math.min(this.reconnectAttempt, BACKOFF_MS.length - 1)] ?? 30_000;
    this.reconnectAttempt += 1;

    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      void this.openSocket();
    }, jitterDelay(delay));
  }

  private startPingTimer(): void {
    this.clearPingTimer();
    this.pingTimer = setInterval(() => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        return;
      }
      this.socket.send(JSON.stringify({ type: 'ping' }));
    }, PING_INTERVAL_MS);
  }

  private clearPingTimer(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private closeSocket(code = 1000): void {
    if (!this.socket) {
      return;
    }

    if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
      this.socket.close(code);
    }
    this.socket = null;
  }

  private setConnectionState(state: WsConnectionState): void {
    this.connectionState = state;
    for (const handler of this.stateHandlers) {
      handler(state);
    }
  }
}

function catchUpItemToWsEvent(item: CatchUpEventItem): WsEvent {
  return {
    seq: item.seq,
    type: item.type,
    session_id: item.session_id,
    created_at: item.created_at,
    payload: item.payload,
  };
}

export { DISCONNECTED_RETRY_CTA_MS };
