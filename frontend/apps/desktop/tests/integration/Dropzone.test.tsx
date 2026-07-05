import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';

import { initI18n } from '@superion/i18n';

import { Dropzone } from '../../src/components/Dropzone';

function renderWithI18n(ui: React.ReactElement) {
  const i18n = initI18n('es-ES');
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe('Dropzone integration', () => {
  it('accepts file via click fallback', async () => {
    const user = userEvent.setup();
    const onFileSelected = vi.fn();

    renderWithI18n(<Dropzone onFileSelected={onFileSelected} />);

    const input = screen.getByTestId('dropzone-input');
    const file = new File(['pdf-content'], 'manual.pdf', { type: 'application/pdf' });

    await user.upload(input, file);

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it('accepts file via drag and drop', async () => {
    const onFileSelected = vi.fn();
    renderWithI18n(<Dropzone onFileSelected={onFileSelected} />);

    const dropzone = screen.getByTestId('dropzone');
    const file = new File(['pdf-content'], 'manual.pdf', { type: 'application/pdf' });

    fireEvent.dragEnter(dropzone);
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
        types: ['Files'],
      },
    });

    await waitFor(() => {
      expect(onFileSelected).toHaveBeenCalledWith(file);
    });
  });
});
