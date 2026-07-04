# FE-11 — Desktop · Manuals RAG admin

**Estado:** ⏳
**Depende de:** FE-10
**Desbloquea:** FE-12
**PRD features:** D4.1, D4.2, D4.3, D4.4, D4.5, D4.6
**Stack:** frontend desktop · capas: application + ui

## Goal

Admin RAG gestiona biblioteca de manuales: lista, upload por drag&drop, preview, acciones (reindex, download, archive), búsqueda full-text dentro del manual, estado de indexación en vivo.

## Capas afectadas

### Domain
- `entities/manual.ts` — `Manual`, `ManualStatus`, `IndexStatus`
- `ports/IApiClient.ts` — extender con `listManuals`, `uploadManual`, `getManual`, `reindexManual`, `archiveManual`, `searchManual`

### Application
- `hooks/useManuals.ts` — TanStack Query
- `hooks/useUploadManual.ts` — mutation con progress
- `hooks/useManualSearch.ts` — debounced search

### Infrastructure
- `InMemoryApiClient` — fixtures: 2 manuales (1 indexed, 1 indexing)

### UI
- `pages/ManualsPage.tsx`
- `pages/ManualUploadPage.tsx`
- `pages/ManualDetailPage.tsx` (preview + búsqueda)
- `components/ManualTable.tsx`
- `components/Dropzone.tsx`
- `components/UploadProgress.tsx`
- `components/PdfViewer.tsx` (iframe o react-pdf)
- `components/IndexStatusBadge.tsx`

## Tests que se escriben PRIMERO

### Unit
1. `packages/domain/tests/manual.test.ts`
2. `apps/desktop/tests/integration/Dropzone.test.tsx` — drag&drop + click fallback
3. `apps/desktop/tests/integration/PdfViewer.test.tsx` — render

### Integration
4. `apps/desktop/tests/integration/ManualsPage.test.tsx` — list, filter, acciones
5. `apps/desktop/tests/integration/ManualUploadPage.test.tsx` — submit, progress

### E2E
6. `apps/desktop/tests/e2e/11-manuals.spec.ts` — login admin → upload PDF dummy → indexa → search → reindex

## Implementación mínima para verde

- `Dropzone` con react-dropzone; acepta solo `application/pdf`, max 50 MB.
- `UploadProgress` muestra barra + estado (`pending → uploading → indexing → indexed | error`); actualiza vía WS `admin:manuals` (`manual.index_status_changed`).
- `PdfViewer` con `<iframe src={signed_url}>`; placeholder en mock.
- `searchManual` con debounce 300 ms; resultados en lista lateral con highlight del término.
- `archiveManual` abre confirmación; `archive` mutation invierte botón a "Restaurar" (no implementado en backend; muestra mensaje).

## Archivos a crear/modificar

```
frontend/packages/domain/src/entities/manual.ts
frontend/packages/domain/src/ports/IApiClient.ts            # MODIFY
frontend/packages/api-client/src/in_memory.ts               # MODIFY
frontend/apps/desktop/src/hooks/useManuals.ts
frontend/apps/desktop/src/hooks/useUploadManual.ts
frontend/apps/desktop/src/hooks/useManualSearch.ts
frontend/apps/desktop/src/pages/ManualsPage.tsx
frontend/apps/desktop/src/pages/ManualUploadPage.tsx
frontend/apps/desktop/src/pages/ManualDetailPage.tsx
frontend/apps/desktop/src/components/ManualTable.tsx
frontend/apps/desktop/src/components/Dropzone.tsx
frontend/apps/desktop/src/components/UploadProgress.tsx
frontend/apps/desktop/src/components/PdfViewer.tsx
frontend/apps/desktop/src/components/IndexStatusBadge.tsx
frontend/apps/desktop/src/routes.tsx                          # MODIFY
```

## E2E test scenario

```ts
test('manual upload and search', async ({ page }) => {
  await loginAs(page, 'admin@planta.com', { role: 'rag_admin' });
  await page.goto('/manuals');
  await page.getByRole('button', { name: 'Subir manual' }).click();
  // upload PDF dummy
  await page.getByTestId('dropzone').setInputFiles({
    name: 'manual.pdf', mimeType: 'application/pdf',
    buffer: Buffer.from('Pagina 1\n\fPagina 2\n\fPagina 3')
  });
  await page.fill('[name=title]', 'Atlas Copco GA-37');
  await page.fill('[name=assetModel]', 'Atlas Copco GA-37');
  await page.getByRole('button', { name: 'Subir' }).click();
  await expect(page.getByText(/indexando/i)).toBeVisible();
  await expect(page.getByText(/indexado/i)).toBeVisible({ timeout: 5000 });

  // search
  await page.getByRole('link', { name: 'Atlas Copco GA-37' }).click();
  await page.fill('[name=search]', 'pagina');
  await expect(page.getByText('Pagina 1')).toBeVisible();
});
```

## Definition of Done

- [ ] Lista de manuales renderiza con status badges
- [ ] Drag&drop funciona con PDF
- [ ] Progress bar muestra indexación en vivo
- [ ] PDF viewer abre con signed URL
- [ ] Búsqueda full-text con debounce
- [ ] Reindex funciona
- [ ] Archive pide confirmación
- [ ] E2E Playwright pasa

## Notas

- `react-pdf` (opcional) si queremos highlight en el viewer; si no, iframe basta.
- El backend emite `manual.index_status_changed` por WS canal `admin:manuals` (BE-05).