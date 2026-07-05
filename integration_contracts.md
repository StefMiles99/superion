# Integration Contracts — SUPERION

**Propósito:** definir el contrato único e inequívoco entre los subproyectos (mobile web, desktop web, backend FastAPI, LangGraph, ElevenLabs Agents, OpenRouter, Supabase) para permitir desarrollo en paralelo sin bloqueos.

**Fuente de verdad:**
- Este documento + `openapi.yaml` (REST) + `asyncapi.yaml` (WebSocket) + JSON Schemas en `/contracts/schemas/`
- Cualquier cambio de contrato debe pasar por PR con tag `contract-change` y bump de versión (`v1` → `v1.1`).

**Stack:**
- Frontend: React 19 + TS (mobile + desktop)
- Backend: FastAPI (Python 3.12)
- LangGraph: state + RAG + report gen
- ElevenLabs Agents: voz (ASR Scribe + TTS + tool calling)
- OpenRouter: LLM + embeddings
- Supabase: Postgres + pgvector + Storage + Auth

---

## 1. Convenciones generales

### 1.1 Versionado
- Todas las rutas REST llevan prefijo de versión: `/v1/...`
- WebSocket: `/v1/ws/...`
- Versionado por URL (no por header) en v1.
- Breaking changes ⇒ bump de versión (`/v2`). No breaking changes dentro de `v1`.

### 1.2 URLs base
```
# dev
API_BASE_URL=https://api.dev.superion.app
WS_BASE_URL=wss://api.dev.superion.app

# staging
API_BASE_URL=https://api.staging.superion.app
WS_BASE_URL=wss://api.staging.superion.app

# prod
API_BASE_URL=https://api.superion.app
WS_BASE_URL=wss://api.superion.app
```

### 1.3 Autenticación
- **Supabase Auth** emite JWT RS256 (`access_token` + `refresh_token`).
- Endpoints REST: header `Authorization: Bearer <access_token>`
- WebSocket: token vía query param `?token=<access_token>` (los browsers no permiten headers en WS nativo).
- Refresh: usar `POST /v1/auth/refresh` cuando falten < 5 min para expirar.
- Tokens tienen `aud=authenticated`, `role=authenticated`. Claims custom: `plant_id`, `user_role`.

### 1.4 Identificadores
- IDs servidor: **UUID v4** (string).
- IDs cliente (eventos, idempotency): **UUID v4** generado en cliente.
- Códigos de OT: legibles (`OT-1234`) pero el ID interno es UUID.

### 1.5 Tiempos
- **Todos los timestamps en UTC, ISO 8601 con `Z`**: `2026-07-04T14:23:11.512Z`
- El frontend los formatea según locale (es-ES por defecto).

### 1.6 Paginación
- **Cursor-based** en listas.
- Query params: `cursor=<opaque>&limit=<n>` (default 50, max 200).
- Respuesta: `{ "items": [...], "next_cursor": "..." | null }`

### 1.7 Idempotencia
- Mutaciones que crean recursos idempotentes aceptan header `Idempotency-Key: <uuid>`.
- Backend cachea respuesta por `Idempotency-Key` (TTL 24 h) por `(user_id, key)`.
- Aplicar a: `POST /v1/sessions/{id}/events`, `POST /v1/sessions/{id}/photos`, `POST /v1/auth/login`.

### 1.8 Errores — sobre universal
```json
{
  "error": {
    "code": "STEP_HAS_MISSING_PHOTO",
    "message": "El paso requiere foto válida antes de avanzar.",
    "details": { "step_index": 4, "reason": "photo_required" },
    "trace_id": "01HZ..."
  }
}
```
- `code`: SCREAMING_SNAKE_CASE, estable, programmaticable.
- `message`: legible para mostrar en UI.
- `details`: opcional, estructurado.
- `trace_id`: correlation id del request (mismo en logs y tracing).

### 1.9 Content types
- Request: `application/json; charset=utf-8`
- Upload fotos: `multipart/form-data`
- Response: `application/json; charset=utf-8`
- PDF: `application/pdf`

### 1.10 CORS
- Orígenes allowlistados por entorno via `CORS_ALLOWED_ORIGINS`.
- Credenciales: true (cookies httpOnly de refresh).

### 1.11 Rate limiting
- Headers de respuesta: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
- HTTP 429 con `Retry-After` (segundos).
- Límites por usuario (no por IP): 60 req/min default, 600 req/min para endpoints WS handshake.

---

## 2. Contrato REST

> Especificación ejecutable en `openapi.yaml`. Esta sección es el resumen normativo.

### 2.1 Auth

#### `POST /v1/auth/login`
```jsonc
// Request
{
  "email": "juan@planta.com",
  "password": "..."
}

// Response 200
{
  "access_token": "eyJ...",
  "refresh_token": "v1.MR...",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "...",
    "full_name": "Juan Pérez",
    "role": "technician",
    "plant_id": "uuid"
  }
}
```

#### `POST /v1/auth/refresh`
```jsonc
// Request
{ "refresh_token": "v1.MR..." }
// Response 200: mismo shape que login
```

#### `POST /v1/auth/logout`
```jsonc
// Request: vacío, Authorization requerido
// Response 204
```

