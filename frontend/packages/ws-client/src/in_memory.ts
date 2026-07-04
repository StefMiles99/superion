import type {
  IWsClient,
  WsConnectionState,
  WsConnectionStateHandler,
  WsEvent,
  WsEventHandler,
} from '@superion/domain';

import { matchesEventPattern } from './event_pattern';
import { readLastSeq, writeLastSeq } from './last_seq_storage';

interface Subscription {
  pattern: string;
  handler: WsEventHandler;
}

export class InMemoryWsClient implements IWsClient {
  private subscriptions: Subscription[] = [];
  private stateHandlers = new Set<WsConnectionStateHandler>();
  private connectionState: WsConnectionState = 'closed';
  private sessionId: string | null = null;
  private adminPlantId: string | null = null;
  private token: string | null = null;
  private lastSeq = 0;

  async connect(sessionId: string, token: string, lastSeq = readLastSeq(sessionId)): Promise<void> {
    this.sessionId = sessionId;
    this.adminPlantId = null;
    this.token = token;
    this.lastSeq = lastSeq;
    this.setConnectionState('connecting');
    this.setConnectionState('open');
  }

  async connectAdmin(plantId: string, token: string, lastSeq = 0): Promise<void> {
    this.adminPlantId = plantId;
    this.sessionId = null;
    this.token = token;
    this.lastSeq = lastSeq;
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

  async disconnect(): Promise<void> {
    this.setConnectionState('reconnecting');
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

    await this.connect(this.sessionId, this.token, this.lastSeq);
  }

  emit(event: WsEvent): void {
    if (this.connectionState !== 'open') {
      return;
    }

    if (typeof event.seq === 'number' && this.sessionId) {
      this.lastSeq = Math.max(this.lastSeq, event.seq);
      writeLastSeq(this.sessionId, this.lastSeq);
    }

    for (const subscription of this.subscriptions) {
      if (matchesEventPattern(event.type, subscription.pattern)) {
        subscription.handler(event);
      }
    }
  }

  reset(): void {
    this.subscriptions = [];
    this.stateHandlers.clear();
    this.sessionId = null;
    this.adminPlantId = null;
    this.token = null;
    this.lastSeq = 0;
    this.connectionState = 'closed';
  }

  private setConnectionState(state: WsConnectionState): void {
    this.connectionState = state;
    for (const handler of this.stateHandlers) {
      handler(state);
    }
  }
}
