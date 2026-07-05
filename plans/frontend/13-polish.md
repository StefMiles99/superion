# FE-13 — Polish (a11y, PWA, i18n, error boundaries, telemetría)

**Estado:** ✅
**Depende de:** FE-01..12
**Desbloquea:** —
**PRD features:** M10.1, M10.2, M10.3, S6, S7, S8
**Stack:** frontend · cross-cutting

## Goal

Pulido final para que las dos apps sean production-ready demo: WCAG 2.1 AA, PWA instalable, i18n con react-i18next, error boundaries, telemetría de uso y errores a Sentry.

## Capas afectadas

### Cross-cutting
- `packages/ui/src/ErrorBoundary.tsx`
- `packages/ui/src/ThemeProvider.tsx`
- `packages/config/src/env.ts` — añadir `VITE_SENTRY_DSN`, `VITE_DEFAULT_THEME`
- `packages/i18n/src/index.ts` — setup react-i18next con `es-ES` default + `en` vacío
- `apps/mobile/public/manifest.webmanifest`
- `apps/desktop/public/manifest.webmanifest`
- `apps/mobile/src/service-worker.ts` — registro
- `apps/desktop/src/service-worker.ts` — registro
- `apps/mobile/src/main.tsx` — bootstrap Sentry
- `apps/desktop/src/main.tsx` — bootstrap Sentry
- Tests E2E con `@axe-core/playwright`

## Switch vía .env

```
VITE_SENTRY_DSN=
VITE_DEFAULT_LOCALE=es-ES
VITE_DEFAULT_THEME=dark|light
VITE_PWA_ENABLED=true
VITE_TELEMETRY_ENABLED=true
VITE_WEB_VITALS_ENDPOINT=
```

## Tests que se escriben PRIMERO

### Unit
1. `packages/i18n/tests/i18n.test.ts` — carga `es-ES`, fallback funciona
2. `packages/ui/tests/ErrorBoundary.test.tsx` — captura error, muestra UI fallback

### Integration
3. `apps/mobile/tests/integration/a11y.test.tsx` — axe-core en LoginPage, WorkOrdersPage, SessionPage
4. `apps/desktop/tests/integration/a11y.test.tsx` — axe-core en LoginPage, DashboardPage, SessionDetailPage

### E2E
5. `apps/mobile/tests/e2e/13-polish.spec.ts` — manifest válido, SW registrado, telemetría envía evento
6. `apps/desktop/tests/e2e/13-polish.spec.ts` — idem
7. Tests con axe-core E2E en páginas críticas

## Implementación mínima para verde

- **a11y**:
  - audit todas las páginas; fix de issues comunes: `aria-label` en icon buttons, `role` en landmarks, contraste de color en modo dark, focus visible.
  - navegación por teclado verificada (Tab/Shift+Tab, Enter, Esc en modales).
  - `prefers-reduced-motion` respetado (desactivar animaciones de VoiceIndicator).
- **PWA**:
  - manifest con name, short_name, icons (192, 512), theme_color, background_color.
  - SW mínimo: cache de assets estáticos (network-first para `/v1/*`, cache-first para assets).
  - prompt de instalación en mobile.
- **i18n**:
  - `react-i18next` con `i18n.changeLanguage('es-ES')` por defecto.
  - todas las strings hardcoded se mueven a `locales/es.json`.
  - `Intl.DateTimeFormat` y `Intl.NumberFormat` según locale.
- **Error boundaries**:
  - Root boundary en cada app que muestra pantalla de error + botón "Recargar".
  - Boundary por página en SessionPage (diferente de Error 500 genérico).
- **Telemetría**:
  - Sentry init en main.tsx.
  - captura errores no manejados.
  - captura `console.error`.
  - evento custom `session_completed`, `photo_uploaded`, `manual_searched`.
  - Web Vitals (LCP, FID, CLS) → endpoint backend `/telemetry`.

## Definition of Done

- [ ] 0 violaciones a11y AA críticas en todas las páginas
- [ ] Manifest válido; instalable en Chrome Android y iOS Safari
- [ ] SW registrado; assets cacheados
- [ ] i18n funciona (cambiar locale recarga con strings en otro idioma, aunque sea stub)
- [ ] Error boundaries capturan y muestran UI fallback
- [ ] Sentry recibe errores en demo
- [ ] Web Vitals se envían
- [ ] E2E Playwright pasa incluyendo axe-core
- [ ] Lighthouse PWA score ≥ 90

## Archivos a crear/modificar

```
frontend/packages/i18n/src/index.ts
frontend/packages/i18n/src/locales/es.json
frontend/packages/i18n/src/locales/en.json
frontend/packages/ui/src/ErrorBoundary.tsx
frontend/packages/ui/src/ThemeProvider.tsx
frontend/packages/config/src/env.ts                       # MODIFY
frontend/apps/mobile/public/manifest.webmanifest
frontend/apps/desktop/public/manifest.webmanifest
frontend/apps/mobile/src/service-worker.ts
frontend/apps/desktop/src/service-worker.ts
frontend/apps/mobile/src/main.tsx                         # MODIFY
frontend/apps/desktop/src/main.tsx                        # MODIFY
frontend/apps/mobile/src/pages/*.tsx                      # MODIFY (i18n strings)
frontend/apps/desktop/src/pages/*.tsx                     # MODIFY (i18n strings)
```

## E2E test scenario

```ts
test('a11y mobile', async ({ page }) => {
  await loginAs(page, 'juan@planta.com');
  await page.goto('/work-orders');
  const results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter(v => v.impact === 'critical');
  expect(critical).toEqual([]);
});

test('pwa manifest mobile', async ({ page }) => {
  const res = await page.request.get('/manifest.webmanifest');
  expect(res.status()).toBe(200);
  const manifest = await res.json();
  expect(manifest.name).toBeTruthy();
  expect(manifest.icons.length).toBeGreaterThan(0);
});

test('telemetría', async ({ page }) => {
  const events: any[] = [];
  await page.exposeFunction('__captureEvent', (e) => events.push(e));
  await page.addInitScript(() => {
    (window as any).__capture = (e: any) => (window as any).__captureEvent(e);
  });
  await loginAs(page, 'juan@planta.com');
  await startSession(page, 'OT-1234');
  await expect.poll(() => events.some(e => e.name === 'session_started')).toBe(true);
});
```

## Notas

- i18n en demo: solo `es-ES` con strings completas; `en` queda stub vacío para mostrar fallback.
- Sentry DSN puede estar vacío en dev → captura local a `console.error`.
- Web Vitals vía `web-vitals` lib.