#### `GET /v1/auth/me`
```jsonc
// Response 200
{
  "id": "uuid",
  "email": "...",
  "full_name": "...",
  "role": "technician" | "supervisor" | "rag_admin",
  "plant_id": "uuid"
}
```

### 2.2 Work Orders

#### `GET /v1/work-orders`
Query params:
- `status`: `pending|in_progress|paused|completed|cancelled` (repetible)
- `assigned_to`: user_id (default = yo)
- `priority`: `low|med|high`
- `asset_id`: uuid
- `cursor`, `limit`

Response 200:
```jsonc
{
  "items": [
    {
      "id": "uuid",
      "code": "OT-1234",
      "type": "preventive",
      "priority": "high",
      "status": "pending",
      "asset": {
        "id": "uuid",
        "tag": "COMP-C3",
        "name": "Compresor C-3",
        "model": "Atlas Copco GA-37"
      },
      "assigned_to": { "id": "uuid", "full_name": "Juan Pérez" },
      "planned_start": "2026-07-04T14:00:00Z",
      "planned_end": "2026-07-04T15:30:00Z",
      "procedure_template_id": "uuid",
      "procedure_name": "MP-Compresor-C3-v3",
      "estimated_minutes": 90
    }
  ],
  "next_cursor": null
}
```

#### `GET /v1/work-orders/{id}`
Response 200: objeto completo (incluye `description`, `notes`, `linked_wo_ids[]`).

#### `POST /v1/work-orders/{id}/start`
Inicia sesión de mantenimiento para esta OT.
```jsonc
// Request: vacío
// Response 201
{
  "session_id": "uuid",
  "work_order_id": "uuid",
  "procedure_template": {
    "id": "uuid",
    "name": "MP-Compresor-C3-v3",
    "manual_id": "uuid",
    "steps": [
      {
        "index": 0,
        "title": "Preparar área de trabajo",
        "description": "...",
        "estimated_minutes": 5,
        "critical": false,
        "requires_photo": false,
        "photo_criteria": null
      }
    ],
    "critical_step_indices": [3, 7],
    "photo_required_step_indices": [3, 5],
    "estimated_minutes": 90
  },
  "langgraph_thread_id": "uuid",
  "websocket_url": "wss://api.superion.app/v1/ws/sessions/{session_id}?token=...",
  "started_at": "2026-07-04T14:00:00Z"
}
```
- 409 si OT ya está `in_progress` o `completed`.

### 2.3 Sessions

#### `GET /v1/sessions/{id}`
```jsonc
{
  "id": "uuid",
  "work_order_id": "uuid",
  "technician_id": "uuid",
  "status": "active" | "paused" | "finalized" | "aborted",
  "started_at": "...",
  "ended_at": null,
  "current_step_index": 3,
  "metrics": {
    "total_active_seconds": 482,
    "voice_seconds": 311,
    "photos_count": 2,
    "avg_step_seconds": 161
  },
  "next_seq": 42
}
```

#### `GET /v1/sessions/{id}/events?since_seq={n}&limit={n}`
Catch-up para WebSocket. Devuelve eventos en orden de `seq` ascendente.
```jsonc
{
  "items": [
    {
      "seq": 41,
      "type": "step.completed",
      "session_id": "uuid",
      "step_index": 2,
      "payload": { "duration_seconds": 142 },
      "created_at": "..."
    }
  ],
  "next_cursor": null
}
```

#### `POST /v1/sessions/{id}/events`
Para eventos **no generados por voz** (fotos aceptadas, comandos explícitos de UI como "saltar paso no crítico", mediciones manuales). La voz siempre llega vía WebSocket/LangGraph.
```jsonc
// Request
{
  "event_id": "uuid",   // idempotency
  "type": "command" | "measurement" | "finding" | "step_advance" | "step_skip",
  "step_index": 3,
  "payload": {
    // shape varía por type
  }
}
// Response 202 { "seq": 43, "accepted": true }
```

Shapes de payload por type:

**`command`** — `{ "command": "pause" | "resume" | "repeat_step" | "go_back" }`

**`measurement`** — `{ "name": "presion_psi", "value": 85.2, "unit": "psi" }`

**`finding`** — `{ "text": "Válvula con pequeña fuga", "severity": "low" | "med" | "high" }`

**`step_advance`** — `{}` (LangGraph valida pre-requisitos; si falla, devuelve 409)

**`step_skip`** — `{ "reason": "No aplica en esta unidad" }` (solo permitido si paso no es `critical`)

Errores relevantes:
- `409 STEP_CRITICAL_CANNOT_SKIP`
- `409 STEP_REQUIRES_PHOTO`
- `409 SESSION_ALREADY_FINALIZED`

#### `POST /v1/sessions/{id}/pause`
Response 204.

#### `POST /v1/sessions/{id}/resume`
Response 204.

#### `POST /v1/sessions/{id}/finalize`
Cierra la sesión, genera reporte y PDF.
```jsonc
// Request: vacío
// Response 200
{
  "session_id": "uuid",
  "report_id": "uuid",
  "pdf_url": "https://signed-url...",
  "pdf_expires_at": "..."
}
```

#### `POST /v1/sessions/{id}/voice/connect`
Emite credenciales para iniciar conversación de voz con el agente ElevenLabs (backend proxy; el cliente **nunca** recibe `ELEVENLABS_API_KEY`).

