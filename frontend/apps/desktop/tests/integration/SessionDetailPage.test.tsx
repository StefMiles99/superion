import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { RequireAuth, useAuthStore } from '@superion/auth';
import { VirtuosoMockContext } from 'react-virtuoso';

import SessionDetailPage from '../../src/pages/SessionDetailPage';
import LoginPage from '../../src/pages/LoginPage';
import { renderWithProviders } from '../test-utils';

const SESSION_ID = 'aa0e8400-e29b-41d4-a716-446655440001';

const sessionDetailRoutes = [
  { path: '/login', element: <LoginPage /> },
  {
    path: '/dashboard',
    element: (
      <RequireAuth>
        <div data-testid="dashboard-stub" />
      </RequireAuth>
    ),
  },
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
];

describe('SessionDetailPage integration (desktop)', () => {
  async function login(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/correo electrónico/i), 'ana@planta.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'test1234');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  }

  it('renders two-column layout with report and event stream', async () => {
    const user = userEvent.setup();

    const { router } = renderWithProviders(sessionDetailRoutes, { initialEntries: ['/login'] });

    await login(user);
    await router.navigate(`/sessions/${SESSION_ID}`);

    await waitFor(() => {
      expect(screen.getByTestId('report-viewer')).toBeInTheDocument();
    });

    expect(screen.getByTestId('session-detail-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('event-stream')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-scrubber')).toBeInTheDocument();
  });

  it('highlights report step when clicking an event', async () => {
    const user = userEvent.setup();

    const { router } = renderWithProviders(sessionDetailRoutes, { initialEntries: ['/login'] });

    await login(user);
    await router.navigate(`/sessions/${SESSION_ID}`);

    await waitFor(() => {
      expect(screen.getByText(/iniciando procedimiento de mantenimiento/i)).toBeInTheDocument();
    });

    const eventItem = screen
      .getByText(/iniciando procedimiento de mantenimiento/i)
      .closest('[data-testid="event-item"]');
    expect(eventItem).toBeTruthy();
    await user.click(eventItem!);

    await user.click(screen.getByRole('tab', { name: /procedimiento/i }));

    await waitFor(() => {
      expect(screen.getByTestId('report-step-2')).toHaveAttribute('data-highlighted', 'true');
    });
  });
});
