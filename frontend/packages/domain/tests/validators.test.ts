import { describe, expect, it } from "vitest";
import { authSessionSchema, workOrderSchema } from "../src/validators";

describe("authSessionSchema", () => {
  it("acepta una sesión válida", () => {
    const parsed = authSessionSchema.safeParse({
      access_token: "eyJ",
      refresh_token: "v1.MR",
      expires_in: 3600,
      user: {
        id: "u1",
        email: "juan@planta.com",
        full_name: "Juan",
        role: "technician",
        plant_id: "p1",
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("rechaza email inválido", () => {
    const parsed = authSessionSchema.safeParse({
      access_token: "x",
      refresh_token: "y",
      expires_in: 1,
      user: { id: "u1", email: "no-email", full_name: "J", role: "technician", plant_id: "p1" },
    });
    expect(parsed.success).toBe(false);
  });
});

describe("workOrderSchema", () => {
  it("rechaza prioridad inválida", () => {
    const parsed = workOrderSchema.safeParse({
      id: "wo1",
      code: "OT-1",
      type: "preventive",
      priority: "urgent",
      status: "pending",
      asset: { id: "a1", tag: "T", name: "N", model: "M" },
      assigned_to: { id: "u1", full_name: "J" },
      planned_start: "2026-07-04T14:00:00Z",
      planned_end: "2026-07-04T15:00:00Z",
      procedure_template_id: "t1",
    });
    expect(parsed.success).toBe(false);
  });
});
