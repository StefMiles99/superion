# BE-04 — Photos + Mock VLM Validation

**Estado:** ⏳
**Depende de:** BE-03
**Desbloquea:** BE-07
**PRD features:** F4.1, F4.2, F4.3, F4.4, F4.5, F4.6
**Stack:** backend · capas: domain + application + infrastructure + interface

## Goal

Técnico sube foto en paso que lo requiere; backend valida con un `MockVlmValidator` determinista (basado en metadata de la imagen o flag de test), persiste en `evidence_photo` (in-memory + storage in-memory), emite eventos WS `photo.captured`, `photo.validated` o `photo.rejected`. Tras 3 reintentos, emite `photo.escalated`.

## Capas afectadas

### Domain
- `entities/evidence_photo.py` — `EvidencePhoto(id, session_id, step_index, storage_path, captured_at, validation_status, validation_feedback, retries, model_version)`
- `value_objects/photo_status.py` — `PENDING|ACCEPTED|REJECTED|ESCALATED`
- `ports/storage.py` — `IObjectStorage.put(key, bytes) -> url`, `get_signed_url(key, ttl)`
- `ports/services.py` — `IPhotoValidator` (VLM)
- `services/photo_validator.py` — `MockPhotoValidator` (acepta si bytes empieza con magic bytes `accepted`; rechaza si empieza con `rejected`; configurable por query param de test)

### Application
- `use_cases/photos/upload.py` — valida mime/size, genera id, sube a storage, crea `EvidencePhoto(status=pending)`, emite `photo.captured`, dispara validación async, retorna 202
- `use_cases/photos/validate.py` — llama `IPhotoValidator.validate()`, actualiza status, emite `photo.validated|rejected`; si retries >= max → `photo.escalated`
- `use_cases/photos/get.py` — devuelve metadata + signed urls
- `dto/photo.py`

### Infrastructure
- `persistence/in_memory/photo_repository.py`
- `storage/in_memory.py` — `InMemoryObjectStorage` que guarda bytes en `dict` y genera signed URL falsa (`http://localhost:8000/v1/mock-storage/{key}?expires=...`)
- `storage/supabase.py` — stub
- `validators/mock_vlm.py` — `MockPhotoValidator`
- `factories.py` extendidas

### Interface
- `http/routers/photos.py` — `POST /v1/sessions/{id}/photos` (multipart), `GET /v1/photos/{id}`
- `http/routers/mock_storage.py` — `GET /v1/mock-storage/{path}` solo cuando `STORAGE=memory`, sirve bytes
- `http/exception_handlers.py` — añadir `PHOTO_NOT_FOUND`, `PHOTO_VALIDATION_FAILED`, `MANUAL_INVALID_PDF` (placeholder)

## Switch vía .env

```
STORAGE=memory|supabase
PHOTO_VALIDATOR=mock|openrouter_vlm
PHOTO_MAX_SIZE_MB=10
PHOTO_MAX_RETRIES=3
```

## Tests que se escriben PRIMERO

### Unit
1. `tests/unit/domain/test_evidence_photo.py` — transiciones de status, contador retries
2. `tests/unit/application/test_upload_photo.py` — happy path, mime inválido, size > max, sesión no existe
3. `tests/unit/application/test_validate_photo.py` — accepted, rejected, retries++, escalación a 4º intento
4. `tests/unit/domain/test_mock_validator.py` — determinista según magic bytes

### Integration
5. `tests/integration/test_photos_router.py` — multipart upload, signed URL
6. `tests/integration/test_storage_memory.py` — put/get/signed URL
7. `tests/integration/test_ws_photo_events.py` — upload emite photo.captured; validación emite validated|rejected

### E2E
8. `tests/e2e/test_photos_e2e.py` — start session → step requires_photo → POST photo "accepted" → WS photo.validated → POST step_advance → OK; luego POST photo "rejected" → WS photo.rejected con feedback

