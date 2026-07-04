# FE-08 — Mobile · Report preview + PDF download

**Estado:** ⏳
**Depende de:** FE-05, FE-07
**Desbloquea:** —
**PRD features:** M7.1, M7.2, M7.3, M7.4, M7.5, M7.6, M8.1, M8.2, M8.3, M8.4
**Stack:** frontend mobile · capas: application + ui

## Goal

Vista resumida del reporte en construcción (paso a paso con estado, fotos, hallazgos), descarga de PDF al finalizar, opción de compartir.

## Capas afectadas

### Domain
- `entities/report.ts` — `MaintenanceReport`, `ReportContent`
- `ports/IApiClient.ts` — extender con `getReport(sessionId)`, `getReportPdf(sessionId)`

### Application
- `hooks/useReport.ts` — TanStack Query con suscripción a `report.updated` por WS
- `hooks/useDownloadPdf.ts` — fetch blob + download/share

### Infrastructure
- `InMemoryApiClient` — `getReport` devuelve JSON con progreso ficticio; `getReportPdf` devuelve bytes dummy `%PDF-1.4 ... %%EOF`

### UI
- `pages/ReportPage.tsx`
- `components/ReportSummary.tsx`
- `components/ReportStepList.tsx`
- `components/ReportFindings.tsx`
- `components/ReportPhotoGallery.tsx`
- `components/DownloadPdfButton.tsx` (con Web Share API fallback)

## Tests que se escriben PRIMERO

### Unit
1. `packages/domain/tests/report.test.ts` — invariantes
2. `apps/mobile/tests/integration/useDownloadPdf.test.ts` — descarga bytes, trigger download

### Integration
3. `apps/mobile/tests/integration/ReportPage.test.tsx` — render con report fixture, paso actual marcado

### E2E
4. `apps/mobile/tests/e2e/08-report.spec.ts` — sesión avanzada → abrir reporte → ver pasos + fotos + finalizar → descargar PDF (verificar magic bytes)

## Implementación mínima para verde

- `ReportPage` accesible desde tab en SessionPage o desde header.
- `useReport` se suscribe a WS `report.updated` y aplica diff via `queryClient.setQueryData`.
- `DownloadPdfButton`:
  - fetch blob con `Authorization` header
  - crea `<a download="OT-1234-reporte.pdf">` con URL.createObjectURL
  - si `navigator.share` + `canShare({files})` → usa Web Share API
  - fallback a download
- Step list con iconos: ✓ hecho, ▶ actual, ⚠ saltado, ○ pendiente.

## Archivos a crear/modificar

```
frontend/packages/domain/src/entities/report.ts
frontend/packages/domain/src/ports/IApiClient.ts            # MODIFY
frontend/packages/api-client/src/in_memory.ts               # MODIFY
frontend/apps/mobile/src/hooks/useReport.ts
frontend/apps/mobile/src/hooks/useDownloadPdf.ts
frontend/apps/mobile/src/pages/ReportPage.tsx
frontend/apps/mobile/src/components/ReportSummary.tsx
frontend/apps/mobile/src/components/ReportStepList.tsx
frontend/apps/mobile/src/components/ReportFindings.tsx
frontend/apps/mobile/src/components/ReportPhotoGallery.tsx
frontend/apps/mobile/src/components/DownloadPdfButton.tsx
frontend/apps/mobile/src/pages/SessionPage.tsx              # MODIFY (entry point)
frontend/apps/mobile/src/routes.tsx                          # MODIFY
```

## E2E test scenario

```ts
test('report preview and pdf download', async ({ page }) => {
  await advanceSeveralSteps(page, 'OT-1234', 5);
  await page.getByRole('button', { name: /ver reporte/i }).click();
  await expect(page.getByText('Resumen ejecutivo')).toBeVisible();
  await expect(page.getByText(/paso 1 de 12/i)).toBeVisible();
  await expect(page.getByText(/hallazgos/i)).toBeVisible();

  // finalizar
  await page.getByRole('button', { name: 'Finalizar' }).click();
  await page.getByRole('button', { name: 'Confirmar' }).click();

  // download
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /descargar pdf/i }).click();
  const download = await downloadPromise;
  const path = await download.path();
  const buf = await fs.readFile(path);
  expect(buf.subarray(0, 8).toString()).toContain('%PDF-');
});
```

## Definition of Done

- [ ] Reporte resumido se ve desde SessionPage
- [ ] Lista de pasos con iconos correctos
- [ ] Galería de fotos miniaturas
- [ ] Lista de hallazgos y mediciones
- [ ] Descarga PDF funciona (magic bytes verificado)
- [ ] Web Share API funciona en navegadores compatibles, fallback a download
- [ ] Reporte se actualiza vía WS `report.updated`
- [ ] E2E Playwright pasa

## Notas

- El PDF del backend es `MockReportRenderer` (BE-07); texto plano con header. Suficiente para validar descarga.
- Compartir vía WhatsApp/email no es crítico en demo; el download basta.