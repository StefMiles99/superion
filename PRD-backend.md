# PRD — Backend (FastAPI)

**Subproyecto:** Backend SUPERION
**Stack:** Python 3.12 · FastAPI · LangGraph · Supabase (Postgres + pgvector + Storage) · OpenRouter · ElevenLabs (vía webhook)
**Consumidores:** Mobile web, Desktop web, ElevenLabs Agents (webhooks)
**Documentos relacionados:** `PRD.md`, `integration_contracts.md`

---

## 1. Resumen

Servicio backend único que expone la API REST + WebSocket del producto, persiste estado, orquesta LangGraph, recibe webhooks de ElevenLabs, gestiona Storage (manuales, fotos, PDFs) y aplica políticas RLS. Es el **único** actor con acceso directo a Supabase y OpenRouter.

**Reglas de oro:**
- No exponer Supabase ni OpenRouter directamente a frontend.
- No exponer LangGraph directamente a frontend; siempre vía REST/WS.
- Toda mutación sensible pasa por RLS.
- Audio nunca se persiste sin consentimiento explícito (config `AUDIO_RETENTION_DAYS`).

---

## 2. Alcance

### 2.1 In-scope
- API REST versionada (`/v1`)
- WebSocket con catch-up por seq
- Auth proxy + validación JWT
- Orquestación de LangGraph (state machine, RAG, generación de reporte)
- Webhook receiver ElevenLabs con verificación de firma
- Upload + validación de fotos (orquestando VLM vía OpenRouter)
- Generación de PDF de reporte
- Signed URLs para Storage
- Audit log
- Observabilidad (logs, traces, métricas)
- Migraciones de DB versionadas
- Mock server para dev paralelo de frontend
- Contract tests

### 2.2 Out-of-scope
- UI (lo hace frontend)
- Voice/ASR/TTS (lo hace ElevenLabs)
- Embeddings/training (delegado a OpenRouter)
- Lógica de visión (delegado a VLM en OpenRouter)

---

## 3. Arquitectura interna

```
backend/
├── app/
│   ├── main.py                  # FastAPI app, routers, middleware
│   ├── config.py                # settings (env)
│   ├── deps/                    # DI: db, auth, current_user
│   ├── routers/
│   │   ├── auth.py
│   │   ├── work_orders.py
│   │   ├── sessions.py
│   │   ├── photos.py
│   │   ├── reports.py
│   │   ├── manuals.py
│   │   ├── procedure_templates.py
│   │   ├── assets.py
│   │   ├── health.py
│   │   └── webhooks/
│   │       └── elevenlabs.py
│   ├── ws/
│   │   ├── manager.py           # conexión, salas, broadcast
│   │   └── handlers.py
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── work_order_service.py
│   │   ├── session_service.py
│   │   ├── event_service.py     # idempotency, persistencia
│   │   ├── photo_service.py     # upload, validate (VLM), storage
│   │   ├── report_service.py    # json, PDF gen
│   │   ├── manual_service.py    # upload, chunking, indexing
│   │   ├── rag_service.py       # retrieval hybrid, rerank
│   │   ├── pdf_renderer.py      # jinja2 + weasyprint
│   │   ├── langgraph_client.py  # proxy al state machine
│   │   ├── elevenlabs_client.py # verificación firma + tool calls
│   │   ├── openrouter_client.py # LLM + embed
│   │   └── storage.py           # signed urls
│   ├── models/                  # pydantic schemas (mirror de /contracts/schemas)
│   ├── schemas/                 # request/response pydantic
│   ├── errors.py                # catálogo de errores
│   ├── middleware/
│   │   ├── correlation.py
│   │   ├── logging.py
│   │   └── rate_limit.py
│   └── observability/
│       ├── tracing.py
│       └── metrics.py
├── supabase/
│   ├── migrations/              # SQL versionadas
│   ├── policies/                # RLS
│   └── functions/               # edge functions si hace falta
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── contract/                # contra openapi.yaml
│   └── load/
├── mock_server/                 # FastAPI standalone, dev
├── Dockerfile
├── pyproject.toml
└── .env.example
```

---

## 4. Features por módulo

