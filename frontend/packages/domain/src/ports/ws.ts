import type { WsEvent } from "../events";

export type WsStatus = "connecting" | "open" | "reconnecting" | "closed";

export interface WsSubscription {
  close(): void;
}

export interface WsHandlers {
  onEvent: (event: WsEvent) => void;
  onStatus?: (status: WsStatus) => void;
}

/** Puerto de streaming de eventos de sesión. Impls: RealWsClient, InMemoryWsClient. */
export interface IWsClient {
  subscribe(sessionId: string, lastSeq: number, handlers: WsHandlers): WsSubscription;
}
