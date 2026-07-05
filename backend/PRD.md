# PRD — Backend SUPERION (estado real del código)

**Subproyecto:** Backend SUPERION
**Stack real:** Python 3.12 · FastAPI · Pydantic v2 · pytest · schemathesis · PyJWT · bcrypt · numpy · PyYAML
**Arquitectura:** Hexagonal (Domain → Application → Infrastructure → Interface)
**Estado de dependencias externas:** todas detrás de puerto; por defecto **in-memory/mock**. Adapters reales (Supabase, OpenRouter, ElevenLabs, LangGraph) existen como stubs intercambiables.
**Documentos relacionados:** `../PRD.md` (producto global), `PRD-backend.md` (plan de features F1–F18), `../integration_contracts.md` (contrato vinculante), `plans/backend/*` (planes incrementales BE-00..BE-09).

> **Propósito de este documento.** A diferencia de `PRD-backend.md` (que describe la visión objetivo del backend), este PRD documenta lo que **está realmente implementado en el código** a día de hoy: endpoints activos, entidades, puertos, adapters, configuración y cobertura de tests. Sirve como fuente de verdad del estado actual para onboarding, QA y planificación.

---

## 1. Resumen ejecutivo

El backend expone la API REST `/v1` + un canal WebSocket de sesión, orquestando el flujo completo de una sesión de mantenimiento asistida por voz: autenticación, gestión de órdenes de trabajo, ciclo de vida de sesión, eventos, fotos de evidencia, RAG sobre manuales, generación de reporte + PDF, webhook y tools de ElevenLabs, y provisión declarativa del agente de voz.

Todo el flujo funciona **end-to-end sin servicios externos** gracias a implementaciones in-memory/mock deterministas. Las integraciones reales (Supabase, OpenRouter, ElevenLabs API, LangGraph) están abstraídas tras puertos y se activan por variable de entorno; varias arrancan como stubs (`NotImplementedError`) listos para implementarse.

**Métricas del código:**
- ~10 grupos de routers HTTP + 1 router WebSocket + 1 CLI.
- 4 capas hexagonales con inversión de dependencias estricta (`mypy --strict` en `domain` y `application`).
- **96 archivos de test / 245 funciones de test** repartidas en unit, integration, e2e y contract.
- Defaults `memory`/`mock` en toda env var nueva (`/ready` responde 200 sin credenciales externas).

---

## 2. Arquitectura implementada

### 2.1 Capas y estructura real

```
backend/src/
├── domain/                      # puro (sin FastAPI/httpx/DB)
│   ├── entities/                # User, WorkOrder, MaintenanceSession, SessionEvent,
│   │                            # EvidencePhoto, Manual, ManualChunk, ProcedureTemplate,
│   │                            # Asset, MaintenanceReport, AuditEntry, VoiceCommand,
│   │                            # ToolCall, AgentManifest, AgentToolSpec, ProvisionState
│   ├── value_objects/           # Role, WorkOrderStatus/SessionStatus, PhotoStatus,
│   │                            # ManualStatus/IndexStatus, EventType, Step, Citation,
│   │                            # RagResult, ReportStatus/Diff, Action, ProvisionStatus, auth
│   ├── ports/                   # repositories, services, storage, event_bus, elevenlabs (Protocol)
│   ├── services/                # impls puras: BcryptPasswordHasher, JwtTokenService,
│   │                            # SystemClock, MockPhotoValidator, MockIntentClassifier,
│   │                            # ManifestValidator
│   └── exceptions.py            # DomainError y jerarquía
├── application/                 # casos de uso + DTOs + decoradores
│   ├── use_cases/               # auth, work_orders, sessions, events, photos,
│   │                            # manuals, rag, reports, voice, elevenlabs, audit,
│   │                            # health, readiness
│   ├── dto/                     # pydantic (extra="forbid"), mappers, error_envelope
│   ├── services/                # event_broadcast, photo_validation
│   └── decorators/
├── infrastructure/              # adapters
│   ├── persistence/in_memory/   # implementaciones funcionales (singleton + reset())
│   ├── persistence/supabase/    # stubs NotImplementedError
│   ├── external/elevenlabs/     # provisioner, conversation_client, config/tool builder,
│   │                            # manifest_loader, state_store (in-memory + SDK real)
│   ├── realtime/                # InMemoryEventBus, MockLangGraphClient
│   ├── storage/                 # InMemoryObjectStorage, SupabaseObjectStorage (stub)
│   ├── security/                # rate_limiter, HMAC signature validator
│   ├── services/                # chunker, embedding, reranker, pdf_extractor, report_renderer (mocks)
│   ├── observability/           # logging JSON, metrics, tracing
│   ├── config.py                # Settings (pydantic-settings)
│   └── factories.py             # DI por env var (get_* factories)
└── interface/
    ├── http/routers/            # health, openapi, metrics, audit, auth, work_orders,
    │                            # sessions, voice, reports, photos, manuals, mock_storage,
    │                            # webhooks/elevenlabs, elevenlabs_tools, admin/elevenlabs
    ├── http/middleware/         # correlation, logging, rate_limit, security_headers
    ├── http/deps/               # auth (get_current_user, require_role)
    ├── http/exception_handlers.py
    ├── ws/                      # handlers (canal de sesión), manager (ConnectionManager)
    ├── cli/                     # elevenlabs (provision/deploy/status/validate-manifest)
    └── main.py                  # create_app() factory + app
```