### 4.1 Auth (`/v1/auth/*`)
- **F1.1 Login** email/password vía Supabase Auth; emite `access_token` (JWT) + `refresh_token`. Valida que user existe en `user` table y tiene rol.
- **F1.2 Refresh** rotación de tokens (Supabase Auth).
- **F1.3 Logout** revoca refresh token server-side.
- **F1.4 Me** devuelve perfil + claims custom (`plant_id`, `role`).
- **F1.5 Validación JWT** middleware global: decodifica, valida `aud`, `exp`, extrae `sub` y claims custom, expone `request.state.user`.
- **F1.6 Roles**: `technician`, `supervisor`, `rag_admin`; gate por dependency.

### 4.2 Work Orders (`/v1/work-orders/*`)
- **F2.1 List** paginado con filtros (status, assignee, priority, asset). RLS ya filtra por asignación / planta.
- **F2.2 Get** detalle completo.
- **F2.3 Start** valida que OT está `pending` o `paused`, no tiene sesión activa, llama a LangGraph para crear thread, devuelve `session_id` + `procedure_template` + `websocket_url`.
- **F2.4 Update status** (supervisor) — `pause`, `cancel` con audit log.

### 4.3 Sessions (`/v1/sessions/*`)
- **F3.1 Get** estado actual + métricas + `next_seq`.
- **F3.2 Events catch-up** `GET /events?since_seq=X` para clientes que perdieron WS.
- **F3.3 Post events** (no-voz): comandos UI explícitos, measurements, findings. Aplica idempotency por `event_id`.
- **F3.4 Pause/Resume** cambia estado sesión; LangGraph persiste checkpoint.
- **F3.5 Finalize** cierra sesión, fuerza generación de PDF, marca OT `completed`.
- **F3.6 Admin override** (supervisor): forzar `pause`, `abort`, agregar nota, forzar `next_step` con `force=true` (queda en audit log).

### 4.4 Photos (`/v1/sessions/{id}/photos`)
- **F4.1 Upload** multipart; valida mime (`jpeg/png/webp`), tamaño (max 10 MB), magic bytes. Sube a Storage bucket `evidence-photos`. Crea `evidence_photo` row con `status=pending`.
- **F4.2 Trigger VLM validation** con criterios del paso. Output `{ok, feedback, confidence}`. Actualiza row.
- **F4.3 Emit WS events** `photo.captured` (al subir) + `photo.validated` o `photo.rejected` (al validar).
- **F4.4 Retry policy** hasta 3; al 4º intento emite evento `photo.escalated` a sala (supervisor puede intervenir).
- **F4.5 Get photo** devuelve signed URLs (thumb + full, TTL 15 min).
- **F4.6 Caption auto-generada** al validar (para incluir en reporte).

### 4.5 Reports (`/v1/sessions/{id}/report*`)
- **F5.1 Get report JSON** estructura completa (header, summary, procedure, findings, measurements, photos).
- **F5.2 Live update** orquestado por LangGraph (regenera summary en hitos: cierre de paso, foto aceptada, hallazgo severo). Cada cambio persiste en `maintenance_report.content` + emite `report.updated` por WS con diff.
- **F5.3 Generate PDF** server-side: Jinja2 → HTML → WeasyPrint. Páginas: cover + tabla de pasos + fotos a página completa.
- **F5.4 Signed URL** TTL 15 min para descarga. Hash SHA256 en header `X-Document-SHA256`.
- **F5.5 Versioning** del JSON (`version` int, monotonico) — permite ver historial.
- **F5.6 Derived work orders** opcional: cuando un hallazgo tiene `severity=high`, sugiere creación de OT correctiva vía POST a `/work-orders` con `parent_wo_id`.

### 4.6 Manuals / RAG (`/v1/manuals/*`)
- **F6.1 List/Get** manuales activos + archivados (con permisos por rol).
- **F6.2 Upload PDF** multipart (max 50 MB); valida que es PDF real; calcula hash; sube a Storage bucket `manuals`; crea row con `status=pending`.
- **F6.3 Async indexing** (job background, no bloquea request):
  1. Extracción con PyMuPDF (texto + imágenes)
  2. Limpieza (drop headers/footers repetidos)
  3. Chunking jerárquico (512 tokens, overlap 64, mantener section_path)
  4. Embeddings vía OpenRouter (batch, con retries)
  5. INSERT en `manual_chunk`
  6. Update `manual.index_status=indexed` + `chunk_count`
- **F6.4 Reindex** fuerza reprocesamiento (nueva versión del mismo modelo).
- **F6.5 Versionado**: nuevo upload con `replaces_manual_id` archiva el anterior; search solo usa `active`.
- **F6.6 Delete** soft-delete (status=archived). Mantiene chunks para auditoría.
- **F6.7 Download** signed URL (TTL 15 min).