## Implementación mínima para verde

- `MockPhotoValidator.validate(image_bytes, criteria) -> {ok, feedback, confidence}`:
  - lee primer byte: `b'A'` → accept ("cumple criterio"); `b'R'` → reject ("no se ve X, acércate más"); otros → reject ("imagen no interpretable").
- Storage in-memory: `dict[key, bytes]` + `dict[key, expiry]`; signed URL es un path que el mock-storage router verifica.
- Upload async: usa `asyncio.create_task` para llamar a validator; el endpoint devuelve 202 con `status=pending`.
- Al validar, evento `photo.validated` o `photo.rejected` lleva `feedback` y `retries`.

## Archivos a crear/modificar

```
backend/src/domain/entities/evidence_photo.py
backend/src/domain/value_objects/photo_status.py
backend/src/domain/ports/storage.py
backend/src/domain/ports/services.py                       # MODIFY
backend/src/domain/services/photo_validator.py             # NEW (MockPhotoValidator)
backend/src/application/use_cases/photos/upload.py
backend/src/application/use_cases/photos/validate.py
backend/src/application/use_cases/photos/get.py
backend/src/application/dto/photo.py
backend/src/infrastructure/persistence/in_memory/photo_repository.py
backend/src/infrastructure/persistence/supabase/photo_repository.py       # stub
backend/src/infrastructure/storage/in_memory.py
backend/src/infrastructure/storage/supabase.py                           # stub
backend/src/infrastructure/factories.py                                  # MODIFY
backend/src/interface/http/routers/photos.py
backend/src/interface/http/routers/mock_storage.py
backend/src/interface/http/exception_handlers.py                         # MODIFY
```

## E2E test scenario

```bash
# 1. crear foto "accepted" (primer byte = 'A')
printf 'Acontenido-de-imagen' > /tmp/photo-ok.jpg

# 2. upload
curl -X POST .../v1/sessions/$SID/photos \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/photo-ok.jpg" \
  -F "step_index=3" \
  -F "event_id=$(uuidgen)" \
  -F "criteria=Mostrar sensor"
# esperado: 202 {photo_id, status:"pending"}

# 3. en WS llega photo.captured (seq N) → photo.validated (seq N+1)

# 4. ahora step_advance debería funcionar
curl -X POST .../v1/sessions/$SID/events \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"event_id":"...","type":"step_advance","step_index":3,"payload":{}}'
# esperado: 202

# 5. foto "rejected" → 3 reintentos
for i in 1 2 3; do
  printf 'Rmal' > /tmp/photo-bad.jpg
  curl ... upload ...
done
# esperado: al 4º intento, evento photo.escalated

# 6. get foto con signed URL
curl .../v1/photos/$PID -H "Authorization: Bearer $TOKEN"
# esperado: 200, thumbnail_url + full_url

# 7. descargar
curl "$full_url"
# esperado: bytes de la foto
```

## Definition of Done

- [ ] `pytest -q` pasa 100 %
- [ ] Cumple `integration_contracts.md` §2.4
- [ ] Mock validator determinista según magic bytes (documentado para tests E2E)
- [ ] Storage in-memory sirve bytes por ruta firmada
- [ ] Eventos WS `photo.captured`, `photo.validated`, `photo.rejected`, `photo.escalated` emitidos con shape correcto
- [ ] Retry counter persiste; al llegar a `PHOTO_MAX_RETRIES`, status=escalated
- [ ] Stub `SupabaseObjectStorage` con `NotImplementedError`
- [ ] Sin claves externas necesarias

## Notas

- El feedback del validator debe ser **específico** (no genérico) — el frontend lo muestra al técnico. El mock devuelve strings fijos: "Foto aceptada", "No se ve el sensor, acércate más", "Imagen borrosa, repite".
- Aquí **no** se hace OCR real — eso queda fuera de v1 (per PRD).