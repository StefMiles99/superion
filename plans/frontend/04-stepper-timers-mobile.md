# FE-04 — Mobile · Stepper + Timers + ETA

**Estado:** ⏳
**Depende de:** FE-03
**Desbloquea:** FE-05
**PRD features:** M4.2, M4.4, M4.5
**Stack:** frontend mobile · capas: ui + application

## Goal

Stepper visual (progress + lista compacta de pasos restantes), cronómetros del paso actual y total, ETA dinámico basado en ritmo real vs estimado.

## Capas afectadas

### Domain
- `value_objects/duration.ts` — helpers `formatDuration(seconds)`, `computeEta(...)`

### Application
- `hooks/useSessionTimers.ts` — tick cada 1 s mientras sesión activa
- `hooks/useEta.ts` — calcula ETA usando `metrics.avg_step_seconds` o plan

### Infrastructure
- (sin cambios)

### UI
- `components/Stepper.tsx` — barra horizontal + dots
- `components/CompactStepList.tsx` — scroll vertical con current highlighted
- `components/Timer.tsx` — `mm:ss` cronómetro
- `components/EtaBadge.tsx` — `ETA 18m`
- `packages/ui/src/CriticalBadge.tsx`, `PhotoRequiredBadge.tsx`

## Tests que se escriben PRIMERO

### Unit
1. `packages/domain/tests/duration.test.ts` — formato, edge cases (negativos, overflow)
2. `packages/domain/tests/eta.test.ts` — cálculo con ritmo real y plan

### Integration
3. `apps/mobile/tests/integration/Stepper.test.tsx` — render, current highlighted, completed check
4. `apps/mobile/tests/integration/Timer.test.tsx` — avanza con fake timers

### E2E
5. `apps/mobile/tests/e2e/04-timers.spec.ts` — login → sesión → cronómetro avanza visible cada segundo

## Implementación mínima para verde

- `useSessionTimers` usa `useEffect` + `setInterval(1000)`; cleanup en unmount.
- ETA = `remaining_steps * avg_seconds_per_step` (donde `avg` = `total_elapsed / steps_done`, fallback al plan).
- Stepper muestra: `●●●●○○○○○○○○` con current en highlight + label grande "Paso 4 de 12".
- Lista compacta: scroll vertical, paso actual con border-left accent.

## Archivos a crear/modificar

```
frontend/packages/domain/src/value_objects/duration.ts
frontend/apps/mobile/src/hooks/useSessionTimers.ts
frontend/apps/mobile/src/hooks/useEta.ts
frontend/apps/mobile/src/components/Stepper.tsx
frontend/apps/mobile/src/components/CompactStepList.tsx
frontend/apps/mobile/src/components/Timer.tsx
frontend/apps/mobile/src/components/EtaBadge.tsx
frontend/packages/ui/src/CriticalBadge.tsx
frontend/packages/ui/src/PhotoRequiredBadge.tsx
frontend/apps/mobile/src/pages/SessionPage.tsx                # MODIFY
frontend/apps/mobile/src/components/StepCard.tsx              # MODIFY
```

## E2E test scenario

```ts
test('timers and stepper', async ({ page }) => {
  await startSession(page, 'OT-1234');
  await expect(page.getByTestId('total-timer')).toHaveText(/00:0[0-9]/);
  await page.waitForTimeout(2200);
  await expect(page.getByTestId('total-timer')).toHaveText(/00:0[2-9]/);
  await expect(page.getByTestId('eta')).toContainText(/ETA \d+m/);
  await expect(page.getByTestId('stepper')).toBeVisible();
});
```

## Definition of Done

- [ ] Cronómetros avanzan cada segundo
- [ ] ETA se recalcula dinámicamente
- [ ] Stepper marca paso actual, hechos y pendientes
- [ ] Lista compacta de pasos restantes visible y scrollable
- [ ] Badges "Crítico" y "Requiere foto" aparecen cuando corresponde
- [ ] Limpieza de timers en unmount (no leaks)
- [ ] E2E Playwright pasa

## Notas

- Los timers son client-side (`setInterval`); el backend persiste `metrics.avg_step_seconds` que se usa para ETA más preciso (BE-03 lo emite en eventos).