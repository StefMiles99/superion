import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { MaintenanceReport } from '@superion/domain';

import { ReportViewer } from '../../src/components/ReportViewer';
import { renderWithProviders } from '../test-utils';

const mockReport: MaintenanceReport = {
  id: 'report-1',
  sessionId: 'sess-1',
  status: 'draft',
  version: 1,
  updatedAt: '2026-01-01T10:00:00.000Z',
  content: {
    header: {
      otCode: 'OT-1234',
      technician: 'Juan Pérez',
      asset: 'Compresor C-3',
      plant: 'Planta Norte',
      startedAt: '2026-01-01T09:00:00.000Z',
      endedAt: null,
      durationMin: 15,
    },
    summary: 'Mantenimiento en curso en OT-1234.',
    procedure: [
      {
        index: 0,
        title: 'Preparar área de trabajo',
        startedAt: '2026-01-01T09:00:00.000Z',
        endedAt: '2026-01-01T09:05:00.000Z',
        durationMin: 5,
        status: 'done',
        skipReason: null,
        photos: [],
        observations: [],
        findings: [],
      },
      {
        index: 1,
        title: 'Verificar EPP',
        startedAt: '2026-01-01T09:05:00.000Z',
        endedAt: null,
        durationMin: null,
        status: 'current',
        skipReason: null,
        photos: [],
        observations: [],
        findings: [],
      },
    ],
    findings: [{ text: 'Condiciones generales normales', severity: 'low' }],
    measurements: [{ name: 'presion_psi', value: 85.2, unit: 'psi', stepIndex: 1 }],
    photosGallery: [
      {
        path: 'mock://photo/1',
        caption: 'Evidencia LOTO',
        thumbnailUrl: 'mock://thumb/1',
      },
    ],
  },
};

describe('ReportViewer integration (desktop)', () => {
  it('renders report sections and tabs', () => {
    renderWithProviders(
      [
        {
          path: '/',
          element: <ReportViewer report={mockReport} highlightedStepIndex={null} />,
        },
      ],
      { initialEntries: ['/'] },
    );

    expect(screen.getByRole('tab', { name: /resumen/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /procedimiento/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /fotos/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /hallazgos/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /medidas/i })).toBeInTheDocument();
    expect(screen.getByText(/mantenimiento en curso/i)).toBeInTheDocument();
  });

  it('switches tabs to show procedure steps', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      [
        {
          path: '/',
          element: <ReportViewer report={mockReport} highlightedStepIndex={null} />,
        },
      ],
      { initialEntries: ['/'] },
    );

    await user.click(screen.getByRole('tab', { name: /procedimiento/i }));

    expect(screen.getByText(/paso 1/i)).toBeInTheDocument();
    expect(screen.getByText(/preparar área de trabajo/i)).toBeInTheDocument();
  });

  it('highlights the selected procedure step', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      [
        {
          path: '/',
          element: <ReportViewer report={mockReport} highlightedStepIndex={0} />,
        },
      ],
      { initialEntries: ['/'] },
    );

    await user.click(screen.getByRole('tab', { name: /procedimiento/i }));

    expect(screen.getByTestId('report-step-0')).toHaveAttribute('data-highlighted', 'true');
  });
});
