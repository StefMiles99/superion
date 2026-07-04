import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { Citation } from '@superion/domain';

import { CitationChip } from '../../src/components/CitationChip';
import { renderWithProviders } from '../test-utils';

const sampleCitation: Citation = {
  manualId: 'manual-comp-1',
  manualVersion: 3,
  page: 42,
  sectionPath: '4. Mantenimiento > 4.3 Válvulas',
  chunkId: 'chunk-42',
  snippet: 'Torque de apriete: 85 N·m ± 5%.',
};

describe('CitationChip integration (mobile)', () => {
  it('opens manual viewer on click', async () => {
    renderWithProviders(
      [
        {
          path: '/',
          element: <CitationChip citation={sampleCitation} />,
        },
      ],
      { initialEntries: ['/'] },
    );

    const user = userEvent.setup();
    await user.click(screen.getByTestId('citation-chip-42'));

    expect(screen.getByTestId('manual-viewer-modal')).toBeInTheDocument();
    expect(screen.getByTestId('manual-viewer-iframe')).toHaveAttribute(
      'src',
      'https://example.com/manual.pdf#page=42',
    );
  });
});
