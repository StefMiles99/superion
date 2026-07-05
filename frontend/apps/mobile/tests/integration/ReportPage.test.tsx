import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getApiClient } from '@superion/api-client';
import { createAuthSession } from '@superion/domain';

import ReportPage from '../../src/pages/ReportPage';
import { createTestQueryClient, renderWithProviders } from '../test-utils';

const validSession = createAuthSession(
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
);

const OT_1234_ID = '770e8400-e29b-41d4-a716-446655440000';

describe('ReportPage integration (mobile)', () => {
  it('renders report fixture with current step marked', async () => {
    const queryClient = createTestQueryClient();
    const view = renderWithProviders(
      [{ path: '/sessions/:id/report', element: <ReportPage /> }],
      {
        initialEntries: ['/sessions/pending/report'],
        session: validSession,
        queryClient,
      },
    );

    const api = getApiClient();
    await api.login({ email: 'juan@planta.com', password: 'test1234' });
    const started = await api.startSession(OT_1234_ID);
    queryClient.setQueryData(['session', started.sessionId, 'procedure'], started.procedureTemplate);

    for (let step = 0; step < 3; step += 1) {
      await api.postSessionEvent(started.sessionId, {
        eventId: crypto.randomUUID(),
        type: 'step_advance',
        stepIndex: step,
        payload: {},
      });
    }

    await view.router.navigate(`/sessions/${started.sessionId}/report`);

    await waitFor(() => {
      expect(screen.getByTestId('report-page')).toBeInTheDocument();
    });

    expect(screen.getByText('Resumen ejecutivo')).toBeInTheDocument();
    expect(screen.getByTestId('report-step-progress')).toHaveTextContent('Paso 4 de 12');
    expect(screen.getByText('Hallazgos')).toBeInTheDocument();

    const currentStep = screen.getByTestId('report-step-3');
    expect(currentStep).toHaveAttribute('data-status', 'current');
    expect(currentStep).toHaveTextContent('▶');
  });
});