### 2.2 Reglas de arquitectura efectivas (verificadas en código)
- **Dominio puro:** entidades como `@dataclass(frozen=True, slots=True)` con invariantes en `__post_init__` y transiciones que devuelven copias (`dataclasses.replace`). Sin imports de framework.
- **Puertos = `typing.Protocol`** con type hints completos.
- **Inyección de dependencias:** casos de uso reciben puertos por constructor; el cableado vive en `infrastructure/factories.py` (funciones `get_*`).
- **Determinismo para tests:** reloj (`IClock`) inyectable (`SystemClock` | `InMemoryClock`), singletons in-memory con `reset()`/`reset_singleton()` y `reset_auth_state()` global.
- **Switch por env:** cada factory elige adapter según `Settings` (`memory`/`mock` por defecto; alternativas reales/stub).

---

## 3. Superficie de API implementada

Prefijo global `/v1` salvo endpoints operativos. Todas las rutas autenticadas usan `Bearer` JWT excepto las exentas (`/health`, `/ready`, `/metrics`, `/openapi.json`, `/v1/auth/login`, `/v1/auth/refresh`).

### 3.1 Operativos / observabilidad
| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/health` | Liveness (`status`, `version`, `deps`) | No |
| GET | `/ready` | Readiness; 200/503 según deps configuradas | No |
| GET | `/metrics` | Métricas Prometheus (`text/plain`) | No |
| GET | `/openapi.json` | Esquema OpenAPI generado | No |
| GET | `/v1/audit` | Audit log paginado (filtros actor/action/target) | `rag_admin` |

### 3.2 Auth (`/v1/auth`)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/login` | Email/password → `access_token` + `refresh_token` (JWT HS256) |
| POST | `/refresh` | Rotación de tokens vía refresh |
| POST | `/logout` | Revoca token (204) |
| GET | `/me` | Perfil + rol + `plant_id` del usuario autenticado |

### 3.3 Work Orders (`/v1/work-orders`)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `` | Lista paginada por cursor; filtros `status[]`, `assigned_to`, `priority`, `asset_id`, `limit`. RLS simulado por `assigned_to` |
| GET | `/{id}` | Detalle con join a asset/template/técnico |
| POST | `/{id}/start` | Inicia sesión (201): valida OT `pending`, unicidad de sesión activa, devuelve `session_id` + template + datos de sesión |

### 3.4 Sessions (`/v1/sessions`)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/{id}` | Estado de sesión + `next_seq` |
| GET | `/{id}/events` | Catch-up `since_seq` (paginado, límite 500) |
| POST | `/{id}/events` | Eventos no-voz (202): `command`, `measurement`, `finding`, `step_advance`, `step_skip` con idempotencia por `event_id` |
| POST | `/{id}/pause` | Pausa (204) |
| POST | `/{id}/resume` | Reanuda (204) |
| POST | `/{id}/finalize` | Cierra sesión, genera reporte + PDF, marca OT completada |
| POST | `/{id}/voice/connect` | Emite `signed_url`/`webrtc_token` de ElevenLabs para sesión activa |

### 3.5 Photos
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/v1/sessions/{id}/photos` | Upload multipart (202): valida mime/tamaño/magic bytes, sube a storage, dispara validación VLM (mock), emite eventos |
| GET | `/v1/photos/{id}` | Devuelve foto con signed URL (TTL configurable) |

### 3.6 Reports (`/v1/sessions`)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/{id}/report` | Reporte JSON (build live) |
| GET | `/{id}/report/pdf` | PDF (`application/pdf`) con header `X-Document-SHA256` |

