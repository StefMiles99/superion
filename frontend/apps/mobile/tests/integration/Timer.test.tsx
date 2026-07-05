import { act, render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Session } from '@superion/domain';

import { Timer } from '../../src/components/Timer';
import { useSessionTimers } from '../../src/hooks/useSessionTimers';

const activeSession: Session = {
  id: 'sess-1',
  workOrderId: 'wo-1',
  technicianId: 'tech-1',
  status: 'active',
  startedAt: '2026-07-04T14:00:00Z',
  endedAt: null,
  currentStepIndex: 0,
  langgraphThreadId: 'thread-1',
  metrics: {
    totalActiveSeconds: 5,
    voiceSeconds: 0,
    photosCount: 0,
    avgStepSeconds: 0,
  },
  nextSeq: 1,
};

describe('Timer integration (mobile)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders mm:ss from seconds prop', () => {
    render(<Timer seconds={65} label="Tiempo activo" testId="total-timer" />);
    expect(screen.getByTestId('total-timer')).toHaveTextContent('01:05');
  });

  it('advances with fake timers via useSessionTimers', () => {
    const { result } = renderHook(() => useSessionTimers(activeSession));

    expect(result.current.totalSeconds).toBe(5);
    expect(result.current.stepSeconds).toBe(0);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.totalSeconds).toBe(7);
    expect(result.current.stepSeconds).toBe(2);
  });

  it('cleans up interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    const { unmount } = renderHook(() => useSessionTimers(activeSession));

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
