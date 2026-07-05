import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { RequireAuth } from '@superion/auth';

import DashboardPage from '../../src/pages/DashboardPage';
import LoginPage from '../../src/pages/LoginPage';
import { renderWithProviders } from '../test-utils';

describe('LoginPage integration (desktop)', () => {
  it('submits credentials and navigates to dashboard', async () => {
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
  });
});
