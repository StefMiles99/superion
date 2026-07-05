import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';

import type { Step } from '@superion/domain';
import { initI18n } from '@superion/i18n';

import { ProcedureStepList } from '../../src/components/ProcedureStepList';
import { reorderProcedureSteps } from '../../src/services/procedure_step_list';

function buildSteps(): Step[] {
  return [
    {
      index: 0,
      title: 'Paso A',
      description: '',
      estimatedMinutes: 5,
      critical: false,
      requiresPhoto: false,
      photoCriteria: null,
    },
    {
      index: 1,
      title: 'Paso B',
      description: '',
      estimatedMinutes: 5,
      critical: false,
      requiresPhoto: false,
      photoCriteria: null,
    },
    {
      index: 2,
      title: 'Paso C',
      description: '',
      estimatedMinutes: 5,
      critical: false,
      requiresPhoto: false,
      photoCriteria: null,
    },
  ];
}

function renderStepList(props: React.ComponentProps<typeof ProcedureStepList>) {
  const i18n = initI18n('es-ES');
  return render(
    <I18nextProvider i18n={i18n}>
      <ProcedureStepList {...props} />
    </I18nextProvider>,
  );
}

describe('reorderProcedureSteps', () => {
  it('moves a step down using sortable ids', () => {
    const reordered = reorderProcedureSteps(buildSteps(), 'row-0', 'row-1');
    expect(reordered?.[0]?.title).toBe('Paso B');
    expect(reordered?.[1]?.title).toBe('Paso A');
  });
});

describe('ProcedureStepList integration', () => {
  it('renders sortable step rows with drag handles', () => {
    const onChange = vi.fn();
    renderStepList({ steps: buildSteps(), fieldErrors: {}, onChange });

    expect(screen.getByTestId('procedure-step-list')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /arrastrar paso/i })).toHaveLength(3);
    expect(screen.getByRole('button', { name: /añadir paso/i })).toBeInTheDocument();
  });

  it('applies reorder logic used by drag and drop', () => {
    const onChange = vi.fn();
    renderStepList({ steps: buildSteps(), fieldErrors: {}, onChange });

    const reordered = reorderProcedureSteps(buildSteps(), 'row-0', 'row-2');
    onChange(reordered);

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ title: 'Paso B' }),
      expect.objectContaining({ title: 'Paso C' }),
      expect.objectContaining({ title: 'Paso A' }),
    ]);
  });
});
