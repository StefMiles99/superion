import type { IWsClient, WsEventHandler } from '@superion/domain';

import { NotImplementedError } from './errors';

export class RealWsClient implements IWsClient {
  constructor(private readonly baseUrl: string) {}

  async connect(): Promise<void> {
    throw new NotImplementedError(
      `RealWsClient.connect no implementado (${this.baseUrl})`,
    );
  }

  subscribe(_handler: WsEventHandler): () => void {
    throw new NotImplementedError(
      `RealWsClient.subscribe no implementado (${this.baseUrl})`,
    );
  }

  async disconnect(): Promise<void> {
    throw new NotImplementedError(
      `RealWsClient.disconnect no implementado (${this.baseUrl})`,
    );
  }
}
