import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';

import { initI18n } from '@superion/i18n';

import { PhotoValidationOverlay } from '../../src/components/PhotoValidationOverlay';

function renderOverlay(props: React.ComponentProps<typeof PhotoValidationOverlay>) {
  const i18n = initI18n('es-ES');
  return render(
    <I18nextProvider i18n={i18n}>
      <PhotoValidationOverlay {...props} />
    </I18nextProvider>,
  );
}

describe('PhotoValidationOverlay', () => {
  it('shows validating spinner and label', () => {
    renderOverlay({ status: 'validating' });
    expect(screen.getByText(/validando foto/i)).toBeInTheDocument();
  });

  it('shows feedback on rejected', async () => {
    const onRetake = vi.fn();
    renderOverlay({
      status: 'rejected',
      feedback: 'No se ve el candado. Acércate más.',
      retries: 1,
      maxRetries: 3,
      onRetake,
    });

    expect(screen.getByText(/acércate más/i)).toBeInTheDocument();
    expect(screen.getByText(/intento 1 de 3/i)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Re-tomar' }));
    expect(onRetake).toHaveBeenCalled();
  });

  it('shows accepted message', () => {
    renderOverlay({ status: 'accepted' });
    expect(screen.getByText(/foto aceptada/i)).toBeInTheDocument();
  });

  it('shows escalation banner after max retries', () => {
    renderOverlay({
      status: 'escalated',
      feedback: 'No se ve el candado. Acércate más.',
      retries: 3,
      maxRetries: 3,
    });

    expect(screen.getByText(/máximo de reintentos/i)).toBeInTheDocument();
  });
});