Request: `{}` (vacío; `session_id` en path)

Response 200:
```jsonc
{
  "agent_id": "agent_…",
  "connect_mode": "signed_url",
  "signed_url": "wss://…",
  "expires_at": "2026-07-04T20:45:00Z",
  "dynamic_variables": {
    "session_id": "uuid",
    "work_order_code": "OT-1234",
    "asset_tag": "COMP-01"
  }
}
```

Errores:
- `404 SESSION_NOT_FOUND`
- `403 FORBIDDEN` (sesión de otro técnico)
- `409 SESSION_NOT_ACTIVE` (sesión finalizada o abortada)
- `422 AGENT_NOT_PROVISIONED` (sin `ELEVENLABS_AGENT_ID` ni `state.json`)
- `503 ELEVENLABS_UNAVAILABLE`

### 2.4 Photos

#### `POST /v1/sessions/{id}/photos`
Multipart form-data:
- `file`: archivo (jpeg/png/webp, max 10 MB)
- `step_index`: int
- `event_id`: uuid (idempotency)
- `criteria`: string (opcional, lo que el técnico declara que muestra la foto)

Response 202 (async — validación puede continuar):
```jsonc
{
  "photo_id": "uuid",
  "status": "pending",
  "uploaded_at": "..."
}
```
La validación final se publica vía WebSocket (`photo.validated` o `photo.rejected`).

#### `GET /v1/photos/{id}`
Response 200:
```jsonc
{
  "id": "uuid",
  "session_id": "uuid",
  "step_index": 3,
  "thumbnail_url": "https://signed...",
  "full_url": "https://signed...",
  "validation_status": "accepted" | "rejected" | "pending",
  "validation_feedback": "...",
  "captured_at": "..."
}
```
- `thumbnail_url` y `full_url` son signed URLs (TTL 15 min).

### 2.5 Reports

#### `GET /v1/sessions/{id}/report`
Report JSON (estructura completa descrita en PRD §14.1).
```jsonc
{
  "id": "uuid",
  "session_id": "uuid",
  "status": "draft" | "finalized",
  "content": {
    "header": { /* ... */ },
    "summary": "...",
    "procedure": [ /* ... */ ],
    "findings": [ /* ... */ ],
    "measurements": [ /* ... */ ],
    "photos_gallery": [ /* ... */ ]
  },
  "version": 7,
  "updated_at": "..."
}
```

#### `GET /v1/sessions/{id}/report/pdf`
Response 200: `application/pdf` (descarga directa).
Headers: `Content-Disposition: attachment; filename="OT-1234-reporte.pdf"`, `X-Document-SHA256: <hash>`.

### 2.6 Manuals (RAG)

#### `GET /v1/manuals`
```jsonc
{
  "items": [
    {
      "id": "uuid",
      "title": "Atlas Copco GA-37 — Service Manual",
      "asset_model": "Atlas Copco GA-37",
      "version": 3,
      "status": "active" | "archived" | "indexing" | "error",
      "index_status": "indexed" | "pending" | "failed",
      "chunk_count": 412,
      "uploaded_at": "...",
      "uploaded_by": { "id": "uuid", "full_name": "..." }
    }
  ]
}
```

#### `POST /v1/manuals`
Multipart: `file` (PDF, max 50 MB), `title`, `asset_model`, `replaces_manual_id?`.
Response 202:
```jsonc
{
  "manual_id": "uuid",
  "index_status": "pending",
  "estimated_seconds": 90
}
```
- Indexación es async; frontend se suscribe vía WebSocket admin o hace polling.

#### `GET /v1/manuals/{id}`
Response 200: metadata + `download_url` (signed, TTL 15 min).

#### `POST /v1/manuals/{id}/reindex`
Response 202 `{ "manual_id": "...", "index_status": "pending" }`.

#### `DELETE /v1/manuals/{id}`
Archiva (soft delete). Response 204.

### 2.7 Procedure Templates

#### `GET /v1/procedure-templates`
Lista paginada.
#### `GET /v1/procedure-templates/{id}`
Devuelve plantilla con steps completos.
#### `POST /v1/procedure-templates`
```jsonc
// Request
{
  "name": "MP-Compresor-C3",
  "version": 1,
  "manual_id": "uuid",
  "asset_id": "uuid",  // opcional
  "estimated_minutes": 90,
  "steps": [
    {
      "index": 0,
      "title": "Preparar área",
      "description": "...",
      "estimated_minutes": 5,
      "critical": false,
      "requires_photo": false,
      "photo_criteria": null
    }
  ]
}
// Response 201
```

### 2.8 Assets

#### `GET /v1/assets`
Filtros: `tag`, `model`, `plant_id`. Paginación estándar.

#### `GET /v1/assets/{id}`
Incluye `current_manual_id` y `current_manual_version`.

### 2.9 Health

#### `GET /health`
Liveness — 200 siempre que el proceso responda.

#### `GET /ready`
Readiness — chequea Supabase, ElevenLabs (config), OpenRouter (config), LangGraph (config). 200/503.

---

## 3. Contrato WebSocket

> Especificación ejecutable en `asyncapi.yaml`. Esta sección es normativa.

### 3.1 Conexión

