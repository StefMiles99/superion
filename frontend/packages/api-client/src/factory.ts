import { config } from "@superion/config";
import type { IApiClient, IStorage } from "@superion/domain";
import { HttpApiClient } from "./http";
import { InMemoryApiClient } from "./in_memory";
import { MockBackend } from "./mock/backend";

/** Devuelve el adaptador REST según VITE_API_MODE (mock por defecto). */
export function createApiClient(storage: IStorage): IApiClient {
  if (config.apiMode === "http") {
    return new HttpApiClient(config.apiBaseUrl, storage);
  }
  return new InMemoryApiClient(MockBackend.shared());
}