### 3.7 Manuals / RAG
| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/v1/manuals` | Lista manuales | `rag_admin` |
| POST | `/v1/manuals` | Upload PDF (202): valida, sube, dispara indexado async | `rag_admin` |
| GET | `/v1/manuals/{id}` | Detalle + signed URL de descarga | `rag_admin` |
| POST | `/v1/manuals/{id}/reindex` | Reindexa (202) | `rag_admin` |
| DELETE | `/v1/manuals/{id}` | Soft-delete (archiva, 204) | `rag_admin` |
| GET | `/v1/manuals/{id}/search` | Búsqueda dentro de un manual | `rag_admin` |
| POST | `/v1/internal/rag/query` | Query RAG (retrieval + rerank + abstain) | JWT |

### 3.8 Voz / ElevenLabs
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/v1/elevenlabs/webhooks/conversation` | Recibe eventos de conversación con verificación HMAC + ventana de replay |
| POST | `/v1/elevenlabs/tools/{tool_name}` | Tool call del agente; valida pertenencia de sesión al técnico |
| GET | `/v1/admin/elevenlabs/agent/status` | Estado de provisión del agente | 

### 3.9 WebSocket
| Ruta | Descripción |
|---|---|
| `WS /v1/ws/sessions/{session_id}?token=&last_seq=` | Auth JWT por query + pertenencia; primer mensaje `subscribe`; replay desde `last_seq` (`replay.batch`); heartbeat ping/pong con timeout; broadcast vía event bus |

### 3.10 Mock storage (solo `STORAGE=memory`)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/v1/mock-storage/{path}?expires=` | Sirve objetos in-memory validando expiración de la signed URL |

---

## 4. Modelo de dominio implementado

### 4.1 Entidades (`domain/entities/`)
- **User** — `id, email, password_hash, full_name, role, plant_id, is_blocked`.
- **WorkOrder** — `code, asset_id, type(preventive|corrective), priority(low|med|high), status, assigned_to, planned_start/end, procedure_template_id, linked_wo_ids…`; transiciones `assign_to`, `start`, `can_start`.
- **MaintenanceSession** — `work_order_id, technician_id, status, started_at, current_step_index, langgraph_thread_id, ended_at`; `pause/resume/finalize`; `is_active` (activa o pausada).
- **SessionEvent** — evento append-only con `seq`, `event_id` (idempotencia), tipo y payload.
- **EvidencePhoto** — `step_index, storage_path, validation_status, retries, model_version, event_id, criteria`; `mark_accepted/rejected/escalated`.
- **Manual** / **ManualChunk** — manual versionado por `asset_model`; `mark_indexed/index_failed/reindex_pending/archive`.
- **ProcedureTemplate** — `steps` con índices contiguos, `critical_step_indices`, `photo_required_step_indices`, `estimated_minutes` (validados).
- **Asset**, **MaintenanceReport**, **AuditEntry**, **VoiceCommand**, **ToolCall**, **AgentManifest/AgentToolSpec**, **ProvisionState**.

### 4.2 Value objects y enums
- **Role**: `technician`, `supervisor`, `rag_admin`.
- **WorkOrderStatus**: `pending`, `in_progress`, `paused`, `completed`, `cancelled`.
- **SessionStatus**: `active`, `paused`, `finalized`, `aborted`.
- **PhotoStatus**: pending/accepted/rejected/escalated.
- **ManualStatus / IndexStatus**: active/indexing/archived/error · pending/indexed/failed.
- **EventType** (`StrEnum`): tipos REST (`command`, `measurement`, `finding`, `step_advance`, `step_skip`), ciclo de sesión (`session.started/paused/resumed/closed`), pasos (`step.entered/completed/skipped/paused`) y control WS (`event.appended`, `replay.batch`, `ping`, `pong`, `error`).
- **Step**, **Citation**, **RagResult**, **ReportStatus/ReportDiff**, **Action**, **ProvisionStatus**.

### 4.3 Puertos (`domain/ports/`)
- **Repositorios:** `IUserRepository`, `ITokenBlacklist`, `IWorkOrderRepository`, `IProcedureTemplateRepository`, `IAssetRepository`, `ISessionRepository`, `ISessionEventRepository`, `IPhotoRepository`, `IReportRepository`, `IManualRepository`, `IManualChunkRepository`, `IAuditLogRepository`.
- **Servicios:** `IClock`, `IPasswordHasher`, `ITokenService`, `IPhotoValidator`, `IEmbeddingService`, `IRerankerService`, `IChunkerService`, `IPdfExtractor`, `IReportRenderer`.
- **Otros:** `IObjectStorage`, `IEventBus`, puertos de ElevenLabs.