- URL: `wss://{API_BASE_URL}/v1/ws/sessions/{session_id}?token=<jwt>&last_seq={n}`
- Auth: token JWT en query.
- Query `last_seq` opcional: el servidor replay desde ese seq.
- Salas:
  - `session:{session_id}` — solo participantes de la sesión (técnico + supervisores).
  - `admin:manuals` — canal broadcast para admins RAG (indexación, etc.).

### 3.2 Mensajes del cliente → servidor

**Subscribe (primer mensaje obligatorio)**
```jsonc
{
  "type": "subscribe",
  "channels": ["session:{session_id}"],
  "last_seq": 41
}
```

**Ping**
```jsonc
{ "type": "ping" }
```
Servidor responde `pong` cada 30 s; cliente debe enviar ping cada 25 s.

**Voice utterance (alternativa a ElevenLabs directo)** — opcional
```jsonc
{
  "type": "voice.utterance",
  "event_id": "uuid",
  "session_id": "uuid",
  "step_index": 3,
  "text": "ya cerré la válvula",
  "audio_ref": "uuid",
  "created_at": "..."
}
```
> En el flujo normal, la voz NO llega por aquí; llega vía ElevenLabs → FastAPI → LangGraph. Este canal es fallback de texto o debug.

### 3.3 Mensajes del servidor → cliente

Todos los eventos llevan: `seq` (monotónico por sesión), `session_id`, `created_at`, `type`, `payload`.

#### Eventos de sesión

```jsonc
// session.started
{ "seq": 1, "type": "session.started", "session_id": "...", "created_at": "...",
  "payload": { "started_at": "...", "work_order_id": "..." } }

// session.paused / session.resumed / session.closed
{ "seq": N, "type": "session.paused", "session_id": "...", "created_at": "...",
  "payload": { "reason": "user" | "system" | "error" } }

// session.closed
{ "payload": { "report_id": "...", "pdf_url": "..." } }
```

#### Eventos de paso

```jsonc
// step.entered
{ "type": "step.entered", "payload": {
  "index": 3,
  "title": "Aislar el equipo",
  "description": "...",
  "estimated_minutes": 10,
  "critical": true,
  "requires_photo": true,
  "photo_criteria": "Foto del candado LOTO colocado en V-12"
}}

// step.completed
{ "type": "step.completed", "payload": {
  "index": 3, "duration_seconds": 142, "completed_by": "voice" | "command"
}}

// step.skipped
{ "type": "step.skipped", "payload": { "index": 5, "reason": "..." }}
```

#### Eventos de evidencia

```jsonc
// photo.captured
{ "type": "photo.captured", "payload": {
  "photo_id": "uuid", "step_index": 3, "thumbnail_url": "..."
}}

// photo.validated
{ "type": "photo.validated", "payload": {
  "photo_id": "uuid", "step_index": 3, "feedback": "ok",
  "caption": "Candado LOTO colocado en V-12"
}}

// photo.rejected
{ "type": "photo.rejected", "payload": {
  "photo_id": "uuid", "step_index": 3,
  "feedback": "No se ve el candado. Acércate más.",
  "retries": 1, "max_retries": 3
}}
```

#### Eventos del asistente

```jsonc
// assistant.answering
{ "type": "assistant.answering", "payload": { "step_index": 3, "query": "¿cuál es el torque?" }}

// assistant.answered
{ "type": "assistant.answered", "payload": {
  "step_index": 3,
  "query": "¿cuál es el torque?",
  "answer_text": "Según el manual...",
  "citations": [
    { "manual_id": "uuid", "manual_version": 3,
      "page": 42, "section_path": "4. Mantenimiento > 4.3 Válvulas",
      "chunk_id": "uuid", "snippet": "Torque de apriete: 85 N·m ± 5%" }
  ],
  "confidence": 0.82
}}
```

#### Eventos de reporte

```jsonc
// report.updated
{ "type": "report.updated", "payload": {
  "report_id": "uuid",
  "version": 8,
  "diff": {
    "summary_changed": true,
    "step_index": 3,
    "added_event_seq": 41
  }
}}
```

#### Errores y control

```jsonc
// error
{ "type": "error", "payload": {
  "code": "STEP_CRITICAL_CANNOT_SKIP",
  "message": "...",
  "details": { "step_index": 3 }
}}

// pong
{ "type": "pong", "created_at": "..." }
```

### 3.4 Orden de eventos
- Estrictamente monotónico por `seq` dentro de una sesión.
- Posibles gaps si reconectaste: usar `GET /v1/sessions/{id}/events?since_seq=X`.

### 3.5 Reconexión
- Cliente: backoff exponencial (1s, 2s, 4s, 8s, max 30s) con jitter.
- En reconexión: pasar `last_seq` en query → servidor replay + live.

### 3.6 Cierre
- Servidor cierra con code 1000 en logout / sesión finalizada.
- Cliente cierra con code 1000 al desmontar.

---

## 4. Contrato LangGraph

### 4.1 State schema

Estado persistido por sesión (checkpointer Postgres):

