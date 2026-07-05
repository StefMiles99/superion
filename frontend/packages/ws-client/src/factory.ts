import { MockBackend } from "@superion/api-client";
import { config } from "@superion/config";
import type { IStorage, IWsClient } from "@superion/domain";
import { InMemoryWsClient } from "./in_memory";
import { RealWsClient } from "./real";

/** Devuelve el cliente WS según VITE_WS_MODE (mock por defecto). */
export function createWsClient(storage: IStorage): IWsClient {
  if (config.wsMode === "real") {
    return new RealWsClient(config.wsBaseUrl, storage);
  }
  return new InMemoryWsClient(MockBackend.shared());
}
