import { MockBackend } from "@superion/api-client";
import type { IWsClient, WsHandlers, WsSubscription } from "@superion/domain";

/** WS in-memory: se suscribe al bus del MockBackend (replay incluido). */
export class InMemoryWsClient implements IWsClient {
  constructor(private readonly backend: MockBackend = MockBackend.shared()) {}

  subscribe(sessionId: string, lastSeq: number, handlers: WsHandlers): WsSubscription {
    handlers.onStatus?.("connecting");
    const unsub = this.backend.subscribe(sessionId, lastSeq, handlers.onEvent);
    handlers.onStatus?.("open");
    return {
      close: () => {
        unsub();
        handlers.onStatus?.("closed");
      },
    };
  }
}