```python
class SessionState(TypedDict):
    session_id: str
    work_order_id: str
    procedure: ProcedureTemplate       # inmutable por sesión
    current_step_index: int
    step_history: list[StepResult]     # append-only
    pending_photo: dict | None         # {photo_id, criteria, retries}
    pending_query: dict | None         # {query, step_index}
    findings: list[Finding]
    measurements: list[Measurement]
    transcript_buffer: list[Utterance] # últimos N verbatim
    transcript_summary: str            # resumen de lo anterior
    report_content: dict               # JSON del reporte en construcción
    status: Literal["active","paused","finalizing","closed"]
    metrics: dict
    last_event_seq: int
```

### 4.2 Tools expuestas por LangGraph (invocadas por ElevenLabs)

| Tool name | Input | Output | Descripción |
|---|---|---|---|
| `get_current_step` | `{}` | `Step` | Devuelve paso actual |
| `get_session_summary` | `{}` | `{summary, current_step, findings_count}` | Resumen para voz |
| `query_manual` | `{question: str, asset_id: str}` | `{answer: str, citations: [Citation]}` | RAG con cita obligatoria |
| `request_evidence_photo` | `{step_index: int, criteria: str}` | `{accepted: bool, photo_id?: str}` | Solicita foto al técnico |
| `mark_step_complete` | `{step_index: int}` | `{ok: bool, reason?: str}` | Avanza paso (valida pre-req) |
| `skip_step` | `{step_index: int, reason: str}` | `{ok: bool, reason?: str}` | Salta paso no-crítico |
| `add_finding` | `{text: str, severity: str}` | `{finding_id: str}` | Registra hallazgo |
| `add_measurement` | `{name, value, unit}` | `{measurement_id: str}` | Registra medición |
| `pause_session` | `{}` | `{ok: bool}` | Pausa |
| `resume_session` | `{}` | `{ok: bool}` | Reanuda |
| `finalize_session` | `{}` | `{report_id: str, pdf_url: str}` | Cierra y genera reporte |

### 4.3 Schemas JSON de los tools (input/output)

> Versión completa en `/contracts/schemas/langgraph-tools.json`. Ejemplos clave:

**`query_manual`**
```jsonc
// input
{
  "question": "¿Cuál es el torque de la válvula V-12?",
  "asset_id": "uuid"
}
// output
{
  "answer": "El torque de apriete es 85 N·m ± 5%.",
  "citations": [
    {
      "manual_id": "uuid",
      "manual_version": 3,
      "page": 42,
      "section_path": "4. Mantenimiento > 4.3 Válvulas",
      "chunk_id": "uuid",
      "snippet": "Torque de apriete: 85 N·m ± 5%."
    }
  ],
  "confidence": 0.82,
  "abstained": false
}
```

**`request_evidence_photo`**
```jsonc
// output (la foto llega después vía evento async)
{ "accepted": true, "photo_id": "uuid" }
// o
{ "accepted": false, "reason": "CRITERIA_INVALID" }
```

**`mark_step_complete`**
```jsonc
// output
{ "ok": true }
// o
{ "ok": false, "reason": "STEP_REQUIRES_PHOTO" | "STEP_OUT_OF_ORDER" | "STEP_ALREADY_DONE" }
```

### 4.4 Guardas del state machine

| Transición | Guarda |
|---|---|
| `in_step → awaiting_advance` | siempre permitido (acción del usuario) |
| `awaiting_advance → in_step (siguiente)` | si `requires_photo && !photo_accepted` → bloquea con error `STEP_REQUIRES_PHOTO` |
| `in_step → step.skipped` | si `critical=false`; si `critical=true` → `STEP_CRITICAL_CANNOT_SKIP` |
| `* → finalize` | requiere `current_step_index == len(steps)-1` y `last_step.completed` |
| `finalize → closed` | requiere `report.pdf_storage_path != null` |

### 4.5 Routing de intents

LLM clasificador (prompt estable en `langgraph/prompts/router.md`):
- `command_pause`, `command_resume`, `command_repeat`, `command_go_back`, `command_next`
- `command_skip` → requiere `reason`
- `query_technical` → RAG
- `narration_observation` → append buffer + posible finding
- `measurement` → tool `add_measurement`
- `finding` → tool `add_finding`
- `photo_request` → tool `request_evidence_photo`
- `finalize` → tool `finalize_session`
- `unknown` → pedir aclaración

### 4.6 Memoria / checkpointer
- Postgres checkpointer (tabla `langgraph_checkpoints`).
- Thread key = `session_id`.
- Política: último `step_history` completo verbatim + `transcript_summary` para turnos antiguos.

---

## 5. Contrato ElevenLabs Agents

### 5.1 Configuración declarativa

`elevenlabs/agent.yaml`:
```yaml
agent:
  name: superion-technician
  voice_id: <configurable>
  model: eleven_multilingual_v2
  language: es
  asr:
    provider: scribe
    language: es
  turn_detection:
    provider: native
  barge_in: true
  system_prompt: !include prompts/agent-system.md
  tools: !include tools/agent-tools.json
  variables:
    plant_name: "Planta Norte"
    locale: "es-MX"
```

### 5.2 Tools expuestas al agente (mismo set que LangGraph §4.2)

Archivo `tools/agent-tools.json` — cada tool declara `name`, `description`, `parameters` (JSON Schema). El agente invoca vía HTTP a FastAPI.

