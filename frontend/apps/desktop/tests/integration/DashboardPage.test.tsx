import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { RequireAuth } from '@superion/auth';

import DashboardPage from '../../src/pages/DashboardPage';
import LoginPage from '../../src/pages/LoginPage';
import SessionDetailPage from '../../src/pages/SessionDetailPage';
import { renderWithProviders } from '../test-utils';

describe('DashboardPage integration (desktop)', () => {
  it('renders active sessions table after login', async () => {
    const user = userEvent.setup();

    renderWithProviders([
      { path: '/login', element: <LoginPage /> },
      {
        path: '/dashboard',
        element: (
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        ),
      },
    ]);

    await user.type(screen.getByLabelText(/correo electrónico/i), 'ana@planta.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'test1234');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByTestId('sessions-table')).toBeInTheDocument();
    });

    expect(screen.getAllByTestId('session-row').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('OT-1234')).toBeInTheDocument();
  });

  it('filters sessions by status', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      [
        { path: '/login', element: <LoginPage /> },
        {
          path: '/dashboard',
          element: (
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          ),
        },
      ],
      { initialEntries: ['/login'] },
    );

    await user.type(screen.getByLabelText(/correo electrónico/i), 'ana@planta.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'test1234');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByTestId('sessions-table')).toBeInTheDocument();
    });

    const initialCount = screen.getAllByTestId('session-row').length;

    await user.selectOptions(screen.getByLabelText(/estado/i), 'paused');

    await waitFor(() => {
      expect(screen.getAllByTestId('session-row').length).toBeLessThan(initialCount);
    });

    expect(screen.getByText('OT-1237')).toBeInTheDocument();
  });

  it('navigates to session detail on row click', async () => {
    const user = userEvent.setup();

    const { router } = renderWithProviders([
      { path: '/login', element: <LoginPage /> },
      {
        path: '/dashboard',
        element: (
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        ),
      },
      {
        path: '/sessions/:id',
        element: (
          <RequireAuth>
            <SessionDetailPage />
          </RequireAuth>
        ),
      },
    ]);

    await user.type(screen.getByLabelText(/correo electrónico/i), 'ana@planta.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'test1234');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('OT-1234')).toBeInTheDocument();
    });

    await user.click(screen.getByText('OT-1234'));

    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(/^\/sessions\//);
    });

    expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
  });

  it('shows toast after remote pause confirmation', async () => {
    const user = userEvent.setup();

    renderWithProviders([
      { path: '/login', element: <LoginPage /> },
      {
        path: '/dashboard',
        element: (
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        ),
      },
    ]);

    await user.type(screen.getByLabelText(/correo electrónico/i), 'ana@planta.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'test1234');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByTestId('sessions-table')).toBeInTheDocument();
    });

    const firstRow = screen.getAllByTestId('session-row')[0]!;
    await user.click(within(firstRow).getByRole('button', { name: /acciones/i }));
    await user.click(screen.getByRole('menuitem', { name: /pausar/i }));
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      const toast = screen.getByRole('status');
      expect(toast).toHaveTextContent(/sesión .* pausada/i);
    });
  });
});
