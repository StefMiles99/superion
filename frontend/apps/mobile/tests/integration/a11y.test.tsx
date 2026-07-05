import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';

import { RequireAuth } from '@superion/auth';
import { getApiClient } from '@superion/api-client';
import { createAuthSession } from '@superion/domain';

import LoginPage from '../../src/pages/LoginPage';
import SessionPage from '../../src/pages/SessionPage';
import WorkOrdersPage from '../../src/pages/WorkOrdersPage';
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

describe('a11y integration (mobile)', () => {
  it('LoginPage has no critical axe violations', async () => {
    const { container } = renderWithProviders([{ path: '/login', element: <LoginPage /> }]);
    const results = await axe(container);
    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical).toEqual([]);
  });

  it('WorkOrdersPage has no critical axe violations', async () => {
    const { container } = renderWithProviders(
      [
        {
          path: '/work-orders',
          element: (
            <RequireAuth>
              <WorkOrdersPage />
            </RequireAuth>
          ),
        },
      ],
      { initialEntries: ['/work-orders'], session: validSession },
    );
    const results = await axe(container);
    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical).toEqual([]);
  });

  it('SessionPage has no critical axe violations', async () => {
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

    const results = await axe(view.container);
    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical).toEqual([]);
  });
});