Ejemplo:
```jsonc
{
  "name": "query_manual",
  "description": "Consulta el manual técnico del equipo activo. Devuelve respuesta con cita (página y sección).",
  "parameters": {
    "type": "object",
    "properties": {
      "question": { "type": "string", "description": "Pregunta técnica del técnico" },
      "asset_id": { "type": "string" }
    },
    "required": ["question", "asset_id"]
  }
}
```

### 5.3 Endpoint que ElevenLabs invoca

Para cada tool call, ElevenLabs hace `POST {API_BASE_URL}/v1/elevenlabs/tools/{tool_name}` con:
```jsonc
{
  "call_id": "uuid",
  "session_id": "uuid",
  "agent_id": "...",
  "tool_name": "query_manual",
  "arguments": { ... },
  "timestamp": "..."
}
```

Response:
```jsonc
{
  "call_id": "uuid",
  "result": { /* shape depende del tool */ }
}
```

- Backend valida: `session_id` pertenece al técnico autenticado (via JWT del request).
- Errores devueltos con mismo envelope §1.8; ElevenLabs los reformula a voz.

### 5.4 Webhooks del agente

`POST {API_BASE_URL}/v1/elevenlabs/webhooks/conversation`:
- `conversation.started` → backend crea `maintenance_session` (si no existe)
- `utterance.final` → `{text, audio_url?, timestamp}`
- `tool.called` → `{tool_name, arguments, call_id}`
- `tool.responded` → `{call_id, result}`
- `turn.speaker_changed` → `{new_speaker: "user"|"agent"}`
- `conversation.ended` → `{reason, duration_seconds}`
- `error`

Backend firma/verifica con header `X-ElevenLabs-Signature` (HMAC SHA256).

### 5.5 Privacidad
- Audio crudo NO se persiste por defecto; solo transcripciones.
- Si `AUDIO_RETENTION_DAYS > 0`, audio se guarda en Storage cifrado y se purga con cron.

### 5.6 Provisionamiento del agente (Python, sin UI)

El agente conversacional se inicializa y despliega **solo vía Python** (CLI `python -m interface.cli.elevenlabs`), nunca por la UI web ni `@elevenlabs/cli` npm.

**Configuración declarativa** (repo): `elevenlabs/agent.yaml`, `elevenlabs/prompts/agent-system.md`, `elevenlabs/tools/agent-tools.json`.

**Flujo idempotente:**
1. `provision` — sincroniza webhook tools → create/update agente en ElevenLabs API
2. `deploy` — `agents.deployments.create` al porcentaje configurado
3. Estado local en `elevenlabs/state.json` (gitignored): `{agent_id, branch_id, tool_ids, status}`

**Variables de entorno (backend):**
- `ELEVENLABS_PROVISIONER=memory|api` (default `memory`)
- `ELEVENLABS_AGENT_MANIFEST`, `ELEVENLABS_STATE_FILE`, `ELEVENLABS_AGENT_ID`
- `ELEVENLABS_VOICE_ID`, `DEPLOY_ENV`, `API_BASE_URL`

**Runtime:** tras provision, el técnico obtiene `signed_url` vía `POST /v1/sessions/{id}/voice/connect` (§2.3).

#### `GET /v1/admin/elevenlabs/agent/status` (opcional v1, supervisor/rag_admin)

Response 200:
```jsonc
{
  "provisioner": "api",
  "agent_id": "agent_…",
  "branch_id": "agtbrch_…",
  "deployed_at": "2026-07-04T18:00:00Z",
  "environment": "dev",
  "tools_synced": 11,
  "status": "deployed"
}
```

---

## 6. Contrato Supabase / DB

### 6.1 Tablas operativas

Esquema completo en `supabase/migrations/0001_init.sql`. Resumen de invariantes:

- `user.id` referencia `auth.users(id)` (Supabase Auth).
- `work_order.assigned_to` referencia `user.id` (FK).
- `maintenance_session.work_order_id` UNIQUE cuando `status IN ('active','paused')` — una sola sesión activa por OT.
- `session_event.event_id` UNIQUE por `session_id` (idempotency cliente).
- `evidence_photo.validation_status` ∈ `{pending,accepted,rejected}`.
- `manual.version` se incrementa por `(asset_model)` y solo una `active` por modelo.
- `audit_log` append-only (no UPDATE/DELETE permitido por RLS).

### 6.2 Row-Level Security (RLS)

Políticas (resumen; SQL completo en migración):

| Tabla | Technician | Supervisor | rag_admin |
|---|---|---|---|
| `work_order` | SELECT si `assigned_to = auth.uid()` | SELECT si `asset.plant_id = user.plant_id` | SELECT all |
| `maintenance_session` | SELECT si `technician_id = auth.uid()` | SELECT si OT en su planta | SELECT all |
| `session_event` | SELECT si session propia; INSERT no (lo hace backend) | SELECT via session | SELECT all |
| `evidence_photo` | SELECT si session propia | SELECT via session | SELECT all |
| `manual` | SELECT si `status='active'` y `asset_model` matchea algún asset accesible | SELECT all de su planta | ALL |
| `manual_chunk` | SELECT via manual accesible | igual | ALL |
| `procedure_template` | SELECT via work_order accesible | SELECT all de su planta | ALL |
| `audit_log` | — | — | SELECT all |

### 6.3 Storage — buckets

