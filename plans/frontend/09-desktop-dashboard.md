# FE-09 — Desktop · Dashboard (sesiones activas)

**Estado:** ⏳
**Depende de:** FE-01
**Desbloquea:** FE-10
**PRD features:** D2.1, D2.2, D2.3, D2.4, D2.5, D8.1, D8.2
**Stack:** frontend desktop · capas: application + infrastructure + ui

## Goal

Supervisor ve lista de sesiones activas en su planta con actualización en vivo vía WS. Click navega a detalle. Acciones rápidas: pausar remoto, agregar nota.

## Capas afectadas

### Domain
- `entities/session.ts` — extiende con `SessionSummary` para listas
- `ports/IApiClient.ts` — extender con `listActiveSessions(plantId)`
- `ports/IWsClient.ts` — canal `admin:sessions` con eventos de lifecycle

### Application
- `hooks/useActiveSessions.ts` — TanStack Query + WS subscription
- `hooks/useRemoteActions.ts` — pause/resume remote, addNote

### Infrastructure
- `InMemoryApiClient` — `listActiveSessions` devuelve 3 sesiones activas + 1 pausada + 1 finalizada reciente
- `InMemoryWsClient` — emite eventos `session.started`, `session.paused`, `session.closed` scripted

### UI
- `pages/DashboardPage.tsx`
- `components/SessionRow.tsx` (tabla densa)
- `components/StatusDot.tsx`
- `components/SessionActionsMenu.tsx` (pausar, reanudar, nota)
- `components/Toast.tsx`

## Tests que se escriben PRIMERO

### Unit
1. `packages/domain/tests/session_summary.test.ts`
2. `packages/api-client/tests/in_memory_active_sessions.test.ts`

### Integration
3. `apps/desktop/tests/integration/DashboardPage.test.tsx` — render, filtro, click navega

### E2E
4. `apps/desktop/tests/e2e/09-dashboard.spec.ts` — login supervisor → ve dashboard → inyectar WS event `session.started` → nueva fila aparece sin reload

## Implementación mínima para verde

- Tabla con columnas: OT, Equipo, Técnico, Paso actual, Tiempo, Último evento, Acciones.
- Filtros arriba: planta (fija al usuario), estado, técnico.
- Click en fila → `/sessions/:id`.
- Botón pausa remoto abre confirmación modal → POST `pause` mutation.
- Toast (esquina inferior derecha) en acciones admin: "Sesión OT-1234 pausada".
- WS reconnect silencioso; indicador sutil en header.

## Archivos a crear/modificar

```
frontend/packages/domain/src/entities/session.ts             # MODIFY
frontend/packages/domain/src/ports/IApiClient.ts            # MODIFY
frontend/packages/domain/src/ports/IWsClient.ts             # MODIFY
frontend/packages/api-client/src/in_memory.ts               # MODIFY
frontend/packages/ws-client/src/in_memory.ts                # MODIFY
frontend/packages/ws-client/src/types.ts                    # MODIFY
frontend/apps/desktop/src/hooks/useActiveSessions.ts
frontend/apps/desktop/src/hooks/useRemoteActions.ts
frontend/apps/desktop/src/pages/DashboardPage.tsx
frontend/apps/desktop/src/components/SessionRow.tsx
frontend/apps/desktop/src/components/StatusDot.tsx
frontend/apps/desktop/src/components/SessionActionsMenu.tsx
frontend/packages/ui/src/Toast.tsx
frontend/apps/desktop/src/routes.tsx                          # MODIFY
```

## E2E test scenario

```ts
test('dashboard live update', async ({ page }) => {
  await loginAs(page, 'maria@planta.com', { role: 'supervisor' });
  await expect(page.getByTestId('sessions-table')).toBeVisible();
  const initialRows = await page.getByTestId('session-row').count();

  // inyectar evento WS
  await page.evaluate(() => {
    (window as any).__mockWs.emit({
      type: 'session.started', seq: 100, session_id: 'new-sess',
      created_at: new Date().toISOString(),
      payload: { session_id: 'new-sess', work_order_id: 'wo-9999', started_at: new Date().toISOString() }
    });
  });

  await expect(page.getByTestId('session-row')).toHaveCount(initialRows + 1);
  await expect(page.getByText('OT-9999')).toBeVisible();

  // remote pause
  await page.getByTestId('session-row').first().getByRole('button', { name: 'Acciones' }).click();
  await page.getByRole('menuitem', { name: 'Pausar' }).click();
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText(/sesión .* pausada/i)).toBeVisible();
});
```

## Definition of Done

- [ ] Dashboard lista sesiones activas
- [ ] Filtros funcionan
- [ ] WS `session.*` actualiza filas sin recargar
- [ ] Click en fila navega a `/sessions/:id`
- [ ] Pausa remota funciona con confirmación
- [ ] Toast aparece tras acciones
- [ ] Reconexión WS silenciosa con indicador
- [ ] E2E Playwright pasa

## Notas

- `admin:sessions` es un canal WS compartido por todos los supervisores; el backend filtrará por plant_id.
- Las acciones remotas quedan en `audit_log` del backend (BE-08).