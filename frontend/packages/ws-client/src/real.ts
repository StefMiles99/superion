import { createTokenStore, type TokenStore } from "@superion/api-client";
import type {
  IStorage,
  IWsClient,
  WsEvent,
  WsHandlers,
  WsSubscription,
} from "@superion/domain";

const MAX_BACKOFF_MS = 15_000;
const PING_INTERVAL_MS = 25_000;

/** WS real contra el backend, con reconexión exponencial y heartbeat. */
export class RealWsClient implements IWsClient {
  private tokens: TokenStore;

  constructor(
    private readonly wsBaseUrl: string,
    storage: IStorage,
  ) {
    this.tokens = createTokenStore(storage);
  }

  subscribe(sessionId: string, lastSeq: number, handlers: WsHandlers): WsSubscription {
    let socket: WebSocket | null = null;
    let closed = false;
    let attempt = 0;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let seq = lastSeq;

    const clearTimers = () => {
      if (pingTimer) clearInterval(pingTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      pingTimer = null;
      reconnectTimer = null;
    };

    const connect = () => {
      if (closed) return;
      handlers.onStatus?.(attempt === 0 ? "connecting" : "reconnecting");
      const token = this.tokens.getAccess() ?? "";
      const url = `${this.wsBaseUrl}/v1/ws/sessions/${sessionId}?token=${encodeURIComponent(
        token,
      )}&last_seq=${seq}`;
      socket = new WebSocket(url);

      socket.onopen = () => {
        attempt = 0;
        handlers.onStatus?.("open");
        pingTimer = setInterval(() => {
          try {
            socket?.send(JSON.stringify({ type: "ping" }));
          } catch {
            // socket cerrándose
          }
        }, PING_INTERVAL_MS);
      };

      socket.onmessage = (msg) => {
        let event: WsEvent;
        try {
          event = JSON.parse(msg.data as string) as WsEvent;
        } catch {
          return;
        }
        if (event.type === "pong") return;
        if (typeof event.seq === "number") seq = Math.max(seq, event.seq);
        handlers.onEvent(event);
      };

      socket.onclose = () => {
        clearTimers();
        if (closed) return;
        attempt += 1;
        const backoff = Math.min(1000 * 2 ** (attempt - 1), MAX_BACKOFF_MS);
        handlers.onStatus?.("reconnecting");
        reconnectTimer = setTimeout(connect, backoff);
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return {
      close: () => {
        closed = true;
        clearTimers();
        socket?.close();
        handlers.onStatus?.("closed");
      },
    };
  }
}