| Bucket | Visibilidad | Path pattern | TTL signed URL |
|---|---|---|---|
| `manuals` | private | `{plant_id}/{manual_id}/{version}.pdf` | 15 min |
| `evidence-photos` | private | `{session_id}/{photo_id}.{ext}` | 15 min |
| `reports` | private | `{session_id}/report.pdf` | 15 min |

Backend NUNCA expone URLs firmadas a usuarios no autorizados; usa `getUser()` server-side.

### 6.4 pgvector

- Columna `manual_chunk.embedding vector(1536)` (configurable por modelo).
- Índice HNSW por `manual_id`:
  ```sql
  CREATE INDEX manual_chunk_hnsw ON manual_chunk
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
  ```
- `ef_search` = 100 en runtime.

---

## 7. Contrato OpenRouter

### 7.1 Modelos usados

Configurables via env, con defaults en `config/models.yaml`:

```yaml
llm:
  router: claude-sonnet-4.5        # default para razonamiento general
  voice_classifier: claude-haiku-4  # clasificación de intents (rápido)
  summarizer: claude-haiku-4        # resúmenes de transcript / reporte
  vision: gpt-4.1                  # validación de fotos (VLM)

embedding:
  model: text-embedding-3-large    # 1536 dims
  fallback: voyage-3
```

### 7.2 Formato de embedding

Request (OpenAI-compatible):
```jsonc
POST https://openrouter.ai/api/v1/embeddings
{
  "model": "text-embedding-3-large",
  "input": ["chunk de texto..."]
}
```
Response: `{ "data": [{ "embedding": [0.012, ...], "index": 0 }] }` (1536 floats).

### 7.3 Formato LLM (chat)

```jsonc
POST https://openrouter.ai/api/v1/chat/completions
{
  "model": "anthropic/claude-sonnet-4.5",
  "messages": [...],
  "temperature": 0.2,
  "response_format": { "type": "json_object" }  // cuando se requiera JSON
}
```

### 7.4 Retries y fallbacks
- 3 reintentos con backoff exponencial (1s, 2s, 4s).
- Si router falla → fallback a `claude-haiku-4`.
- Si embedding falla → fallback al modelo secundario.
- Errores 429 respetan `Retry-After`.

### 7.5 Cost guardrails
- Cada request loguea `tokens_in`, `tokens_out`, `cost_usd`.
- Alerta si `cost_usd > 50 USD/día` o `cost_per_session > 0.20 USD`.

---

## 8. Contratos TypeScript compartidos

Para evitar drift entre frontend y backend:

- **Repo `contracts/`** (este repo) contiene:
  - `openapi.yaml` → genera `packages/api-client/src/types.ts` y `packages/api-client/src/client.ts` (fetch wrapper).
  - `asyncapi.yaml` → genera tipos de eventos WS.
  - `schemas/*.json` → JSON Schemas compartidos.
- **Frontend mobile y desktop** importan `@superion/api-client` (paquete local).
- **Backend** usa los mismos schemas para validación (`pydantic` autogenerado desde JSON Schema).

### 8.1 Versionado del paquete
- `@superion/api-client` sigue semver.
- Breaking change de contrato → bump major y rama nueva (`v2-contract`).

---

## 9. Catálogo de errores

| code | HTTP | Significado | Cuándo |
|---|---|---|---|
| `UNAUTHORIZED` | 401 | JWT inválido o expirado | siempre que aplique |
| `FORBIDDEN` | 403 | RLS bloquea | siempre |
| `NOT_FOUND` | 404 | Recurso no existe | siempre |
| `IDEMPOTENCY_KEY_REUSED` | 409 | Mismo key con payload distinto | POST con idempotency |
| `WORK_ORDER_NOT_FOUND` | 404 | OT no existe | `/work-orders/{id}` |
| `WORK_ORDER_ALREADY_STARTED` | 409 | OT ya tiene sesión activa | `/work-orders/{id}/start` |
| `WORK_ORDER_ALREADY_COMPLETED` | 409 | OT cerrada | `/work-orders/{id}/start` |
| `SESSION_NOT_FOUND` | 404 | sesión no existe | `/sessions/{id}` |
| `SESSION_ALREADY_FINALIZED` | 409 | sesión cerrada | mutaciones de sesión |
| `SESSION_NOT_ACTIVE` | 409 | sesión no activa/pausada | `voice/connect` |
| `AGENT_NOT_PROVISIONED` | 422 | agente ElevenLabs no provisionado | `voice/connect`, deploy CLI |
| `VOICE_CONNECT_FAILED` | 503 | fallo al obtener signed_url | `voice/connect` |
| `STEP_CRITICAL_CANNOT_SKIP` | 409 | intento de saltar paso crítico | `step_skip` |
| `STEP_REQUIRES_PHOTO` | 409 | falta foto válida | `step_advance` |
| `STEP_OUT_OF_ORDER` | 409 | step_index no es el actual | varios |
| `STEP_ALREADY_DONE` | 409 | paso ya completado | varios |
| `PHOTO_NOT_FOUND` | 404 | foto no existe | `/photos/{id}` |
| `PHOTO_VALIDATION_FAILED` | 422 | foto no cumple criterio | validación VLM |
| `MANUAL_NOT_FOUND` | 404 | manual no existe | varios |
| `MANUAL_INDEXING_FAILED` | 500 | fallo de indexación | indexación async |
| `MANUAL_INVALID_PDF` | 422 | PDF corrupto / no procesable | upload |
| `PROCEDURE_TEMPLATE_INVALID` | 422 | steps inválidos | POST templates |
| `RATE_LIMITED` | 429 | rate limit excedido | siempre |
| `LANGGRAPH_UNAVAILABLE` | 503 | LangGraph no responde | tool calls |
| `ELEVENLABS_UNAVAILABLE` | 503 | ElevenLabs no responde | tool calls |
| `OPENROUTER_UNAVAILABLE` | 503 | OpenRouter no responde | cualquier LLM |
| `INTERNAL_ERROR` | 500 | error no catalogado | catchall |

