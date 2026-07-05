# FE-12 — Desktop · Procedure templates editor

**Estado:** ✅
**Depende de:** FE-11
**Desbloquea:** —
**PRD features:** D5.1, D5.2, D5.3, D5.4, D5.5
**Stack:** frontend desktop · capas: application + ui

## Goal

Admin crea/edita plantillas de procedimiento: nombre, manual asociado, lista reordenable de pasos con flags (critical, requires_photo, photo_criteria, estimated_minutes). Validación inline. Versionado y archivo.

## Capas afectadas

### Domain
- `entities/procedure_template.ts` — extiende con shape completo de `Step`
- `ports/IApiClient.ts` — `listProcedureTemplates`, `getProcedureTemplate`, `createProcedureTemplate`, `updateProcedureTemplate`, `archiveProcedureTemplate`

### Application
- `hooks/useProcedureTemplates.ts`
- `hooks/useProcedureTemplateMutations.ts`
- `services/procedure_validator.ts` — validación cliente (indices contiguos, critical ⊆ range)

### Infrastructure
- `InMemoryApiClient` — fixtures: 2 plantillas

### UI
- `pages/ProcedureTemplatesPage.tsx`
- `pages/ProcedureTemplateEditorPage.tsx` (new + edit)
- `components/ProcedureStepList.tsx` (drag&drop reordering)
- `components/ProcedureStepRow.tsx`
- `components/ManualSelector.tsx`

## Tests que se escriben PRIMERO

### Unit
1. `packages/domain/tests/procedure_validator.test.ts` — casos válidos e inválidos
2. `apps/desktop/tests/integration/ProcedureStepList.test.tsx` — drag&drop reorder con @dnd-kit

### Integration
3. `apps/desktop/tests/integration/ProcedureTemplateEditorPage.test.tsx` — crear nueva plantilla, validación inline
4. `apps/desktop/tests/integration/ProcedureTemplatesPage.test.tsx` — list, archive

### E2E
5. `apps/desktop/tests/e2e/12-templates.spec.ts` — admin → crear plantilla → 3 pasos (1 critical, 1 requires_photo) → guardar → ver en lista

## Implementación mínima para verde

- Editor usa `@dnd-kit/sortable` para reordenar.
- Validación inline:
  - indices contiguos 0..N-1
  - `critical_step_indices ⊆ range(N)`
  - `photo_required_step_indices ⊆ range(N)`
  - `estimated_minutes > 0`
- Cada step: input título, textarea descripción, number estimated_minutes, checkbox critical, checkbox requires_photo + input photo_criteria (visible solo si requires_photo).
- Botón "Duplicar" clona plantilla con version+1.
- Botón "Archivar" pide confirmación.

## Archivos a crear/modificar

```
frontend/packages/domain/src/entities/procedure_template.ts
frontend/packages/domain/src/ports/IApiClient.ts            # MODIFY
frontend/packages/api-client/src/in_memory.ts               # MODIFY
frontend/apps/desktop/src/hooks/useProcedureTemplates.ts
frontend/apps/desktop/src/hooks/useProcedureTemplateMutations.ts
frontend/apps/desktop/src/services/procedure_validator.ts
frontend/apps/desktop/src/pages/ProcedureTemplatesPage.tsx
frontend/apps/desktop/src/pages/ProcedureTemplateEditorPage.tsx
frontend/apps/desktop/src/components/ProcedureStepList.tsx
frontend/apps/desktop/src/components/ProcedureStepRow.tsx
frontend/apps/desktop/src/components/ManualSelector.tsx
frontend/apps/desktop/src/routes.tsx                          # MODIFY
```

## E2E test scenario

```ts
test('create procedure template', async ({ page }) => {
  await loginAs(page, 'admin@planta.com', { role: 'rag_admin' });
  await page.goto('/procedures');
  await page.getByRole('button', { name: 'Nueva plantilla' }).click();
  await page.fill('[name=name]', 'MP-Compresor-C3');
  await page.fill('[name=version]', '1');
  await page.selectOption('[name=manualId]', { label: 'Atlas Copco GA-37' });
  await page.fill('[name=estimatedMinutes]', '90');

  // 3 steps
  await page.getByRole('button', { name: 'Añadir paso' }).click();
  await page.getByTestId('step-row-0').fill('[name=title]', 'Preparar área');
  await page.getByRole('button', { name: 'Añadir paso' }).click();
  await page.getByTestId('step-row-1').fill('[name=title]', 'Aislar energía');
  await page.getByTestId('step-row-1').getByLabel('Crítico').check();
  await page.getByTestId('step-row-1').getByLabel('Requiere foto').check();
  await page.getByTestId('step-row-1').fill('[name=photoCriteria]', 'Foto del candado');
  await page.getByRole('button', { name: 'Añadir paso' }).click();
  await page.getByTestId('step-row-2').fill('[name=title]', 'Cerrar V-12');

  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('MP-Compresor-C3')).toBeVisible();
});
```

## Definition of Done

- [x] Lista de plantillas renderiza
- [x] Editor permite crear plantilla con N pasos
- [x] Drag&drop reorder funciona
- [x] Flags critical y requires_photo con criterios
- [x] Validación inline (errores visibles al guardar)
- [x] Duplicar y archivar funcionan
- [x] E2E Playwright pasa

## Notas

- El backend ya valida en BE-02; aquí se duplica para UX inmediata sin round-trip.
- `ManualSelector` es un Select con búsqueda; si no hay manuales, muestra CTA "Sube un manual primero".