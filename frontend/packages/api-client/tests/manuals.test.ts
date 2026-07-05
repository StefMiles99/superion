import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryApiClient } from "../src/in_memory";
import { MockBackend } from "../src/mock/backend";

describe("MockBackend manuales", () => {
  let backend: MockBackend;
  let api: InMemoryApiClient;

  beforeEach(() => {
    backend = MockBackend.shared();
    backend.reset();
    api = new InMemoryApiClient(backend);
  });

  it("lista los manuales sembrados", async () => {
    const { items } = await api.listManuals();
    expect(items.length).toBeGreaterThanOrEqual(2);
  });

  it("rechaza archivos que no son PDF", () => {
    expect(() =>
      backend.uploadManual({
        file: new Blob(["x"], { type: "image/png" }),
        title: "No PDF",
        assetModel: "X",
      }),
    ).toThrowError(/PDF/);
  });

  it("sube un PDF (pending) y lo indexa de forma asíncrona", () => {
    vi.useFakeTimers();
    try {
      const res = backend.uploadManual({
        file: new Blob(["%PDF-1.4"], { type: "application/pdf" }),
        title: "Nuevo manual",
        assetModel: "Bomba B-9",
      });
      expect(res.index_status).toBe("pending");

      let manual = backend.getManual(res.manual_id);
      expect(manual.status).toBe("indexing");
      expect(manual.chunk_count).toBe(0);

      vi.advanceTimersByTime(2100);
      manual = backend.getManual(res.manual_id);
      expect(manual.index_status).toBe("indexed");
      expect(manual.status).toBe("active");
      expect(manual.chunk_count).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("archiva (soft delete) un manual", async () => {
    const { items } = await api.listManuals();
    const first = items[0]!;
    await api.deleteManual(first.id);
    expect(backend.getManual(first.id).status).toBe("archived");
  });
});
