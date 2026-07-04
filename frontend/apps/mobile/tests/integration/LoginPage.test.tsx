import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { RequireAuth } from '@superion/auth';

import LoginPage from '../../src/pages/LoginPage';
import WorkOrdersPage from '../../src/pages/WorkOrdersPage';
import { renderWithProviders } from '../test-utils';

describe('LoginPage integration (mobile)', () => {
  it('submits credentials and navigates to work-orders', async () => {
    const user = userEvent.setup();

    renderWithProviders([
      { path: '/login', element: <LoginPage /> },
      {
        path: '/work-orders',
        element: (
          <RequireAuth>
            <WorkOrdersPage />
          </RequireAuth>
        ),
      },
    ]);

    await user.type(screen.getByLabelText(/correo electrónico/i), 'juan@planta.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'test1234');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByTestId('work-orders-placeholder')).toBeInTheDocument();
    });
  });
});
