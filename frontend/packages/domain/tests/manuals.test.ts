import { describe, expect, it } from "vitest";
import { MAX_MANUAL_BYTES } from "../src/manuals";
import { validateManualFile } from "../src/services/manuals";

describe("validateManualFile", () => {
  it("acepta un PDF válido", () => {
    const r = validateManualFile({ type: "application/pdf", size: 1024, name: "manual.pdf" });
    expect(r.ok).toBe(true);
  });

  it("acepta por extensión aunque el type venga vacío", () => {
    const r = validateManualFile({ type: "", size: 1024, name: "manual.PDF" });
    expect(r.ok).toBe(true);
  });

  it("rechaza archivos que no son PDF", () => {
    const r = validateManualFile({ type: "image/png", size: 1024, name: "foto.png" });
    expect(r).toEqual({ ok: false, error: "not_pdf" });
  });

  it("rechaza archivos vacíos", () => {
    const r = validateManualFile({ type: "application/pdf", size: 0, name: "x.pdf" });
    expect(r).toEqual({ ok: false, error: "empty" });
  });

  it("rechaza archivos que superan el límite", () => {
    const r = validateManualFile({
      type: "application/pdf",
      size: MAX_MANUAL_BYTES + 1,
      name: "grande.pdf",
    });
    expect(r).toEqual({ ok: false, error: "too_large" });
  });
});
