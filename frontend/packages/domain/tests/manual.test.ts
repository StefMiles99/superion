import { describe, expect, it } from 'vitest';

import type { Manual } from '../src/entities/manual';
import {
  filterManuals,
  isIndexStatus,
  isManualArchived,
  isManualIndexed,
  isManualStatus,
  validateManual,
} from '../src/entities/manual';

const baseManual: Manual = {
  id: '990e8400-e29b-41d4-a716-446655440000',
  title: 'Atlas Copco GA-37 — Service Manual',
  assetModel: 'Atlas Copco GA-37',
  version: 3,
  status: 'active',
  indexStatus: 'indexed',
  chunkCount: 412,
  uploadedAt: '2026-06-01T10:00:00Z',
  uploadedBy: {
    id: '550e8400-e29b-41d4-a716-446655440004',
    fullName: 'Admin Sistema',
  },
};

describe('manual entity invariants', () => {
  it('accepts a valid manual', () => {
    expect(() => validateManual(baseManual)).not.toThrow();
  });

  it('rejects invalid status', () => {
    expect(() =>
      validateManual({
        ...baseManual,
        status: 'invalid' as Manual['status'],
      }),
    ).toThrow(/status inválido/);
  });

  it('rejects invalid indexStatus', () => {
    expect(() =>
      validateManual({
        ...baseManual,
        indexStatus: 'unknown' as Manual['indexStatus'],
      }),
    ).toThrow(/indexStatus inválido/);
  });

  it('rejects negative chunkCount', () => {
    expect(() =>
      validateManual({
        ...baseManual,
        chunkCount: -1,
      }),
    ).toThrow(/chunkCount no puede ser negativo/);
  });

  it('isManualStatus narrows valid values', () => {
    expect(isManualStatus('active')).toBe(true);
    expect(isManualStatus('unknown')).toBe(false);
  });

  it('isIndexStatus narrows valid values', () => {
    expect(isIndexStatus('indexed')).toBe(true);
    expect(isIndexStatus('unknown')).toBe(false);
  });

  it('isManualArchived returns true only for archived', () => {
    expect(isManualArchived({ ...baseManual, status: 'archived' })).toBe(true);
    expect(isManualArchived(baseManual)).toBe(false);
  });

  it('isManualIndexed returns true only for indexed indexStatus', () => {
    expect(isManualIndexed(baseManual)).toBe(true);
    expect(isManualIndexed({ ...baseManual, indexStatus: 'pending' })).toBe(false);
  });
});

describe('filterManuals', () => {
  const manuals: Manual[] = [
    baseManual,
    {
      ...baseManual,
      id: '990e8400-e29b-41d4-a716-446655440001',
      title: 'Grundfos CR Manual',
      assetModel: 'Grundfos CR 32-4',
      status: 'indexing',
      indexStatus: 'pending',
      chunkCount: 0,
    },
  ];

  it('filters by status', () => {
    expect(filterManuals(manuals, { status: 'active' })).toHaveLength(1);
    expect(filterManuals(manuals, { status: 'indexing' })).toHaveLength(1);
  });

  it('filters by search query on title and assetModel', () => {
    expect(filterManuals(manuals, { q: 'grundfos' })).toHaveLength(1);
    expect(filterManuals(manuals, { q: 'atlas' })).toHaveLength(1);
    expect(filterManuals(manuals, { q: 'missing' })).toHaveLength(0);
  });
});
