import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getApiClient, resetApiClient } from '@superion/api-client';

import { triggerBlobDownload, useDownloadPdf } from '../../src/hooks/useDownloadPdf';

const OT_1234_ID = '770e8400-e29b-41d4-a716-446655440000';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useDownloadPdf', () => {
  let sessionId = '';

  beforeEach(async () => {
    resetApiClient();
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:mock-url'),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true,
      writable: true,
    });

    const api = getApiClient();
    await api.login({ email: 'juan@planta.com', password: 'test1234' });
    const started = await api.startSession(OT_1234_ID);
    sessionId = started.sessionId;
    await api.finalizeSession(sessionId);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches pdf bytes and triggers download fallback', async () => {
    const clickSpy = vi.fn();
    const removeSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
      if (tagName === 'a') {
        return {
          style: {},
          click: clickSpy,
          remove: removeSpy,
        } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tagName, options);
    });

    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });

    const { result } = renderHook(() => useDownloadPdf(sessionId, 'OT-1234-reporte.pdf'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeInstanceOf(Blob);
    const buffer = await result.current.data!.arrayBuffer();
    const header = new TextDecoder().decode(new Uint8Array(buffer).subarray(0, 8));
    expect(header).toContain('%PDF-');
    expect(clickSpy).toHaveBeenCalled();
  });
});

describe('triggerBlobDownload', () => {
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:test'),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates anchor with download attribute', () => {
    const clickSpy = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({
      style: {},
      click: clickSpy,
      remove: vi.fn(),
    } as unknown as HTMLAnchorElement);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

    triggerBlobDownload(new Blob(['%PDF-1.4']), 'test.pdf');

    expect(clickSpy).toHaveBeenCalled();
  });
});