---

## 5. Adapters e integraciones (estado real)

| Puerto / dependencia | Adapter por defecto (funcional) | Adapter alternativo | Estado alternativo |
|---|---|---|---|
| Persistencia (todos los repos) | `InMemory*Repository` (singleton + fixtures + `reset()`) | `Supabase*Repository` | **Stub** (`NotImplementedError`) |
| Auth / usuarios | `InMemoryUserRepository` (JWT HS256) | `SupabaseUserRepository` (`AUTH=supabase_auth`) | Stub |
| Object storage | `InMemoryObjectStorage` (+ router mock-storage) | `SupabaseObjectStorage` | Stub |
| Event bus | `InMemoryEventBus` (pub/sub por sesión) | `redis` | No implementado |
| LangGraph | `MockLangGraphClient` (ejecuta tools localmente) | `langgraph` | No implementado |
| Embeddings | `MockEmbeddingService` (dim configurable) | `openrouter` | No implementado |
| Reranker | `MockReranker` | `openrouter` | No implementado |
| Chunker | `HierarchicalChunker` (real, puro) | — | — |
| PDF extractor | `MockPdfExtractor` | — | — |
| Report renderer | `MockReportRenderer` | `weasyprint` | No implementado |
| Photo validator (VLM) | `MockPhotoValidator` | `openrouter_vlm` | No implementado |
| Intent classifier | `MockIntentClassifier` | `llm` | No implementado |
| ElevenLabs provisioner | `InMemoryElevenLabsProvisioner` | `ElevenLabsSdkProvisioner` (`ELEVENLABS_PROVISIONER=api`) | **Implementado** (SDK v2) |
| ElevenLabs conversation | `InMemoryConversationClient` | `ElevenLabsSdkConversationClient` | **Implementado** |
| Rate limiter | `InMemoryRateLimiter` / `NoOpRateLimiter` | — | — |
| Métricas | `InMemoryMetricsCollector` (render Prometheus) | prometheus (mismo collector) | — |
| Audit log | `InMemoryAuditLogRepository` | `SupabaseAuditLogRepository` | Stub |

> **Nota de fidelidad:** el flujo de voz real con ElevenLabs (provisión declarativa de agente + conexión) sí tiene cliente SDK implementado (BE-09); el resto de integraciones externas (Supabase, OpenRouter, LangGraph, WeasyPrint) están tras el puerto pero aún como stub/mock a la espera de activación.

---

## 6. Flujos clave implementados

### 6.1 Sesión de mantenimiento (feliz)
`POST /work-orders/{id}/start` → crea `MaintenanceSession` (valida OT pending + unicidad) → cliente abre `WS /ws/sessions/{id}` (`subscribe` + replay) → eventos vía `POST /sessions/{id}/events` y/o tools de voz → transiciones de paso → `POST /sessions/{id}/finalize` → genera reporte + PDF → OT `completed`.

### 6.2 Eventos e idempotencia
`AppendEventUseCase` asigna `seq` monotónico por sesión, aplica idempotencia por `event_id` y publica en el event bus; el WS reenvía a los suscriptores (envolviendo ciertos tipos en `event.appended`). `PostSessionEventUseCase` enruta comandos a pausar/reanudar/transición de paso.

### 6.3 Fotos
`UploadPhotoUseCase` valida mime/tamaño/magic bytes, persiste, emite `photo.captured` y dispara `ValidatePhotoUseCase` (mock VLM) → `accepted`/`rejected`/`escalated` con política de reintentos (`PHOTO_MAX_RETRIES`) y eventos WS correspondientes.

### 6.4 RAG
`UploadManualUseCase` → indexado async (`IndexManualUseCase`: extracción → chunking jerárquico → embeddings → persistencia de chunks). `RagQueryUseCase` hace retrieval (`top_k`) + rerank (`top_n`) con umbral de abstención (`RAG_ABSTAIN_THRESHOLD`). Expuesto también como tool de voz `query_manual`.

### 6.5 Voz (ElevenLabs)
Webhook con verificación HMAC + ventana anti-replay → clasificación de intención → enrutado a tools. Tools soportadas: `query_manual`, `mark_step_complete`, `request_photo`, `add_finding`, `add_measurement`, transición de paso y pausa. Provisión del agente vía CLI (`provision`, `deploy`, `status`, `validate-manifest`) leyendo `elevenlabs/agent.yaml`.

