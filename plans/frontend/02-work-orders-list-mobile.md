# FE-02 — Mobile · Work Orders list

**Estado:** ⏳
**Depende de:** FE-01
**Desbloquea:** FE-03
**PRD features:** M2.1, M2.2, M2.3, M2.4, M2.5, M2.6
**Stack:** frontend mobile · capas: application + infrastructure + ui

## Goal

Pantalla `/work-orders` lista las OTs del técnico autenticado, con filtros (status, priority, búsqueda), pull-to-refresh, estados vacío/carga/error.

## Capas afectadas

### Domain
- `entities/work_order.ts` — `WorkOrder`, `WorkOrderFilter`, `Paginated<T>`
- `ports/IApiClient.ts` — extender con `listWorkOrders(filter)`

### Application
- `hooks/useWorkOrders.ts` — TanStack Query infinite query
- `useWorkOrderFilters.ts` — Zustand store para filtros persistidos en URL search params

### Infrastructure
- `InMemoryApiClient` — extender con `listWorkOrders` que devuelve 5 fixtures (3 pending, 1 in_progress, 1 completed)

### UI
- `pages/WorkOrdersPage.tsx`
- `components/WorkOrderCard.tsx`
- `components/StatusBadge.tsx`, `PriorityChip.tsx`
- `components/EmptyState.tsx`, `ErrorBanner.tsx`
- `components/FilterBar.tsx`

## Tests que se escriben PRIMERO

### Unit
1. `packages/domain/tests/work_order.test.ts` — invariantes, `WorkOrderFilter` parse
2. `packages/api-client/tests/in_memory_work_orders.test.ts` — filtros, paginación cursor

### Integration
3. `apps/mobile/tests/integration/WorkOrdersPage.test.tsx` — render con fixtures, filtro cambia lista, empty state

### E2E
4. `apps/mobile/tests/e2e/02-work-orders.spec.ts` — login → ver lista → tap filtro → lista cambia

## Implementación mínima para verde

- `useWorkOrders({ status, priority, q })` con TanStack Query, key estable, `staleTime: 30s`.
- Scroll infinito con `IntersectionObserver` sobre sentinel.
- Pull-to-refresh con `react-pull-to-refresh` o gesture manual.
- Filtros sincronizados con `?status=&priority=&q=` en URL.
- Empty state con CTA "No tienes OTs pendientes".
- Error banner con botón "Reintentar".

## Archivos a crear/modificar

```
frontend/packages/domain/src/entities/work_order.ts
frontend/packages/domain/src/ports/IApiClient.ts            # MODIFY
frontend/packages/api-client/src/in_memory.ts               # MODIFY
frontend/apps/mobile/src/hooks/useWorkOrders.ts
frontend/apps/mobile/src/hooks/useWorkOrderFilters.ts
frontend/apps/mobile/src/pages/WorkOrdersPage.tsx
frontend/apps/mobile/src/components/WorkOrderCard.tsx
frontend/apps/mobile/src/components/StatusBadge.tsx
frontend/apps/mobile/src/components/PriorityChip.tsx
frontend/apps/mobile/src/components/EmptyState.tsx
frontend/apps/mobile/src/components/ErrorBanner.tsx
frontend/apps/mobile/src/components/FilterBar.tsx
frontend/apps/mobile/src/routes.tsx                          # MODIFY
```

## E2E test scenario

```ts
test('work orders list mobile', async ({ page }) => {
  await loginAs(page, 'juan@planta.com');
  await expect(page.getByText('OT-1234')).toBeVisible();
  await expect(page.getByText('OT-1235')).toBeVisible();
  // filter
  await page.getByRole('button', { name: 'Pendientes' }).click();
  await expect(page.getByText('OT-1234')).toBeVisible();
  // search
  await page.fill('[name=search]', '1236');
  await expect(page.getByText('OT-1236')).toBeVisible();
});
```

## Definition of Done

- [ ] Lista renderiza con mocks (5 OTs) y con backend real
- [ ] Filtros funcionan y persisten en URL
- [ ] Búsqueda por código/tag funciona
- [ ] Pull-to-refresh recarga
- [ ] Empty state se muestra cuando no hay resultados
- [ ] Error banner aparece si falla la carga
- [ ] Skeletons durante carga inicial
- [ ] E2E Playwright pasa

## Notas

- Las tarjetas son `touch-friendly` (≥ 48 dp alto) — uso con guantes.
- En esta pantalla todavía no se navega a detalle; eso entra en FE-03.