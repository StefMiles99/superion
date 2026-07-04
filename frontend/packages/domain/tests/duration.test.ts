import { describe, expect, it } from 'vitest';

import { formatDuration } from '../src/value_objects/duration';

describe('formatDuration', () => {
  it('formats zero seconds as 00:00', () => {
    expect(formatDuration(0)).toBe('00:00');
  });

  it('formats minutes and seconds with padding', () => {
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(599)).toBe('09:59');
  });

  it('clamps negative values to 00:00', () => {
    expect(formatDuration(-1)).toBe('00:00');
    expect(formatDuration(-999)).toBe('00:00');
  });

  it('handles overflow beyond 59 minutes', () => {
    expect(formatDuration(3661)).toBe('61:01');
  });

  it('floors fractional seconds', () => {
    expect(formatDuration(90.9)).toBe('01:30');
  });
});
