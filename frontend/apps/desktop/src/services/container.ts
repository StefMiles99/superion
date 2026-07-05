import { createApiClient, createTokenStore, type TokenStore } from "@superion/api-client";
import { BrowserStorage } from "@superion/auth";
import type { IApiClient, IStorage } from "@superion/domain";

/** Contenedor de dependencias del dashboard (composición raíz). */
export interface Services {
  storage: IStorage;
  api: IApiClient;
  tokens: TokenStore;
}

export function createServices(storage: IStorage = new BrowserStorage()): Services {
  return {
    storage,
    api: createApiClient(storage),
    tokens: createTokenStore(storage),
  };
}
