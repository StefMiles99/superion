import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getApiClient } from '@superion/api-client';
import { createAuthSession } from '@superion/domain';
import { InMemoryWsClient } from '@superion/ws-client';

import { useSessionStream } from '../../src/hooks/useSessionStream';
import { createTestQueryClient } from '../test-utils';

const mockWs = new InMemoryWsClient();

vi.mock('@superion/ws-client', async () => {
  const actual = await vi.importActual<typeof import('@superion/ws-client')>('@superion/ws-client');
  return {
    ...actual,
    getWsClient: () => mockWs,
  };
});

vi.mock('@superion/auth', async () => {
  const actual = await vi.importActual<typeof import('@superion/auth')>('@superion/auth');
  return {
    ...actual,
    useAuth: () => ({
      session: createAuthSession(
        {
          accessToken: 'eyJ.mock.token',
          refreshToken: 'v1.mock.refresh',
          expiresIn: 3600,
          user: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            email: 'juan@planta.com',
            fullName: 'Juan Pérez',
            role: 'technician',
            plantId: '660e8400-e29b-41d4-a716-446655440001',
          },
        },
        Date.now(),
      ),
      user: null,
      isAuthenticated: true,
      setSession: vi.fn(),
      clearSession: vi.fn(),
    }),
  };
});

describe('useSessionStream', () => {
  it('updates session cache when step.entered event arrives', async () => {
    mockWs.reset?.();
    const queryClient = createTestQueryClient();
    const api = getApiClient();
    await api.login({ email: 'juan@planta.com', password: 'test1234' });
    const started = await api.startSession('770e8400-e29b-41d4-a716-446655440000');

    queryClient.setQueryData(['session', started.sessionId], {
      id: started.sessionId,
      workOrderId: started.workOrderId,
      technicianId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'active',
      startedAt: started.startedAt,
      endedAt: null,
      currentStepIndex: 0,
      langgraphThreadId: started.langgraphThreadId,
      metrics: {
        totalActiveSeconds: 0,
        voiceSeconds: 0,
        photosCount: 0,
        avgStepSeconds: 0,
      },
      nextSeq: 1,
    });
    queryClient.setQueryData(['session', started.sessionId, 'procedure'], started.procedureTemplate);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useSessionStream(started.sessionId), { wrapper });

    await waitFor(() => {
      expect(mockWs.getConnectionState?.()).toBe('open');
    });

    act(() => {
      mockWs.emit!({
        seq: 99,
        type: 'step.entered',
        session_id: started.sessionId,
        created_at: new Date().toISOString(),
        payload: {
          index: 1,
          title: 'Aislar energía',
          description: 'Cerrar V-12',
          estimated_minutes: 10,
          critical: true,
          requires_photo: false,
          photo_criteria: null,
        },
      });
    });

    await waitFor(() => {
      const session = queryClient.getQueryData<{ currentStepIndex: number }>([
        'session',
        started.sessionId,
      ]);
      expect(session?.currentStepIndex).toBe(1);
    });
  });
});
