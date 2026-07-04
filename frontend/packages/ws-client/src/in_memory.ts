import type { IWsClient, WsEvent, WsEventHandler } from '@superion/domain';

export class InMemoryWsClient implements IWsClient {
  private handlers = new Set<WsEventHandler>();
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  subscribe(handler: WsEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.handlers.clear();
  }

  emit(event: WsEvent): void {
    if (!this.connected) {
      return;
    }
    for (const handler of this.handlers) {
      handler(event);
    }
  }

  reset(): void {
    this.handlers.clear();
    this.connected = false;
  }
}