### 4.7 Procedure Templates (`/v1/procedure-templates/*`)
- **F7.1 CRUD básico** (list, get, create, update, archive).
- **F7.2 Validación** de shape: indices contiguos, `critical_step_indices ⊆ range(len(steps))`, `photo_required_step_indices ⊆ range(len(steps))`, `estimated_minutes > 0`.
- **F7.3 Relación** con `manual_id`: valida que existe y está `active`.
- **F7.4 Versionado**: crear nueva versión invalida uso en OTs no iniciadas.

### 4.8 Assets (`/v1/assets/*`)
- **F8.1 List/Get** con join a manual activo.
- **F8.2 Read-only en v1** (admin crea via seed/migration).

### 4.9 WebSocket (`/v1/ws/sessions/{id}`)
- **F9.1 Auth** vía query `?token=`.
- **F9.2 Salas** por `session:{id}`; múltiples clientes pueden unirse (técnico + supervisores).
- **F9.3 Broadcast** de eventos emitidos por LangGraph/ElevenLabs/servicios internos.
- **F9.4 Replay** desde `last_seq` en conexión.
- **F9.5 Heartbeat** ping/pong cada 30 s.
- **F9.6 Backpressure**: si cliente lento, descartar con log; reconexión recomendada.
- **F9.7 Channel admin** `admin:manuals` para eventos de indexación.

### 4.10 Webhook ElevenLabs (`/v1/elevenlabs/webhooks/*`)
- **F10.1 Verificación firma** HMAC SHA256 con `ELEVENLABS_WEBHOOK_SECRET`.
- **F10.2 Replay protection** (timestamp window 5 min).
- **F10.3 Eventos manejados**:
  - `conversation.started` → crear/asociar sesión
  - `utterance.final` → enviar a LangGraph para clasificación
  - `tool.called` → log + auditoría
  - `tool.responded` → log
  - `turn.speaker_changed` → emitir WS a desktop (visual)
  - `conversation.ended` → pausar/finalizar según reason
  - `error` → log + alerta
- **F10.4 Tools endpoint** `POST /v1/elevenlabs/tools/{tool_name}`: invoca LangGraph con auth del session_id del payload, devuelve respuesta con shape del tool.

### 4.11 LangGraph client
- **F11.1 Proxy stateless** a LangGraph con `thread_id = session_id`.
- **F11.2 Invocación de tools** con argumentos validados contra schema.
- **F11.3 Recepción de eventos** que LangGraph emite (state changes, tool results) y propagación a WS.
- **F11.4 Manejo de timeout** (tool call > 30s → 503 `LANGGRAPH_UNAVAILABLE`).
- **F11.5 Checkpointer** Postgres usa tabla `langgraph_checkpoints` (managed por LangGraph lib).
- **F11.6 Versionado de prompts** en `langgraph/prompts/*.md` con changelog.

### 4.12 OpenRouter client
- **F12.1 Cliente unificado** con `AsyncOpenAI` apuntando a OpenRouter (`https://openrouter.ai/api/v1`).
- **F12.2 Modelos configurables** vía `config/models.yaml`.
- **F12.3 Retries**: 3 con backoff 1/2/4 s; respeta `Retry-After`.
- **F12.4 Fallbacks** definidos por uso (router → haiku; embed → voyage-3).
- **F12.5 Logging de tokens** y costo estimado en cada call.
- **F12.6 Streaming opcional** para respuestas largas (TTS prefiere chunks).

### 4.13 Storage service
- **F13.1 Signed URL helper** con TTL configurable.
- **F13.2 Path helpers** estrictos (evita traversal): `manuals/{plant_id}/{manual_id}/{version}.pdf`, etc.
- **F13.3 Lifecycle** de buckets: docs en `infra/storage.md`.

### 4.14 Observability
- **F14.1 Logs estructurados** JSON con `correlation_id`, `user_id`, `session_id`, `route`, `status`, `duration_ms`.
- **F14.2 OpenTelemetry** traces: FastAPI → LangGraph → OpenRouter → Supabase; export OTLP.
- **F14.3 Métricas Prometheus**:
  - `http_requests_total{route, status}`
  - `http_request_duration_seconds{route}` (histogram)
  - `ws_connections_active`
  - `langgraph_tool_calls_total{tool, status}`
  - `openrouter_tokens_total{model, direction}`
  - `openrouter_cost_usd_total{model}`
  - `photos_validated_total{outcome}`
  - `rag_citations_count` (histogram)
