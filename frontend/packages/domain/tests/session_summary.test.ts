import { describe, expect, it } from 'vitest';

import type { SessionSummary } from '../src/entities/session';
import {
  applySessionWsEvent,
  filterSessionSummaries,
  resolveWorkOrderCode,
  validateSessionSummary,
} from '../src/entities/session';

const PLANT_ID = '660e8400-e29b-41d4-a716-446655440001';

const sampleSummary: SessionSummary = {
  id: 'sess-1',
  workOrderId: '770e8400-e29b-41d4-a716-446655440000',
  workOrderCode: 'OT-1234',
  assetTag: 'COMP-C3',
  assetName: 'Compresor C-3',
  technicianId: '550e8400-e29b-41d4-a716-446655440000',
  technicianName: 'Juan Pérez',
  status: 'active',
  currentStepIndex: 2,
  currentStepTitle: 'Aislar energía',
  elapsedSeconds: 900,
  lastEventType: 'step.entered',
  lastEventAt: '2026-07-04T14:15:00Z',
  plantId: PLANT_ID,
};

describe('validateSessionSummary', () => {
  it('accepts a valid session summary', () => {
    expect(() => validateSessionSummary(sampleSummary)).not.toThrow();
  });

  it('rejects invalid status', () => {
    expect(() =>
      validateSessionSummary({ ...sampleSummary, status: 'invalid' as SessionSummary['status'] }),
    ).toThrow(/status inválido/);
  });

  it('rejects negative elapsed seconds', () => {
    expect(() => validateSessionSummary({ ...sampleSummary, elapsedSeconds: -1 })).toThrow(
      /elapsedSeconds/,
    );
  });
});

describe('filterSessionSummaries', () => {
  const sessions: SessionSummary[] = [
    sampleSummary,
    { ...sampleSummary, id: 'sess-2', status: 'paused', technicianId: 'tech-2' },
    { ...sampleSummary, id: 'sess-3', status: 'finalized', technicianId: 'tech-2' },
  ];

  it('returns all sessions when filter is empty', () => {
    expect(filterSessionSummaries(sessions, {})).toHaveLength(3);
  });

  it('filters by status', () => {
    const active = filterSessionSummaries(sessions, { status: 'active' });
    expect(active).toHaveLength(1);
    expect(active[0]?.id).toBe('sess-1');
  });

  it('filters by technician', () => {
    const filtered = filterSessionSummaries(sessions, { technicianId: 'tech-2' });
    expect(filtered).toHaveLength(2);
  });
});

describe('resolveWorkOrderCode', () => {
  it('returns known code when provided', () => {
    expect(resolveWorkOrderCode('wo-1234', 'OT-1234')).toBe('OT-1234');
  });

  it('derives OT code from wo- prefix', () => {
    expect(resolveWorkOrderCode('wo-9999')).toBe('OT-9999');
  });
});

describe('applySessionWsEvent', () => {
  it('appends a session on session.started', () => {
    const next = applySessionWsEvent([], {
      type: 'session.started',
      session_id: 'new-sess',
      created_at: '2026-07-04T15:00:00Z',
      payload: {
        work_order_id: 'wo-9999',
        started_at: '2026-07-04T15:00:00Z',
        technician_id: '550e8400-e29b-41d4-a716-446655440000',
        technician_name: 'Juan Pérez',
        asset_tag: 'COMP-X',
        asset_name: 'Compresor X',
      },
    }, { plantId: PLANT_ID });

    expect(next).toHaveLength(1);
    expect(next[0]?.id).toBe('new-sess');
    expect(next[0]?.workOrderCode).toBe('OT-9999');
    expect(next[0]?.status).toBe('active');
  });

  it('updates status on session.paused', () => {
    const next = applySessionWsEvent([sampleSummary], {
      type: 'session.paused',
      session_id: 'sess-1',
      created_at: '2026-07-04T15:05:00Z',
      payload: { reason: 'user' },
    }, { plantId: PLANT_ID });

    expect(next[0]?.status).toBe('paused');
    expect(next[0]?.lastEventType).toBe('session.paused');
  });

  it('removes session on session.closed', () => {
    const next = applySessionWsEvent([sampleSummary], {
      type: 'session.closed',
      session_id: 'sess-1',
      created_at: '2026-07-04T16:00:00Z',
      payload: {},
    }, { plantId: PLANT_ID });

    expect(next).toHaveLength(0);
  });
});