### 6.6 Reporte en vivo
`BuildLiveReportUseCase` se suscribe al event bus en el arranque (`lifespan`) y regenera el reporte ante hitos, emitiendo `report.updated` por WS. `FinalizeReportUseCase` consolida y renderiza PDF (mock) con hash SHA256.

---

## 7. Seguridad implementada

- **JWT HS256** (PyJWT) con `access`/`refresh` TTL configurable; blacklist de tokens revocados in-memory.
- **`get_current_user`** valida Bearer, expiración y revocación; **`require_role`** aplica gating por rol.
- **RLS simulado** en repos in-memory (filtrado por `assigned_to`/`technician_id`/plant).
- **Firma de webhook** ElevenLabs HMAC SHA256 con `hmac.compare_digest` + ventana temporal (`ELEVENLABS_SIGNATURE_WINDOW_SECONDS`).
- **Rate limiting** por usuario autenticado (`RATE_LIMIT_PER_MIN`, exenciones para operativos y auth) → 429 `RATE_LIMITED`.
- **Security headers** middleware (`X-Content-Type-Options`, `X-Frame-Options`, etc.), activable por `SECURITY_HEADERS`.
- **Audit log** automático (login, logout, start/finalize session, manual upload/archive).
- **Sin secretos en repo**: solo `.env.example` con placeholders; defaults sin credenciales.

---

## 8. Observabilidad implementada

- **Logs estructurados JSON** con `correlation_id` (header `X-Correlation-Id`) vía middleware.
- **Métricas** en `/metrics` (formato Prometheus text) desde `InMemoryMetricsCollector` (counters/histograms/gauges).
- **Tracing** ligero (`trace_span`) preparado para OTLP.
- **Runbook operativo** (`RUNBOOK.md`) con diagnóstico rápido, incidentes comunes y checks de readiness por adapter.

---

## 9. Configuración (`Settings`)

Cargada desde entorno/`.env` (pydantic-settings, `extra="ignore"`). Selectores de adapter con default seguro:

