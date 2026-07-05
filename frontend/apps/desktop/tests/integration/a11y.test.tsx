import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { VirtuosoMockContext } from 'react-virtuoso';

import { RequireAuth } from '@superion/auth';
import { createAuthSession } from '@superion/domain';

import DashboardPage from '../../src/pages/DashboardPage';
import LoginPage from '../../src/pages/LoginPage';
import SessionDetailPage from '../../src/pages/SessionDetailPage';
import { renderWithProviders } from '../test-utils';

const SESSION_ID = 'aa0e8400-e29b-41d4-a716-446655440001';

const supervisorSession = createAuthSession(
  {
    accessToken: 'eyJ.mock.token',
    refreshToken: 'v1.mock.refresh',
    expiresIn: 3600,
    user: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: 'ana@planta.com',
      fullName: 'Ana Supervisor',
      role: 'supervisor',
      plantId: '660e8400-e29b-41d4-a716-446655440001',
    },
  },
  Date.now(),
);

describe('a11y integration (desktop)', () => {
  it('LoginPage has no critical axe violations', async () => {
    const { container } = renderWithProviders([{ path: '/login', element: <LoginPage /> }]);
    const results = await axe(container);
    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical).toEqual([]);
  });

  it('DashboardPage has no critical axe violations', async () => {
    const { container } = renderWithProviders(
      [
        {
          path: '/dashboard',
          element: (
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          ),
        },
      ],
      { initialEntries: ['/dashboard'], session: supervisorSession },
    );
    const results = await axe(container);
    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical).toEqual([]);
  });

  it('SessionDetailPage has no critical axe violations', async () => {
    const { container } = renderWithProviders(
      [
        {
          path: '/sessions/:id',
          element: (
            <VirtuosoMockContext.Provider value={{ viewportHeight: 400, itemHeight: 80 }}>
              <RequireAuth>
                <SessionDetailPage />
              </RequireAuth>
            </VirtuosoMockContext.Provider>
          ),
        },
      ],
      {
        initialEntries: [`/sessions/${SESSION_ID}`],
        session: supervisorSession,
      },
    );

    const results = await axe(container);
    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical).toEqual([]);
  });
});
