import { createApiClient, createTokenStore, type TokenStore } from "@superion/api-client";
import { BrowserStorage } from "@superion/auth";
import type { IApiClient, IStorage, IVoiceClient, IWsClient } from "@superion/domain";
import { createVoiceClient } from "@superion/voice";
import { createWsClient } from "@superion/ws-client";

/** Contenedor de dependencias (infraestructura) inyectable en toda la app. */
export interface Services {
  storage: IStorage;
  api: IApiClient;
  ws: IWsClient;
  voice: IVoiceClient;
  tokens: TokenStore;
}

/**
 * Construye los servicios usando las factories, que eligen adaptador real o
 * in-memory según VITE_*_MODE. En tests se puede pasar un storage propio.
 */
export function createServices(storage: IStorage = new BrowserStorage()): Services {
  return {
    storage,
    api: createApiClient(storage),
    ws: createWsClient(storage),
    voice: createVoiceClient(),
    tokens: createTokenStore(storage),
  };
}
