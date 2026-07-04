import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';

import { initI18n } from '@superion/i18n';

import { VoiceIndicator } from '../../src/components/VoiceIndicator';

describe('VoiceIndicator integration (mobile)', () => {
  it('renders listening label when active=true', () => {
    const i18n = initI18n('es-ES');

    render(
      <I18nextProvider i18n={i18n}>
        <VoiceIndicator active mode="listening" />
      </I18nextProvider>,
    );

    expect(screen.getByTestId('voice-indicator')).toBeInTheDocument();
    expect(screen.getByText('Escuchando…')).toBeInTheDocument();
  });

  it('does not render when active=false', () => {
    const i18n = initI18n('es-ES');

    render(
      <I18nextProvider i18n={i18n}>
        <VoiceIndicator active={false} mode="listening" />
      </I18nextProvider>,
    );

    expect(screen.queryByTestId('voice-indicator')).not.toBeInTheDocument();
  });
});
