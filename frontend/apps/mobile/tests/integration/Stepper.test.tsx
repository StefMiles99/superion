import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { initI18n } from '@superion/i18n';
import { I18nextProvider } from 'react-i18next';

import { Stepper } from '../../src/components/Stepper';

function renderStepper(currentStepIndex: number, totalSteps: number) {
  const i18n = initI18n('es-ES');
  return render(
    <I18nextProvider i18n={i18n}>
      <Stepper currentStepIndex={currentStepIndex} totalSteps={totalSteps} />
    </I18nextProvider>,
  );
}

describe('Stepper integration (mobile)', () => {
  it('renders stepper with current step highlighted and completed dots', () => {
    renderStepper(3, 12);

    expect(screen.getByTestId('stepper')).toBeInTheDocument();
    expect(screen.getByText('Paso 4 de 12')).toBeInTheDocument();

    expect(screen.getByTestId('stepper-dot-0')).toHaveAttribute('data-state', 'completed');
    expect(screen.getByTestId('stepper-dot-1')).toHaveAttribute('data-state', 'completed');
    expect(screen.getByTestId('stepper-dot-2')).toHaveAttribute('data-state', 'completed');
    expect(screen.getByTestId('stepper-dot-3')).toHaveAttribute('data-state', 'current');
    expect(screen.getByTestId('stepper-dot-4')).toHaveAttribute('data-state', 'pending');
  });

  it('marks first step as current on session start', () => {
    renderStepper(0, 12);

    expect(screen.getByText('Paso 1 de 12')).toBeInTheDocument();
    expect(screen.getByTestId('stepper-dot-0')).toHaveAttribute('data-state', 'current');
    expect(screen.getByTestId('stepper-dot-1')).toHaveAttribute('data-state', 'pending');
  });
});
