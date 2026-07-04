import { useEffect, useState } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { getApiClient } from '@superion/api-client';

import { AskAssistantModal } from '../../src/components/AskAssistantModal';
import { createTestQueryClient, renderWithProviders } from '../test-utils';

const OT_1234_ID = '770e8400-e29b-41d4-a716-446655440000';

function AskAssistantModalHarness({ onClose }: { onClose: () => void }) {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const api = getApiClient();
      await api.login({ email: 'juan@planta.com', password: 'test1234' });
      const started = await api.startSession(OT_1234_ID);
      if (mounted) {
        setSessionId(started.sessionId);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (!sessionId) {
    return null;
  }

  return <AskAssistantModal sessionId={sessionId} open onClose={onClose} />;
}

describe('AskAssistantModal integration (mobile)', () => {
  it('opens, submits a question, and shows answer with citation', async () => {
    const queryClient = createTestQueryClient();
    const onClose = vi.fn();

    renderWithProviders(
      [
        {
          path: '/',
          element: <AskAssistantModalHarness onClose={onClose} />,
        },
      ],
      {
        initialEntries: ['/'],
        queryClient,
      },
    );

    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByTestId('ask-assistant-modal')).toBeInTheDocument();
    });

    await user.type(screen.getByRole('textbox', { name: /escribe tu duda/i }), '¿cuál es el torque?');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => {
      expect(screen.getByTestId('assistant-answer-card')).toBeInTheDocument();
    });

    expect(screen.getByText(/85 N·m/i)).toBeInTheDocument();
    expect(screen.getByText(/p\. 42/i)).toBeInTheDocument();
  });
});
