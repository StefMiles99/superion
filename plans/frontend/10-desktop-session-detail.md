# FE-10 — Desktop · Session detail + live report

**Estado:** ⏳
**Depende de:** FE-09
**Desbloquea:** FE-11, FE-12
**PRD features:** D3.1, D3.2, D3.3, D3.4, D3.5, D3.6
**Stack:** frontend desktop · capas: application + ui

## Goal

Vista detalle de sesión con layout 2 columnas: izquierda lista de sesiones (fija), derecha panel principal con reporte formándose en vivo, galería de fotos, hallazgos, y stream de eventos. Acciones admin (pausar remoto, forzar advance, nota).

## Capas afectadas

### Domain
- (extiende tipos existentes)
- `ports/IApiClient.ts` — `addAdminNote(sessionId, text)`, `forceAdvance(sessionId, stepIndex)`

### Application
- `hooks/useSessionDetail.ts` — combina session + report + events
- `hooks/useAdminActions.ts` — pause/resume remote, force advance, add note

### UI
- `pages/SessionDetailPage.tsx`
- `components/ReportViewer.tsx` (panel principal con tabs: Resumen / Procedimiento / Fotos / Hallazgos)
- `components/EventStream.tsx` (panel inferior con scroll virtual)
- `components/EventItem.tsx` (utterance, command, assistant.answer con citation)
- `components/AdminActionBar.tsx`
- `components/TimelineScrubber.tsx` (scrubber temporal)

## Tests que se escriben PRIMERO

### Unit
1. `apps/desktop/tests/integration/ReportViewer.test.tsx` — render secciones, tabs
2. `apps/desktop/tests/integration/EventStream.test.tsx` — render eventos, scroll infinito

### Integration
3. `apps/desktop/tests/integration/SessionDetailPage.test.tsx` — layout, click en evento resalta en reporte

### E2E
4. `apps/desktop/tests/e2e/10-session-detail.spec.ts` — supervisor login → dashboard → click sesión → ve reporte live → inyectar WS `event.appended` → stream actualiza → inyectar `assistant.answered` → chip citation visible → admin pausa remoto

## Implementación mínima para verde

- Layout CSS grid 2 cols (sessions 280px + main 1fr).
- Tabs en panel principal: Resumen / Procedimiento / Fotos / Hallazgos / Medidas.
- EventStream con `react-virtuoso` para scroll virtual; item por evento con timestamp + icon por tipo.
- `assistant.answered` muestra respuesta + chip de citation que abre modal con PDF (placeholder).
- AdminActionBar con botones: Pausar / Reanudar / Forzar siguiente / Agregar nota.
- TimelineScrubber horizontal: markers según eventos clave; click → salta el stream a ese evento.

## Archivos a crear/modificar

```
frontend/packages/domain/src/ports/IApiClient.ts            # MODIFY
frontend/packages/api-client/src/in_memory.ts               # MODIFY
frontend/apps/desktop/src/hooks/useSessionDetail.ts
frontend/apps/desktop/src/hooks/useAdminActions.ts
frontend/apps/desktop/src/pages/SessionDetailPage.tsx
frontend/apps/desktop/src/components/ReportViewer.tsx
frontend/apps/desktop/src/components/EventStream.tsx
frontend/apps/desktop/src/components/EventItem.tsx
frontend/apps/desktop/src/components/AdminActionBar.tsx
frontend/apps/desktop/src/components/TimelineScrubber.tsx
frontend/apps/desktop/src/routes.tsx                          # MODIFY
```

## E2E test scenario

```ts
test('session detail live', async ({ page }) => {
  await loginAs(page, 'maria@planta.com', { role: 'supervisor' });
  await page.getByTestId('session-row').first().click();
  await page.waitForURL('**/sessions/**');

  // tabs
  await page.getByRole('tab', { name: 'Procedimiento' }).click();
  await expect(page.getByText('Paso 1')).toBeVisible();

  // inject event
  await page.evaluate(() => {
    (window as any).__mockWs.emit({
      type: 'event.appended', seq: 50, session_id: 'sess-1',
      created_at: new Date().toISOString(),
      payload: { type: 'utterance', step_index: 0, text: 'ya cerré la válvula' }
    });
  });
  await expect(page.getByText(/ya cerré la válvula/i)).toBeVisible();

  // admin pause
  await page.getByRole('button', { name: 'Pausar remoto' }).click();
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText(/sesión .* pausada/i)).toBeVisible();
});
```

## Definition of Done

- [ ] Layout 2 columnas funciona
- [ ] Reporte muestra todas las secciones (Resumen, Procedimiento, Fotos, Hallazgos, Medidas)
- [ ] Stream actualiza vía WS sin recargar
- [ ] Citations de assistant.answered abren PDF
- [ ] Acciones admin funcionan (pausar, reanudar, forzar, nota)
- [ ] Timeline scrubber funcional
- [ ] E2E Playwright pasa

## Notas

- `forceAdvance` requiere rol supervisor + razón; el backend registra en audit_log.
- Scroll virtual del stream es importante si hay > 1000 eventos; usar `react-virtuoso`.