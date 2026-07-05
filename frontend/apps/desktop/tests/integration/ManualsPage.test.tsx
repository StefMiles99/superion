import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { RequireAuth } from '@superion/auth';

import ManualsPage from '../../src/pages/ManualsPage';
import LoginPage from '../../src/pages/LoginPage';
import { renderWithProviders } from '../test-utils';

async function loginAsAdmin(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/correo electrónico/i), 'admin@planta.com');
  await user.type(screen.getByLabelText(/contraseña/i), 'test1234');
  await user.click(screen.getByRole('button', { name: /entrar/i }));
}

describe('ManualsPage integration', () => {
  it('renders manuals list with status badges', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      [
        { path: '/login', element: <LoginPage /> },
        {
          path: '/manuals',
          element: (
            <RequireAuth>
              <ManualsPage />
            </RequireAuth>
          ),
        },
      ],
      { initialEntries: ['/login'] },
    );

    await loginAsAdmin(user);

    await waitFor(() => {
      expect(screen.getByTestId('manuals-page')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('manuals-table')).toBeInTheDocument();
    });

    expect(screen.getAllByTestId('manual-row').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole('link', { name: /Atlas Copco GA-37/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('index-status-badge').length).toBeGreaterThanOrEqual(2);
  });

  it('filters manuals by status', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      [
        { path: '/login', element: <LoginPage /> },
        {
          path: '/manuals',
          element: (
            <RequireAuth>
              <ManualsPage />
            </RequireAuth>
          ),
        },
      ],
      { initialEntries: ['/login'] },
    );

    await loginAsAdmin(user);

    await waitFor(() => {
      expect(screen.getByTestId('manuals-table')).toBeInTheDocument();
    });

    const initialCount = screen.getAllByTestId('manual-row').length;

    await user.selectOptions(screen.getByLabelText(/estado/i), 'indexing');

    await waitFor(() => {
      expect(screen.getAllByTestId('manual-row').length).toBeLessThan(initialCount);
    });

    expect(screen.getByRole('link', { name: /Grundfos CR/i })).toBeInTheDocument();
  });

  it('shows archive confirmation dialog', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      [
        { path: '/login', element: <LoginPage /> },
        {
          path: '/manuals',
          element: (
            <RequireAuth>
              <ManualsPage />
            </RequireAuth>
          ),
        },
      ],
      { initialEntries: ['/login'] },
    );

    await loginAsAdmin(user);

    await waitFor(() => {
      expect(screen.getByTestId('manuals-table')).toBeInTheDocument();
    });

    const firstRow = screen.getAllByTestId('manual-row')[0]!;
    await user.click(within(firstRow).getByRole('button', { name: /archivar/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/¿Archivar/i)).toBeInTheDocument();
  });
});
