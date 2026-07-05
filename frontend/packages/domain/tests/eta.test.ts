import { describe, expect, it } from 'vitest';

import { computeEta, formatEtaLabel } from '../src/value_objects/duration';

describe('computeEta', () => {
  it('uses metrics avgStepSeconds when available', () => {
    const eta = computeEta({
      currentStepIndex: 3,
      totalSteps: 12,
      totalActiveSeconds: 480,
      avgStepSeconds: 161,
      planAvgStepSeconds: 450,
    });
    expect(eta).toBe(9 * 161);
  });

  it('derives avg from real pace when metrics avg is zero', () => {
    const eta = computeEta({
      currentStepIndex: 3,
      totalSteps: 12,
      totalActiveSeconds: 480,
      avgStepSeconds: 0,
      planAvgStepSeconds: 450,
    });
    expect(eta).toBe(9 * 160);
  });

  it('falls back to plan average on first step with no metrics', () => {
    const eta = computeEta({
      currentStepIndex: 0,
      totalSteps: 12,
      totalActiveSeconds: 0,
      avgStepSeconds: 0,
      planAvgStepSeconds: 450,
    });
    expect(eta).toBe(12 * 450);
  });

  it('returns zero when all steps are completed', () => {
    const eta = computeEta({
      currentStepIndex: 12,
      totalSteps: 12,
      totalActiveSeconds: 3600,
      avgStepSeconds: 300,
      planAvgStepSeconds: 450,
    });
    expect(eta).toBe(0);
  });
});

describe('formatEtaLabel', () => {
  it('formats seconds as ETA minutes rounded up', () => {
    expect(formatEtaLabel(1080)).toBe('ETA 18m');
    expect(formatEtaLabel(61)).toBe('ETA 2m');
  });

  it('formats zero as ETA 0m', () => {
    expect(formatEtaLabel(0)).toBe('ETA 0m');
  });
});
