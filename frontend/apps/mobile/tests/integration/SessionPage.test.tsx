import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { getApiClient } from '@superion/api-client';
import { createAuthSession } from '@superion/domain';

import SessionPage from '../../src/pages/SessionPage';
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

describe('SessionPage integration (mobile)', () => {
  it('renders current step from fixture and advances on Siguiente', async () => {
    const queryClient = createTestQueryClient();
    const view = renderWithProviders([{ path: '/sessions/:id', element: <SessionPage /> }], {
      initialEntries: ['/sessions/pending'],
      session: validSession,
      queryClient,
    });

    const api = getApiClient();
    await api.login({ email: 'juan@planta.com', password: 'test1234' });
    const started = await api.startSession(OT_1234_ID);
    queryClient.setQueryData(['session', started.sessionId, 'procedure'], started.procedureTemplate);
    await view.router.navigate(`/sessions/${started.sessionId}`);

    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Paso 1 de 12')).toBeInTheDocument();
    });

    expect(screen.getByText('Preparar área de trabajo')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Siguiente paso' }));

    await waitFor(() => {
      expect(screen.getByText('Paso 2 de 12')).toBeInTheDocument();
    });

    expect(screen.getByText('Verificar EPP')).toBeInTheDocument();
  });
});
