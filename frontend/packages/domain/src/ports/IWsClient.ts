export interface WsEvent {
  type: string;
  payload: unknown;
}

export type WsEventHandler = (event: WsEvent) => void;

export interface IWsClient {
  connect(): Promise<void>;
  subscribe(handler: WsEventHandler): () => void;
  disconnect(): Promise<void>;
  emit?(event: WsEvent): void;
  reset?(): void;
}
