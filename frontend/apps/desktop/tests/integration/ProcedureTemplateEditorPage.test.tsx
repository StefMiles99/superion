import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { RequireAuth } from '@superion/auth';

import ProcedureTemplateEditorPage from '../../src/pages/ProcedureTemplateEditorPage';
import ProcedureTemplatesPage from '../../src/pages/ProcedureTemplatesPage';
import ManualsPage from '../../src/pages/ManualsPage';
import LoginPage from '../../src/pages/LoginPage';
import { renderWithProviders } from '../test-utils';

async function loginAsAdmin(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/correo electrónico/i), 'admin@planta.com');
  await user.type(screen.getByLabelText(/contraseña/i), 'test1234');
  await user.click(screen.getByRole('button', { name: /entrar/i }));
}

describe('ProcedureTemplateEditorPage integration', () => {
  it('creates a new template with inline validation', async () => {
    const user = userEvent.setup();

    const { router } = renderWithProviders(
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
        {
          path: '/procedures/new',
          element: (
            <RequireAuth>
              <ProcedureTemplateEditorPage />
            </RequireAuth>
          ),
        },
        {
          path: '/procedures',
          element: (
            <RequireAuth>
              <ProcedureTemplatesPage />
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

    await router.navigate('/procedures/new');

    await waitFor(() => {
      expect(screen.getByTestId('procedure-editor-page')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.getByText(/el nombre es obligatorio/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/^nombre$/i), 'MP-Test-01');
    await user.selectOptions(screen.getByRole('combobox', { name: /manual asociado/i }), [
      '990e8400-e29b-41d4-a716-446655440000',
    ]);
    await user.click(screen.getByRole('button', { name: /añadir paso/i }));
    await user.type(screen.getByTestId('step-row-0').querySelector('[name=title]')!, 'Paso único');

    await user.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.getByTestId('procedures-table')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('MP-Test-01')).toBeInTheDocument();
    });
  });
});

describe('ProcedureTemplatesPage integration', () => {
  it('renders templates list', async () => {
    const user = userEvent.setup();

    const { router } = renderWithProviders(
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
        {
          path: '/procedures',
          element: (
            <RequireAuth>
              <ProcedureTemplatesPage />
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

    await router.navigate('/procedures');

    await waitFor(() => {
      expect(screen.getByTestId('procedures-table')).toBeInTheDocument();
    });

    expect(screen.getAllByTestId('procedure-row').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/MP-Compresor-C3-v3/i)).toBeInTheDocument();
  });

  it('archives a template after confirmation', async () => {
    const user = userEvent.setup();

    const { router } = renderWithProviders(
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
        {
          path: '/procedures',
          element: (
            <RequireAuth>
              <ProcedureTemplatesPage />
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

    await router.navigate('/procedures');

    await waitFor(() => {
      expect(screen.getByTestId('procedures-table')).toBeInTheDocument();
    });

    const firstRow = screen.getAllByTestId('procedure-row')[0]!;
    await user.click(within(firstRow).getByRole('button', { name: /archivar/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(within(firstRow).getByText(/archivada/i)).toBeInTheDocument();
    });
  });
});
