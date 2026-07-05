import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WsEvent } from "@superion/domain";
import { InMemoryApiClient } from "../src/in_memory";
import { MockBackend } from "../src/mock/backend";
import { MOCK_PASSWORD, mockUser } from "../src/mock/fixtures";

describe("InMemoryApiClient", () => {
  let backend: MockBackend;
  let api: InMemoryApiClient;

  beforeEach(() => {
    backend = MockBackend.shared();
    backend.reset();
    api = new InMemoryApiClient(backend);
  });

  it("autentica con credenciales válidas", async () => {
    const session = await api.login(mockUser.email, MOCK_PASSWORD);
    expect(session.user.email).toBe(mockUser.email);
    expect(session.access_token).toMatch(/^mock\.access/);
  });

  it("rechaza credenciales inválidas", async () => {
    await expect(api.login(mockUser.email, "wrong")).rejects.toMatchObject({
      status: 401,
      code: "INVALID_CREDENTIALS",
    });
  });

  it("lista órdenes de trabajo", async () => {
    const page = await api.listWorkOrders();
    expect(page.items.length).toBeGreaterThan(0);
  });

  it("al iniciar sesión emite session.started y step.entered vía bus", async () => {
    const start = await api.startSession("wo-001");
    const events: WsEvent[] = [];
    backend.subscribe(start.session_id, 0, (e) => events.push(e));
    expect(events.map((e) => e.type)).toEqual(["session.started", "step.entered"]);
    expect(events[1]?.step_index).toBe(0);
  });

  it("subir foto emite photo.captured y luego photo.validated + avance de paso", () => {
    // Se usa el backend directo para controlar los timers sin el tick async del cliente.
    const start = backend.startSession("wo-002");
    const sid = start.session_id;
    const events: WsEvent[] = [];
    backend.subscribe(sid, 0, (e) => events.push(e));

    vi.useFakeTimers();
    try {
      backend.uploadPhoto(sid, {
        file: new Blob(["x"]),
        stepIndex: 1,
        eventId: "evt-1",
        criteria: "Candado LOTO",
      });
      expect(events.some((e) => e.type === "photo.captured")).toBe(true);

      vi.advanceTimersByTime(1300);
      const types = events.map((e) => e.type);
      expect(types).toContain("photo.validated");
      expect(types.filter((t) => t === "step.entered").length).toBeGreaterThanOrEqual(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