---

## 10. Trazabilidad end-to-end (correlation id)

- Cada request REST recibe/genera `X-Correlation-Id` (UUID).
- Backend lo propaga a:
  - Webhooks ElevenLabs (header)
  - Llamadas a OpenRouter (`X-Correlation-Id` custom header)
  - LangGraph thread metadata
  - Logs estructurados
- WebSocket incluye `correlation_id` en el primer evento de la sesión.

Permite trazabilidad completa: un utterance del técnico → tool call → RAG → respuesta → PDF final.

---

## 11. Mock server para desarrollo paralelo

`packages/mock-server/` (FastAPI standalone) implementa:
- Endpoints REST con fixtures por rol (técnico/supervisor/admin).
- WebSocket que emite eventos pre-canned o scripted.
- Modos: `happy-path`, `voice-fallback`, `rag-abstain`, `photo-retry`, `network-degraded`.

Uso:
```bash
# mobile dev
MOCK=true pnpm dev:mobile   # apunta a http://localhost:8001

# desktop dev
MOCK=true pnpm dev:desktop

# backend dev con ElevenLabs/LangGraph reales
pnpm dev:backend
```

El mock implementa **exactamente** los mismos shapes de `/contracts/openapi.yaml`, garantizando fidelidad.

---

## 12. Contract tests

`packages/contract-tests/` (pytest + Dredd o Schemathesis):
- Suite que valida que el backend cumple el `openapi.yaml`.
- Se ejecuta en CI contra backend levantando en docker.
- Si backend rompe contrato (response shape distinto), el test falla antes del merge.
- Idem para WebSocket usando `asyncapi.yaml` (con `pytest-asyncio` + cliente WS).

Gate de CI:
```yaml
- name: Contract tests
  run: pnpm test:contracts
  # bloquea merge si falla
```

---

## 13. Versionado y changelog de contratos

- Cambios backwards-compatible (nuevo campo opcional, nuevo endpoint, nuevo evento): minor bump del paquete `@superion/api-client`, sin bump de `/v1`.
- Cambios breaking (renombrar campo, cambiar tipo, eliminar endpoint): bump a `/v2`, mantener `/v1` deprecated por ≥ 90 días.

Archivo `contracts/CHANGELOG.md` documenta cada cambio con:
- fecha
- autor
- diff de schema
- equipos impactados (mobile/desktop/backend)

---

## 14. Resumen de "qué necesita cada equipo"

| Equipo | Necesita de otros | Entrega a otros |
|---|---|---|
| **Mobile** | `openapi.yaml`, `asyncapi.yaml`, `@superion/api-client`, mock server | Feedback de UX, requests de nuevos campos |
| **Desktop** | `openapi.yaml`, `asyncapi.yaml`, `@superion/api-client`, mock server | Feedback de UX, requests de nuevos eventos WS |
| **Backend FastAPI** | `openapi.yaml` (cumple), `langgraph-tools.json`, `elevenlabs-tools.json`, Supabase schema, OpenRouter docs | OpenAPI estable, errores documentados, latencias |
| **LangGraph** | `langgraph-tools.json` (input/output), state schema | Tools registrados, checkpointer funcional |
| **ElevenLabs Agents** | `elevenlabs-tools.json`, webhook contract | Webhooks firmados, tools respondiendo |
| **Supabase** | migrations, RLS SQL | DB + Storage operativo |
| **OpenRouter** | — | modelos disponibles, rate limits |

---

## 15. Anexo — check-list de readiness por fase

**Fase 1 (vertical sin voz):**
- [x] OpenAPI publicado
- [x] Mock server con `/work-orders`, `/sessions`, `/sessions/{id}/events`, WS scripted
- [x] `@superion/api-client@0.1.0` publicado

**Fase 2 (voz):**
- [x] Webhook ElevenLabs documentado y mockeado
- [x] Tool schemas publicados en `elevenlabs-tools.json`
- [x] WS eventos `assistant.answered`, `session.started` añadidos a AsyncAPI

**Fase 3 (RAG):**
- [x] Endpoints `/manuals*` y schema de `manual_chunk` estables
- [x] Modelo de embedding fijo en `models.yaml`

**Fase 4 (fotos):**
- [x] `POST /photos` multipart + eventos WS `photo.*`
- [x] Modelo VLM fijo

**Fase 5 (reporte + PDF):**
- [x] `GET /report` y `/report/pdf` estables
- [x] Eventos `report.updated` con diff

---

Este documento es **vinculante**. Cualquier desviación requiere PR con tag `contract-change` y comunicación a los equipos afectados en el canal `#superion-contracts`.