- **F14.4 Dashboards** Grafana: latencia voz, latencia RAG, fotos rechazadas, sesiones concurrentes, costo OpenRouter.
- **F14.5 Alertas**:
  - p95 latencia `/v1/elevenlabs/tools/query_manual` > 4 s
  - Tasa error RAG > 5 %
  - Costo OpenRouter > 50 USD/día
  - Cola de indexación > 10 manuales pendientes

### 4.15 Errors
- **F15.1 Catálogo único** en `errors.py` mapea `code → HTTP + message + details`.
- **F15.2 Validación pydantic** genera errores 422 con `code=VALIDATION_ERROR` y `details.field_errors[]`.
- **F15.3 Errores de LangGraph/OpenRouter/ElevenLabs** se mapean a 503 con `code` específico.

### 4.16 Security middleware
- **F16.1 CORS** allowlist por env.
- **F16.2 Rate limiting** in-memory (dev) o Redis (prod): 60 req/min por user, 600 req/min handshake WS.
- **F16.3 Security headers** (`X-Content-Type-Options`, `X-Frame-Options: DENY`, etc.).
- **F16.4 Request size limit** global configurable.
- **F16.5 Audit log** automático en: login, logout, start_session, finalize_session, manual_upload, manual_delete, admin_override.

### 4.17 Mock server (`mock_server/`)
- **F17.1 Standalone FastAPI** con fixtures.
- **F17.2 Modos**: `happy-path`, `voice-fallback`, `rag-abstain`, `photo-retry`, `network-degraded`.
- **F17.3 Cumple `openapi.yaml`** al pie de la letra (mismos shapes, mismos códigos de error).
- **F17.4 Scripted WS**: emite secuencia de eventos en timeline configurable.
- **F17.5 Datos sembrados**: 3 técnicos, 5 OTs, 2 manuales, 1 plantilla.

### 4.18 Contract tests
- **F18.1 Suite pytest + schemathesis** que valida backend contra `openapi.yaml`.
- **F18.2 Suite WS** con `asyncapi.yaml` cliente.
- **F18.3 Gate CI**: falla el merge si contrato cambia sin actualizar `openapi.yaml`.
- **F18.4 Snapshot de errores** por endpoint.

---

## 5. Modelo de datos (DB)

Responsabilidad del backend (migraciones en `supabase/migrations/`). Ver detalle completo en `integration_contracts.md` §6.

- `plant`, `user`, `asset`, `manual`, `manual_chunk`, `procedure_template`, `work_order`, `maintenance_session`, `session_event`, `evidence_photo`, `maintenance_report`, `report_derived_work_order`, `audit_log`, `langgraph_checkpoints`.
- **Invariantes clave**:
  - Una sola sesión activa por OT.
  - `manual` único `active` por `asset_model`.
  - `session_event.event_id` único por sesión (idempotency).
  - `audit_log` append-only.

---

## 6. Storage

Buckets (definidos en `infra/storage.md` + creados vía migrations):

- `manuals/{plant_id}/{manual_id}/{version}.pdf`
- `evidence-photos/{session_id}/{photo_id}.{ext}`
- `reports/{session_id}/report.pdf`

Signed URLs: TTL 15 min, regeneradas en cada GET.

---

## 7. Variables de entorno

```dotenv
APP_ENV=dev
LOG_LEVEL=INFO

SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server-only, nunca expuesta
DATABASE_URL=postgresql://...   # connection pool

ELEVENLABS_API_KEY=...
ELEVENLABS_WEBHOOK_SECRET=...
ELEVENLABS_AGENT_ID=...

OPENROUTER_API_KEY=...
OPENROUTER_DEFAULT_MODEL=anthropic/claude-sonnet-4.5

LANGGRAPH_API_URL=...
LANGGRAPH_API_KEY=...

AUDIO_RETENTION_DAYS=30
PHOTO_MAX_RETRIES=3
RATE_LIMIT_PER_MIN=60

CORS_ALLOWED_ORIGINS=http://localhost:5173
SENTRY_DSN=...
OTEL_EXPORTER_OTLP_ENDPOINT=...

# Mock mode (dev only)
MOCK_MODE=true
```

---

## 8. Seguridad

