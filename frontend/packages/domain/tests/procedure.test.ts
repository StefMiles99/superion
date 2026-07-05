import { describe, expect, it } from "vitest";
import { canSkipStep, requiresPhoto, stepProgress } from "../src/services/procedure";
import type { ProcedureStep } from "../src/entities";

const step = (over: Partial<ProcedureStep> = {}): ProcedureStep => ({
  index: 0,
  title: "Paso",
  description: "",
  estimated_minutes: 5,
  critical: false,
  requires_photo: false,
  photo_criteria: null,
  ...over,
});

describe("stepProgress", () => {
  it("devuelve 0 sin pasos", () => {
    expect(stepProgress(0, 0)).toBe(0);
  });

  it("calcula el porcentaje del paso actual", () => {
    expect(stepProgress(0, 4)).toBe(25);
    expect(stepProgress(3, 4)).toBe(100);
  });

  it("no supera 100", () => {
    expect(stepProgress(10, 4)).toBe(100);
  });
});

describe("canSkipStep", () => {
  it("permite saltar pasos no críticos", () => {
    expect(canSkipStep(step({ critical: false }))).toBe(true);
  });

  it("bloquea pasos críticos", () => {
    expect(canSkipStep(step({ critical: true }))).toBe(false);
  });
});

describe("requiresPhoto", () => {
  it("detecta pasos con foto obligatoria", () => {
    expect(requiresPhoto(step({ requires_photo: true }))).toBe(true);
    expect(requiresPhoto(step({ requires_photo: false }))).toBe(false);
  });
});
