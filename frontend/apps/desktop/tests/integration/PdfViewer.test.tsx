import { I18nextProvider } from 'react-i18next';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { initI18n } from '@superion/i18n';

import { PdfViewer } from '../../src/components/PdfViewer';

function renderWithI18n(ui: React.ReactElement) {
  const i18n = initI18n('es-ES');
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe('PdfViewer integration', () => {
  it('renders placeholder for mock URLs', () => {
    renderWithI18n(<PdfViewer url="mock://manuals/test-id" title="Manual de prueba" />);

    expect(screen.getByTestId('pdf-viewer-placeholder')).toBeInTheDocument();
    expect(screen.queryByTestId('pdf-viewer')).not.toBeInTheDocument();
  });

  it('renders iframe for signed URLs', () => {
    renderWithI18n(
      <PdfViewer
        url="https://storage.example.com/manuals/test.pdf?token=abc"
        title="Manual de prueba"
      />,
    );

    const iframe = screen.getByTestId('pdf-viewer');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute(
      'src',
      'https://storage.example.com/manuals/test.pdf?token=abc',
    );
  });
});
