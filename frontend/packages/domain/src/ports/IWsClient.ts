export type WsConnectionState = 'connecting' | 'open' | 'reconnecting' | 'closed';

export interface WsEvent {
  seq?: number;
  type: string;
  session_id?: string;
  created_at?: string;
  payload: unknown;
}

export type WsEventHandler = (event: WsEvent) => void;
export type WsConnectionStateHandler = (state: WsConnectionState) => void;

export interface IWsClient {
  connect(sessionId: string, token: string, lastSeq?: number): Promise<void>;
  connectAdmin?(plantId: string, token: string, lastSeq?: number): Promise<void>;
  subscribe(eventPattern: string, handler: WsEventHandler): () => void;
  onConnectionStateChange?(handler: WsConnectionStateHandler): () => void;
  getConnectionState?(): WsConnectionState;
  disconnect(): Promise<void>;
  reconnect?(): Promise<void>;
  emit?(event: WsEvent): void;
  reset?(): void;
}
