import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from '../src/ErrorBoundary';

function BrokenChild(): never {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  it('captures render errors and shows fallback UI with reload', async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload },
    });

    render(
      <ErrorBoundary
        labels={{
          title: 'Algo salió mal',
          message: 'Error inesperado',
          reload: 'Recargar',
        }}
      >
        <BrokenChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Algo salió mal' })).toBeInTheDocument();
    expect(screen.getByText('Error inesperado')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Recargar' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
