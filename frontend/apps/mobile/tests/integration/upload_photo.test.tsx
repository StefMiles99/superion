import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { getApiClient, InMemoryApiClient, resetApiClient } from '@superion/api-client';
import { createAuthSession } from '@superion/domain';
import { InMemoryWsClient } from '@superion/ws-client';
import { QueryClientProvider } from '@tanstack/react-query';

import { useUploadPhoto } from '../../src/hooks/useUploadPhoto';
import { createTestQueryClient } from '../test-utils';

const mockWs = new InMemoryWsClient();

vi.mock('@superion/ws-client', async () => {
  const actual = await vi.importActual<typeof import('@superion/ws-client')>('@superion/ws-client');
  return {
    ...actual,
    getWsClient: () => mockWs,
  };
});

describe('useUploadPhoto integration', () => {
  beforeEach(async () => {
    resetApiClient();
    mockWs.reset?.();
    const api = getApiClient();
    if (api instanceof InMemoryApiClient) {
      api.reset?.();
      api.setPhotoEventEmitter((event) => {
        mockWs.emit?.(event);
      });
    }
    await api.login({ email: 'juan@planta.com', password: 'test1234' });
    await mockWs.connect('sess-upload', 'token');
  });

  it('upload OK transitions to accepted', async () => {
    const api = getApiClient();
    if (!(api instanceof InMemoryApiClient)) {
      throw new Error('Se esperaba InMemoryApiClient');
    }

    const started = await api.startSession('770e8400-e29b-41d4-a716-446655440000');
    const queryClient = createTestQueryClient();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUploadPhoto(started.sessionId), { wrapper });

    await act(async () => {
      await result.current.uploadPhoto.mutateAsync({
        file: new File(['A-ok-image'], 'ok.jpg', { type: 'image/jpeg' }),
        stepIndex: 3,
      });
    });

    await waitFor(
      () => {
        expect(result.current.validationState.status).toBe('accepted');
      },
      { timeout: 3000 },
    );
  });

  it('rejected upload shows specific feedback and increments retries', async () => {
    const api = getApiClient();
    if (!(api instanceof InMemoryApiClient)) {
      throw new Error('Se esperaba InMemoryApiClient');
    }

    const started = await api.startSession('770e8400-e29b-41d4-a716-446655440001');
    const queryClient = createTestQueryClient();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUploadPhoto(started.sessionId), { wrapper });

    await act(async () => {
      await result.current.uploadPhoto.mutateAsync({
        file: new File(['R-bad'], 'bad.jpg', { type: 'image/jpeg' }),
        stepIndex: 3,
      });
    });

    await waitFor(
      () => {
        expect(result.current.validationState.status).toBe('rejected');
        expect(result.current.validationState.feedback).toMatch(/acércate más/i);
        expect(result.current.validationState.retries).toBe(1);
      },
      { timeout: 3000 },
    );
  });

  it('third rejection escalates', async () => {
    const api = getApiClient();
    if (!(api instanceof InMemoryApiClient)) {
      throw new Error('Se esperaba InMemoryApiClient');
    }

    const started = await api.startSession('770e8400-e29b-41d4-a716-446655440002');
    const queryClient = createTestQueryClient();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUploadPhoto(started.sessionId), { wrapper });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await act(async () => {
        result.current.resetValidation();
        await result.current.uploadPhoto.mutateAsync({
          file: new File(['R-bad'], 'bad.jpg', { type: 'image/jpeg' }),
          stepIndex: 3,
        });
      });

      await waitFor(
        () => {
          expect(['rejected', 'escalated']).toContain(result.current.validationState.status);
        },
        { timeout: 3000 },
      );
    }

    await waitFor(
      () => {
        expect(result.current.validationState.status).toBe('escalated');
        expect(result.current.validationState.retries).toBe(3);
      },
      { timeout: 5000 },
    );
  });
});