| Grupo | Variables (default) |
|---|---|
| App | `APP_ENV=dev`, `LOG_LEVEL=INFO`, `APP_VERSION=0.1.0`, `CLOCK_MODE=real` |
| Adapters | `PERSISTENCE=memory`, `AUTH=memory`, `STORAGE=memory`, `LLM=mock`, `VOICE=mock`, `VECTOR_STORE=memory`, `PDF=mock`, `REPORT_BUILDER=memory`, `EVENTBUS=memory` |
| Auth | `JWT_SECRET`, `JWT_ALGORITHM=HS256`, `ACCESS_TOKEN_TTL_SECONDS=3600`, `REFRESH_TOKEN_TTL_SECONDS=2592000`, `PASSWORD_BCRYPT_ROUNDS=10` |
| WS | `WS_HEARTBEAT_INTERVAL=30`, `WS_PONG_TIMEOUT=60`, `WS_REPLAY_ON_CONNECT=true` |
| Fotos | `PHOTO_VALIDATOR=mock`, `PHOTO_MAX_SIZE_MB=10`, `PHOTO_MAX_RETRIES=3`, `SIGNED_URL_TTL_SECONDS=900` |
| RAG | `EMBEDDING=mock`, `EMBEDDING_DIM=384`, `RERANKER=mock`, `CHUNK_SIZE=512`, `CHUNK_OVERLAP=64`, `RAG_TOP_K=8`, `RAG_TOP_N=3`, `RAG_ABSTAIN_THRESHOLD=0.3`, `MANUAL_MAX_SIZE_MB=50` |
| Voz | `INTENT_CLASSIFIER=mock`, `LANGGRAPH=mock`, `ELEVENLABS_WEBHOOK_SECRET`, `ELEVENLABS_SIGNATURE_WINDOW_SECONDS=300`, `ELEVENLABS_PROVISIONER=memory`, `ELEVENLABS_AGENT_MANIFEST`, `ELEVENLABS_STATE_FILE`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_CONNECT_MODE=signed_url` |
| Hardening | `METRICS=memory`, `RATE_LIMIT_PER_MIN=60`, `RATE_LIMIT_ENABLED=true`, `AUDIT_LOG=memory`, `SECURITY_HEADERS=true` |
| Deps externas | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `ELEVENLABS_API_KEY`, `LANGGRAPH_URL` (vacías por defecto) |

`/ready` solo exige credenciales de los adapters que no estén en modo `memory`/`mock`.

---

## 10. Manejo de errores

- **Catálogo único** en `infrastructure/errors.py` (`ErrorCode` StrEnum): incluye genéricos (`INTERNAL_ERROR`, `NOT_FOUND`, `VALIDATION_ERROR`, `FORBIDDEN`, `UNAUTHORIZED`), auth (`INVALID_CREDENTIALS`, `TOKEN_EXPIRED`), dominio (`WORK_ORDER_*`, `SESSION_*`, `STEP_*`, `PHOTO_*`, `MANUAL_*`, `PROCEDURE_TEMPLATE_INVALID`, `REPORT_NOT_FOUND`) e integraciones (`LANGGRAPH_UNAVAILABLE`, `ELEVENLABS_UNAVAILABLE`, `AGENT_NOT_PROVISIONED`, `VOICE_CONNECT_FAILED`, `OPENROUTER_UNAVAILABLE`, `INVALID_SIGNATURE`, `RATE_LIMITED`, `IDEMPOTENCY_KEY_REUSED`).
- **`exception_handlers.py`** traduce `DomainError` al envelope de error de `integration_contracts.md` (con `code`, `message`, `details`, `trace_id`).

---

## 11. Testing (estado real)

| Tipo | Ubicación | Nº archivos | Foco |
|---|---|---|---|
| Unit | `tests/unit/{domain,application,infrastructure}` | 50 | invariantes de entidades, casos de uso, servicios/adapters |
| Integration | `tests/integration` | 34 | routers, middleware, WS handshake, repos in-memory, webhook, tools |
| E2E | `tests/e2e` | 10 | flujos completos (foundation, auth, work-orders, ws, photos, rag, report, voice, provisión, full-flow) |
| Contract | `tests/contract` | 2 | OpenAPI (schemathesis) + shapes de WebSocket |

- **Total: 96 archivos / 245 funciones de test.**
- `pytest` con `asyncio_mode=auto`, `pythonpath=["src"]`.
- Determinismo garantizado por `reset_auth_state()` y singletons con `reset()`.

---

## 12. Ejecución

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env

# Servidor
uvicorn interface.main:app --reload --app-dir src

# Tests
pytest -q

# Calidad
ruff check src/ tests/
mypy src/domain src/application   # strict

# CLI ElevenLabs
python -m interface.cli.elevenlabs validate-manifest
python -m interface.cli.elevenlabs provision --dry-run
```

---

## 13. Gaps conocidos vs. `PRD-backend.md`

Elementos descritos en el PRD objetivo que **aún no** están implementados en código (o están como stub):

- Adapters **Supabase** (persistencia, storage, auth, audit): stubs `NotImplementedError`.
- **OpenRouter** real (LLM, embeddings, reranker, VLM de fotos): solo mocks.
- **LangGraph** real (checkpointer Postgres, state machine): `MockLangGraphClient`.
- **WeasyPrint** para PDF real: `MockReportRenderer`.
- **Procedure Templates** y **Assets** como CRUD/routers dedicados (`/v1/procedure-templates`, `/v1/assets`): no expuestos como router; se usan vía repos.
- **Redis** para event bus / rate limit distribuido: no implementado.
- **OpenTelemetry OTLP** export completo y dashboards/alertas Grafana: tracing ligero presente, export no cableado.
- **Derived work orders**, versionado de reporte y admin override avanzado: parciales.
- **Mock server standalone** separado (`mock_server/`): el modo mock vive dentro de la app, no como servicio aparte.

Estos gaps son el candidato natural para los próximos planes; cualquier cambio que afecte contrato requiere PR `contract/` según reglas del repo.

---

## 14. Criterios de aceptación (estado actual)

- [x] OpenAPI servido en `/openapi.json`.
- [x] Contract tests (OpenAPI + WS) presentes y pasando.
- [x] Webhook ElevenLabs rechaza requests sin firma válida.
- [x] `/ready` responde 200 en modo `memory`/`mock` sin deps externas; 503 si falta credencial de adapter real.
- [x] Logs estructurados con `correlation_id`.
- [x] Flujo E2E completo (login → start → eventos → fotos → finalize → PDF) verde con mocks.
- [ ] Adapters reales (Supabase/OpenRouter/LangGraph/WeasyPrint) activados y testeados.
- [ ] RLS real en Postgres con usuarios por rol.
