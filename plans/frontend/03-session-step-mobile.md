# FE-03 — Mobile · Session + Step view

**Estado:** ⏳
**Depende de:** FE-02
**Desbloquea:** FE-04
**PRD features:** M3.1, M3.2, M3.4, M4.1, M4.3, M4.6 (parcial)
**Stack:** frontend mobile · capas: application + infrastructure + ui

## Goal

Tap en OT abre detalle → botón "Iniciar mantenimiento" → navega a `/sessions/:id` que muestra el paso actual con título, descripción y botones "Siguiente" / "Pausar".

## Capas afectadas

### Domain
- `entities/session.ts` — `Session`, `Step`, `ProcedureTemplate`
- `entities/maintenance_session.ts`
- `ports/IApiClient.ts` — extender con `getWorkOrder`, `startSession`, `getSession`

### Application
- `hooks/useSession.ts` — TanStack Query
- `hooks/useStartSession.ts` — mutation
- `hooks/useSessionActions.ts` — pause/resume/advance

### Infrastructure
- `InMemoryApiClient` — implementar todos los métodos de sesión con fixtures

### UI
- `pages/WorkOrderDetailPage.tsx`
- `pages/SessionPage.tsx`
- `components/StepCard.tsx`
- `components/StepActions.tsx` (botones grandes)

## Tests que se escriben PRIMERO

### Unit
1. `packages/domain/tests/session.test.ts` — invariantes
2. `packages/api-client/tests/in_memory_session.test.ts` — start/get/pause/resume

### Integration
3. `apps/mobile/tests/integration/SessionPage.test.tsx` — render con step fixture, click "Siguiente" avanza

### E2E
4. `apps/mobile/tests/e2e/03-session.spec.ts` — login → tap OT → Iniciar → ve paso → Siguiente (placeholder; el live update llega en FE-05)

## Implementación mínima para verde

- `WorkOrderDetailPage` muestra resumen + botón "Iniciar".
- `startSession` mutation invalida `['work-orders']` y navega a `/sessions/:id`.
- `SessionPage` layout:
  ```
  Header: ◀ OT-1234 [Pausar] ⏱ 00:00
  Card: Paso 1 de 12
         Título
         Descripción
  Footer: [Siguiente paso]
  ```
- Botón "Siguiente" → mutation `step_advance` (con `event_id` UUID). Si backend devuelve 409 (STEP_REQUIRES_PHOTO), muestra banner con mensaje.

## Archivos a crear/modificar

```
frontend/packages/domain/src/entities/session.ts
frontend/packages/domain/src/entities/maintenance_session.ts
frontend/packages/domain/src/ports/IApiClient.ts            # MODIFY
frontend/packages/api-client/src/in_memory.ts               # MODIFY
frontend/apps/mobile/src/hooks/useSession.ts
frontend/apps/mobile/src/hooks/useStartSession.ts
frontend/apps/mobile/src/hooks/useSessionActions.ts
frontend/apps/mobile/src/pages/WorkOrderDetailPage.tsx
frontend/apps/mobile/src/pages/SessionPage.tsx
frontend/apps/mobile/src/components/StepCard.tsx
frontend/apps/mobile/src/components/StepActions.tsx
frontend/apps/mobile/src/routes.tsx                          # MODIFY
```

## E2E test scenario

```ts
test('session flow mobile', async ({ page }) => {
  await loginAs(page, 'juan@planta.com');
  await page.getByText('OT-1234').click();
  await page.getByRole('button', { name: 'Iniciar mantenimiento' }).click();
  await page.waitForURL('**/sessions/**');
  await expect(page.getByText('Paso 1 de 12')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Siguiente paso' })).toBeEnabled();
  // step requires photo
  await page.getByRole('button', { name: 'Siguiente paso' }).click(); // si requiere foto → 409
  await expect(page.getByText(/requiere foto/i)).toBeVisible();
});
```

## Definition of Done

- [ ] Detalle OT renderiza correctamente
- [ ] Start session navega y muestra paso 1
- [ ] Botón "Siguiente" envía `step_advance` con `event_id`
- [ ] Error 409 STEP_REQUIRES_PHOTO se muestra al técnico
- [ ] Botón "Pausar" funciona
- [ ] Mock funciona sin backend
- [ ] E2E Playwright pasa

## Notas

- El timer y ETA llegan en FE-04.
- El indicador de voz llega en FE-05.
- La cámara y foto se conectan en FE-07.