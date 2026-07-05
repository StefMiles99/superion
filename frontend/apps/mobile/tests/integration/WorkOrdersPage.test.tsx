import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { createAuthSession } from '@superion/domain';

import WorkOrdersPage from '../../src/pages/WorkOrdersPage';
import { renderWithProviders } from '../test-utils';

const validSession = createAuthSession(
  {
    accessToken: 'eyJ.mock.token',
    refreshToken: 'v1.mock.refresh',
    expiresIn: 3600,
    user: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'juan@planta.com',
      fullName: 'Juan Pérez',
      role: 'technician',
      plantId: '660e8400-e29b-41d4-a716-446655440001',
    },
  },
  Date.now(),
);

function renderWorkOrdersPage(initialEntries: string[] = ['/work-orders']) {
  return renderWithProviders([{ path: '/work-orders', element: <WorkOrdersPage /> }], {
    initialEntries,
    session: validSession,
  });
}

describe('WorkOrdersPage integration (mobile)', () => {
  it('renders seeded work orders from fixtures', async () => {
    renderWorkOrdersPage();

    await waitFor(() => {
      expect(screen.getByTestId('work-orders-list')).toBeInTheDocument();
    });

    expect(screen.getByText('OT-1234')).toBeInTheDocument();
    expect(screen.getByText('OT-1235')).toBeInTheDocument();
    expect(screen.getByText('OT-1236')).toBeInTheDocument();
  });

  it('filters the list when status tab changes', async () => {
    const user = userEvent.setup();
    renderWorkOrdersPage();

    await waitFor(() => {
      expect(screen.getByText('OT-1237')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Pendientes' }));

    await waitFor(() => {
      expect(screen.queryByText('OT-1237')).not.toBeInTheDocument();
    });

    expect(screen.getByText('OT-1234')).toBeInTheDocument();
    expect(screen.getByText('OT-1235')).toBeInTheDocument();
    expect(screen.getByText('OT-1236')).toBeInTheDocument();
  });

  it('shows empty state when search has no matches', async () => {
    const user = userEvent.setup();
    renderWorkOrdersPage();

    await waitFor(() => {
      expect(screen.getByTestId('work-orders-list')).toBeInTheDocument();
    });

    const searchInput = screen.getByRole('searchbox');
    await user.clear(searchInput);
    await user.type(searchInput, 'ZZZ-NOMATCH');

    await waitFor(() => {
      expect(screen.getByTestId('work-orders-empty')).toBeInTheDocument();
    });

    expect(within(screen.getByTestId('work-orders-empty')).getByText(/sin resultados/i)).toBeInTheDocument();
  });
});
