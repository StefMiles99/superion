import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { RequireAuth } from '@superion/auth';

import ManualUploadPage from '../../src/pages/ManualUploadPage';
import ManualsPage from '../../src/pages/ManualsPage';
import LoginPage from '../../src/pages/LoginPage';
import { renderWithProviders } from '../test-utils';

async function loginAsAdmin(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/correo electrónico/i), 'admin@planta.com');
  await user.type(screen.getByLabelText(/contraseña/i), 'test1234');
  await user.click(screen.getByRole('button', { name: /entrar/i }));
}

describe('ManualUploadPage integration', () => {
  it('submits upload and shows indexing progress', async () => {
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
        {
          path: '/manuals/upload',
          element: (
            <RequireAuth>
              <ManualUploadPage />
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

    await user.click(screen.getByRole('button', { name: /subir manual/i }));

    await waitFor(() => {
      expect(screen.getByTestId('manual-upload-page')).toBeInTheDocument();
    });

    const file = new File(['Pagina 1\n\fPagina 2'], 'manual.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByTestId('dropzone-input'), file);
    await user.type(screen.getByRole('textbox', { name: /título/i }), 'Manual de prueba');
    await user.type(screen.getByRole('textbox', { name: /modelo de activo/i }), 'Modelo X');
    await user.click(screen.getByRole('button', { name: /^subir$/i }));

    await waitFor(() => {
      expect(screen.getByTestId('upload-progress')).toBeInTheDocument();
    });

    expect(screen.getByText(/indexando/i)).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getByText(/indexado/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });
});
