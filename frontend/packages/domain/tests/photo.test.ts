import { describe, expect, it } from 'vitest';

import type { EvidencePhoto } from '../src/entities/photo';
import {
  isPhotoAccepted,
  isPhotoEscalated,
  isPhotoStatus,
  validateEvidencePhoto,
} from '../src/entities/photo';

const basePhoto: EvidencePhoto = {
  id: 'photo-1',
  sessionId: 'sess-1',
  stepIndex: 3,
  status: 'pending',
  thumbnailUrl: null,
  feedback: null,
  retries: 0,
  maxRetries: 3,
  capturedAt: '2026-07-04T14:00:00Z',
};

describe('photo entity invariants', () => {
  it('accepts a valid evidence photo', () => {
    expect(() => validateEvidencePhoto(basePhoto)).not.toThrow();
  });

  it('rejects invalid status', () => {
    expect(() =>
      validateEvidencePhoto({
        ...basePhoto,
        status: 'invalid' as EvidencePhoto['status'],
      }),
    ).toThrow(/status inválido/);
  });

  it('rejects negative stepIndex', () => {
    expect(() =>
      validateEvidencePhoto({
        ...basePhoto,
        stepIndex: -1,
      }),
    ).toThrow(/stepIndex no puede ser negativo/);
  });

  it('rejects retries above maxRetries', () => {
    expect(() =>
      validateEvidencePhoto({
        ...basePhoto,
        retries: 4,
        maxRetries: 3,
      }),
    ).toThrow(/retries no puede superar maxRetries/);
  });

  it('isPhotoStatus narrows valid values', () => {
    expect(isPhotoStatus('accepted')).toBe(true);
    expect(isPhotoStatus('unknown')).toBe(false);
  });

  it('isPhotoAccepted returns true only for accepted', () => {
    expect(isPhotoAccepted({ ...basePhoto, status: 'accepted' })).toBe(true);
    expect(isPhotoAccepted({ ...basePhoto, status: 'rejected' })).toBe(false);
  });

  it('isPhotoEscalated when retries reach max', () => {
    expect(
      isPhotoEscalated({
        ...basePhoto,
        status: 'rejected',
        retries: 3,
        maxRetries: 3,
      }),
    ).toBe(true);
    expect(
      isPhotoEscalated({
        ...basePhoto,
        status: 'rejected',
        retries: 2,
        maxRetries: 3,
      }),
    ).toBe(false);
  });
});