- **Service role key** de Supabase solo en backend, nunca en logs ni response.
- **Validación JWT** en todo endpoint salvo `/health`, `/ready`, `/v1/auth/login`.
- **Firma de webhook** ElevenLabs obligatoria; rechaza sin firma válida.
- **Cifrado en tránsito** TLS 1.3 (terminado en LB).
- **Secrets** en vault (Fly secrets / Render env / Doppler). Nunca en repo.
- **Sanitización de logs**: no loguear tokens, passwords, `service_role_key`, contenido completo de utterances (solo `event_id`).

---

## 9. Performance

- **Latencia objetivo**: 
  - REST genérico < 100 ms p95
  - Tool call LangGraph < 1.5 s p95
  - PDF generation < 8 s p95
- **Connection pooling** Postgres (Supabase pooler).
- **Async-first** (`asyncpg`, `httpx.AsyncClient`).
- **Caché de embeddings** por chunk hash (evita re-embedding).
- **Streaming de uploads grandes** (manual PDF) con barra de progreso.

---

## 10. Testing

| Tipo | Herramienta | Cobertura |
|---|---|---|
| Unit | pytest | services, helpers, schemas |
| Integration | pytest + httpx + TestClient | routers, ws, webhooks |
| Contract | schemathesis + openapi.yaml | 100% endpoints |
| Contract WS | pytest-asyncio + cliente WS | eventos |
| Load | k6 / Locust | 50 sesiones concurrentes |
| E2E manual | guion + checklist | happy path + edge cases |

**Cobertura mínima:** 80 % en services; 100 % en routers (contract).

---

## 11. DevOps

- **Dockerfile** multi-stage, imagen base `python:3.12-slim`.
- **docker-compose.dev.yml**: backend + supabase local + langgraph dev.
- **CI GitHub Actions**:
  - lint (ruff, mypy strict)
  - tests (pytest)
  - contract tests
  - build imagen
  - push a GHCR
- **CD**:
  - `main` → auto-deploy a `dev`
  - tag `v*` → manual approval a `prod`
- **Deploy target**: Fly.io / Railway / Render (contenedor stateless).

---

## 12. Roadmap backend

**Fase 0 — Spike (1–2 sem)**
- F0.1 Scaffold FastAPI + config + logging
- F0.2 Supabase local + migrations iniciales
- F0.3 `/health` + `/ready`
- F0.4 Hello world con un endpoint mock

**Fase 1 — Auth + Work Orders + Sessions (sin voz)**
- F1.1 Auth completo (login, refresh, me)
- F1.2 Work orders list/get/start
- F1.3 Sessions get/events/pause/resume
- F1.4 WebSocket básico (broadcast de eventos persistidos)
- F1.5 Mock server con flujo happy-path

**Fase 2 — Webhook ElevenLabs + LangGraph**
- F2.1 Webhook receiver + firma
- F2.2 LangGraph client + state machine mínima
- F2.3 Tool calls desde ElevenLabs
- F2.4 WS eventos `session.*`, `step.*`

**Fase 3 — RAG**
- F3.1 Manual upload + storage + async indexing
- F3.2 RAG service (hybrid retrieval + rerank)
- F3.3 Tool `query_manual`
- F3.4 Citations en respuestas

**Fase 4 — Fotos**
- F4.1 Upload endpoint
- F4.2 VLM validation
- F4.3 Retry logic + escalation
- F4.4 Eventos WS

**Fase 5 — Reporte + PDF**
- F5.1 Report service incremental
- F5.2 PDF renderer (Jinja2 + WeasyPrint)
- F5.3 Finalize endpoint
- F5.4 Derived work orders

**Fase 6 — Hardening**
- F6.1 Observability completa
- F6.2 Contract tests
- F6.3 Rate limiting
- F6.4 Audit log
- F6.5 Load tests
- F6.6 Runbooks

---

## 13. Criterios de aceptación backend

- [ ] OpenAPI se sirve en `/openapi.json` y cumple contrato de `integration_contracts.md`
- [ ] Contract tests pasan 100 %
- [ ] Mock server levanta y responde a mobile + desktop sin backend real
- [ ] Webhook ElevenLabs rechaza requests sin firma
- [ ] Audio nunca se persiste por defecto; configurable vía env
- [ ] Logs estructurados con `correlation_id` trazable end-to-end
- [ ] p95 tool call `query_manual` < 4 s
- [ ] PDF generado en < 8 s p95
- [ ] Indexación de manual asíncrona no bloquea request
- [ ] RLS policies testeadas con usuarios de cada rol