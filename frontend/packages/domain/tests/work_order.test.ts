import { describe, expect, it } from 'vitest';

import type { WorkOrder } from '../src/entities/work_order';
import {
  isWorkOrderPriority,
  isWorkOrderStatus,
  matchesWorkOrderFilter,
  parseWorkOrderFilterFromSearchParams,
  serializeWorkOrderFilterToSearchParams,
} from '../src/entities/work_order';

const sampleWorkOrder: WorkOrder = {
  id: '770e8400-e29b-41d4-a716-446655440000',
  code: 'OT-1234',
  status: 'pending',
  priority: 'high',
  procedureName: 'MP-Compresor-C3-v3',
  estimatedMinutes: 90,
  asset: {
    id: '880e8400-e29b-41d4-a716-446655440000',
    tag: 'COMP-C3',
    name: 'Compresor C-3',
  },
};

describe('WorkOrderFilter parse', () => {
  it('parses valid status, priority and search query from URLSearchParams', () => {
    const params = new URLSearchParams('status=pending&priority=high&q=1234&limit=10');
    const filter = parseWorkOrderFilterFromSearchParams(params);

    expect(filter).toEqual({
      status: 'pending',
      priority: 'high',
      q: '1234',
      limit: 10,
    });
  });

  it('ignores invalid status and priority values', () => {
    const params = new URLSearchParams('status=invalid&priority=urgent');
    const filter = parseWorkOrderFilterFromSearchParams(params);

    expect(filter).toEqual({});
  });

  it('round-trips filter values through serialize', () => {
    const filter = {
      status: 'in_progress' as const,
      priority: 'med' as const,
      q: 'COMP',
      cursor: '2',
      limit: 5,
    };

    const params = serializeWorkOrderFilterToSearchParams(filter);
    expect(parseWorkOrderFilterFromSearchParams(params)).toEqual(filter);
  });
});

describe('WorkOrder invariants', () => {
  it('identifies valid status values', () => {
    expect(isWorkOrderStatus('pending')).toBe(true);
    expect(isWorkOrderStatus('unknown')).toBe(false);
  });

  it('identifies valid priority values', () => {
    expect(isWorkOrderPriority('high')).toBe(true);
    expect(isWorkOrderPriority('critical')).toBe(false);
  });

  it('matches work orders by status filter', () => {
    expect(matchesWorkOrderFilter(sampleWorkOrder, { status: 'pending' })).toBe(true);
    expect(matchesWorkOrderFilter(sampleWorkOrder, { status: 'completed' })).toBe(false);
  });

  it('matches work orders by code or asset tag search', () => {
    expect(matchesWorkOrderFilter(sampleWorkOrder, { q: '1234' })).toBe(true);
    expect(matchesWorkOrderFilter(sampleWorkOrder, { q: 'comp-c3' })).toBe(true);
    expect(matchesWorkOrderFilter(sampleWorkOrder, { q: 'motor' })).toBe(false);
  });
});
