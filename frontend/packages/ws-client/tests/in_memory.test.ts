import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryApiClient, MockBackend } from "@superion/api-client";
import type { WsEvent, WsStatus } from "@superion/domain";
import { InMemoryWsClient } from "../src/in_memory";

describe("InMemoryWsClient", () => {
  let backend: MockBackend;

  beforeEach(() => {
    backend = MockBackend.shared();
    backend.reset();
  });

  it("reproduce eventos previos al suscribirse (replay por lastSeq)", async () => {
    const api = new InMemoryApiClient(backend);
    const start = await api.startSession("wo-001");

    const events: WsEvent[] = [];
    const statuses: WsStatus[] = [];
    const ws = new InMemoryWsClient(backend);
    const sub = ws.subscribe(start.session_id, 0, {
      onEvent: (e) => events.push(e),
      onStatus: (s) => statuses.push(s),
    });

    expect(statuses).toEqual(["connecting", "open"]);
    expect(events.map((e) => e.type)).toEqual(["session.started", "step.entered"]);

    sub.close();
    expect(statuses.at(-1)).toBe("closed");
  });

  it("no reproduce eventos ya vistos si lastSeq es mayor", async () => {
    const api = new InMemoryApiClient(backend);
    const start = await api.startSession("wo-001");
    const events: WsEvent[] = [];
    const ws = new InMemoryWsClient(backend);
    ws.subscribe(start.session_id, 2, { onEvent: (e) => events.push(e) });
    expect(events).toHaveLength(0);
  });
});
