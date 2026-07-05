import { describe, expect, it } from 'vitest';

import { formatDate, formatNumber, initI18n } from '../src/index';

describe('i18n', () => {
  it('loads es-ES translations', () => {
    const i18n = initI18n('es-ES');
    expect(i18n.t('auth.title')).toBe('Iniciar sesión');
    expect(i18n.t('workOrders.title')).toBe('Órdenes de trabajo');
  });

  it('falls back to es when en key is missing', async () => {
    const i18n = initI18n('en-US');
    await i18n.changeLanguage('en');
    expect(i18n.t('session.start')).toBe('Iniciar mantenimiento');
  });

  it('formats dates and numbers with locale', () => {
    const date = new Date('2026-01-15T12:00:00.000Z');
    expect(formatDate(date, 'es-ES')).toMatch(/2026/);
    expect(formatNumber(1234.5, 'es-ES')).toMatch(/1/);
  });
});
