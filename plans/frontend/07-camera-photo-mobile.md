# FE-07 — Mobile · Camera + Photo flow

**Estado:** ✅
**Depende de:** FE-05
**Desbloquea:** —
**PRD features:** M6.1, M6.2, M6.3, M6.4, M6.5, M6.6, M6.7
**Stack:** frontend mobile · capas: application + infrastructure + ui

## Goal

Cuando el paso requiere foto, UI dispara cámara; preview con botón "Enviar"/"Re-tomar"; mientras valida muestra overlay "Validando…"; si rechaza muestra feedback específico + retry; cola offline si no hay red.

## Capas afectadas

### Domain
- `entities/photo.ts` — `EvidencePhoto`, `PhotoStatus`
- `ports/IApiClient.ts` — extender con `uploadPhoto(sessionId, file, stepIndex, criteria)`
- `ports/IStorage.ts` — interfaz para cola offline (IndexedDB)

### Application
- `hooks/useUploadPhoto.ts` — mutation con optimistic + retry
- `hooks/usePhotoQueue.ts` — procesa cola cuando vuelve la red
- `services/photo_queue.ts` — IndexedDB wrapper

### Infrastructure
- `InMemoryApiClient` — `uploadPhoto` valida con magic bytes (`A` → accept, `R` → reject)
- `service-worker.ts` (nuevo) — background sync de cola

### UI
- `pages/CameraPage.tsx` — fullscreen con `<input type="file" capture="environment">` + overlay de instrucciones
- `components/PhotoPreview.tsx`
- `components/PhotoValidationOverlay.tsx` (validating / accepted / rejected)
- `components/PhotoThumbnail.tsx` (en StepCard)

## Switch vía .env

```
VITE_PHOTO_MAX_SIZE_MB=10
VITE_PHOTO_MAX_RETRIES=3
```

## Tests que se escriben PRIMERO

### Unit
1. `packages/domain/tests/photo.test.ts` — invariantes
2. `apps/mobile/tests/integration/photo_queue.test.ts` — IndexedDB add/list/remove (con fake-indexeddb)
3. `apps/mobile/tests/integration/PhotoValidationOverlay.test.tsx` — estados visuales

### Integration
4. `apps/mobile/tests/integration/upload_photo.test.ts` — upload OK, rejected con feedback, retries++

### E2E
5. `apps/mobile/tests/e2e/07-camera.spec.ts` — step requires_photo → tap → mock camera → upload "A" → accepted; upload "R" 3 veces → escalated

## Implementación mínima para verde

- `CameraPage` usa `<input type="file" accept="image/*" capture="environment">`; en desktop/mobile-test usa `data-testid="mock-camera"` que permite inyectar bytes via `page.setInputFiles()`.
- Preview muestra la foto + 2 botones: "Re-tomar" (limpia input) y "Enviar".
- Mientras upload: overlay con spinner + label "Validando foto…".
- Al recibir `photo.validated` (success) o `photo.rejected` (con feedback): overlay cambia.
- Rechazo: feedback se muestra en banner rojo + botón "Re-tomar".
- Cola offline: si `navigator.onLine === false`, foto se guarda en IndexedDB y UI muestra badge "Sincronizando…".
- Service Worker (básico): registra listener `sync` para procesar cola.

## Archivos a crear/modificar

```
frontend/packages/domain/src/entities/photo.ts
frontend/packages/domain/src/ports/IApiClient.ts            # MODIFY
frontend/packages/domain/src/ports/IStorage.ts
frontend/packages/api-client/src/in_memory.ts               # MODIFY
frontend/apps/mobile/src/hooks/useUploadPhoto.ts
frontend/apps/mobile/src/hooks/usePhotoQueue.ts
frontend/apps/mobile/src/services/photo_queue.ts
frontend/apps/mobile/src/pages/CameraPage.tsx
frontend/apps/mobile/src/components/PhotoPreview.tsx
frontend/apps/mobile/src/components/PhotoValidationOverlay.tsx
frontend/apps/mobile/src/components/PhotoThumbnail.tsx
frontend/apps/mobile/public/service-worker.ts               # NEW
frontend/apps/mobile/src/pages/SessionPage.tsx              # MODIFY (entry point)
```

## E2E test scenario

```ts
test('photo accepted', async ({ page }) => {
  await startSessionWithPhotoRequired(page, 'OT-1234');
  // step 3 requires_photo
  await page.getByTestId('mock-camera').setInputFiles({
    name: 'ok.jpg', mimeType: 'image/jpeg',
    buffer: Buffer.from('Acontenido-de-imagen')
  });
  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(page.getByText(/validando/i)).toBeVisible();
  await expect(page.getByText(/foto aceptada/i)).toBeVisible({ timeout: 3000 });
  // advance ahora OK
  await page.getByRole('button', { name: 'Siguiente paso' }).click();
  await expect(page.getByText('Paso 4 de 12')).toBeVisible();
});

test('photo rejected then accepted', async ({ page }) => {
  await startSessionWithPhotoRequired(page, 'OT-1234');
  for (let i = 0; i < 2; i++) {
    await page.getByTestId('mock-camera').setInputFiles({
      name: 'bad.jpg', mimeType: 'image/jpeg',
      buffer: Buffer.from('Rmal')
    });
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.getByText(/acércate más/i)).toBeVisible();
    await page.getByRole('button', { name: 'Re-tomar' }).click();
  }
  // 3rd try OK
  await page.getByTestId('mock-camera').setInputFiles({
    name: 'ok.jpg', mimeType: 'image/jpeg',
    buffer: Buffer.from('Aok')
  });
  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(page.getByText(/foto aceptada/i)).toBeVisible();
});
```

## Definition of Done

- [ ] Cámara se abre cuando step `requires_photo`
- [ ] Preview antes de enviar
- [ ] Overlay "Validando…" mientras sube
- [ ] Accepted → check verde + vuelve a SessionPage
- [ ] Rejected → feedback específico + retry
- [ ] Contador de retries visible; tras 3, banner de escalación
- [ ] Cola offline funciona (IndexedDB + Service Worker)
- [ ] Mock con magic bytes "A"/"R" funciona
- [ ] E2E Playwright pasa

## Notas

- En iOS Safari, `capture="environment"` abre cámara nativa; en Android Chrome también. Para tests Playwright se usa file input directo.
- El Service Worker mínimo: cache de assets + background sync. No push notifications en demo.