# BE-08 — Observability + Contract Tests + Hardening

**Estado:** ⏳
**Depende de:** BE-01..07
**Desbloquea:** —
**PRD features:** F14.1, F14.2, F14.3, F14.4, F14.5, F15 (full), F16, F18
**Stack:** backend · capas: infrastructure (observability, audit, rate limit) + interface (openapi, ready, audit) + tests

## Goal

Backend production-ready: OpenAPI servido en `/openapi.json`, contract tests contra ese OpenAPI, métricas Prometheus (in-memory collector), `/ready` chequea deps reales (config-level), audit log automático, rate limiting in-memory, security headers, catálogo de errores completo, runbook.

## Capas afectadas

### Domain
- `entities/audit_entry.py` — `AuditEntry(id, actor_user_id, action, target_type, target_id, payload, created_at)`
- `value_objects/action.py` — enum de acciones auditables
- `exceptions.py` — añadir `RateLimitedError`, `ServiceUnavailableError`

### Application
- `use_cases/audit/log.py` — append entry (idempotente por `entry_id`)
- `use_cases/audit/list.py` — query (admin)
- Hooks de auditoría via decorador sobre use cases críticos: login, logout, start_session, finalize_session, manual_upload, manual_archive, admin_override

### Infrastructure
- `observability/metrics.py` — `InMemoryMetricsCollector` con `Counter`, `Histogram`, `Gauge`; expone `/metrics` en Prometheus text format
- `observability/tracing.py` — wrapper simple con `correlation_id` propagation (sin OTel todavía, solo logs estructurados con spans `{name, start, duration_ms}`)
- `infrastructure/security/rate_limiter.py` — `InMemoryRateLimiter` con sliding window por `user_id`; configurable via `RATE_LIMIT_PER_MIN`
- `infrastructure/security/audit_log.py` — `InMemoryAuditLogRepository`
- `infrastructure/factories.py` — añadir todas las nuevas factories

### Interface
- `http/middleware/security_headers.py` — añade `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `Referrer-Policy: no-referrer`
- `http/middleware/rate_limit.py` — aplica limiter a endpoints mutacionales
- `http/exception_handlers.py` — añadir todos los códigos restantes del catálogo `integration_contracts.md` §9
- `http/routers/health.py` — `/ready` chequea config (Supabase configured? ElevenLabs configured? OpenRouter configured? LangGraph configured?)
- `http/routers/openapi.py` — sirve `openapi.json` (generado por FastAPI)
- `http/routers/metrics.py` — `/metrics` Prometheus
- `http/routers/audit.py` — `GET /v1/audit` (admin only)

## Switch vía .env

```
METRICS=memory|prometheus
RATE_LIMIT_PER_MIN=60
RATE_LIMIT_ENABLED=true
AUDIT_LOG=memory|supabase
SECURITY_HEADERS=true
```

## Tests que se escriben PRIMERO

### Unit
1. `tests/unit/application/test_rate_limiter.py` — N requests OK, N+1 rechaza, ventana expira
2. `tests/unit/application/test_audit_log.py` — append, list por filtros, append-only (no update/delete)
3. `tests/unit/infrastructure/test_metrics.py` — counters incrementan, histogram observa valores, gauge set
4. `tests/unit/application/test_security_headers.py` — middleware añade headers correctos

### Integration
5. `tests/integration/test_openapi_served.py` — `GET /openapi.json` 200, contiene todas las rutas
6. `tests/integration/test_ready.py` — `/ready` 200 cuando deps configuradas, 503 cuando falta
7. `tests/integration/test_metrics_endpoint.py` — `/metrics` formato Prometheus válido
8. `tests/integration/test_rate_limit_middleware.py` — 429 tras N requests
9. `tests/integration/test_audit_hooks.py` — login emite audit entry
10. `tests/integration/test_security_headers_middleware.py` — headers presentes

### Contract (Schemathesis)
11. `tests/contract/test_openapi_compliance.py` — fuzz a todos los endpoints contra `openapi.yaml` (generado por FastAPI)
12. `tests/contract/test_websocket_contract.py` — eventos WS cumplen shapes de `asyncapi.yaml`

### E2E
13. `tests/e2e/test_full_flow_e2e.py` — login → work-orders → start session → events (incluye webhook simulado) → photos → finalize → PDF → audit entries presentes

## Implementación mínima para verde

- Schemathesis config: target = `create_app()`, max_examples=50, validar response schema + status.
- `/ready` chequea: si `AUTH=supabase` y `SUPABASE_URL` no set → 503; idem para otros.
- Rate limiter: `dict[user_id, deque[timestamp]]`; si `len > RATE_LIMIT_PER_MIN` en últimos 60 s → 429.
- Audit hooks via decorador `@audit("login", target_type="user")` sobre use cases.
- Metrics default = in-memory (expone dict serializado a Prometheus text format manualmente).

## Archivos a crear/modificar

```
backend/src/domain/entities/audit_entry.py
backend/src/domain/value_objects/action.py
backend/src/domain/exceptions.py                           # MODIFY
backend/src/application/use_cases/audit/log.py
backend/src/application/use_cases/audit/list.py
backend/src/application/decorators/audit.py               # NEW
backend/src/infrastructure/observability/metrics.py
backend/src/infrastructure/observability/tracing.py
backend/src/infrastructure/security/rate_limiter.py
backend/src/infrastructure/security/audit_log.py
backend/src/infrastructure/persistence/in_memory/audit_log_repository.py
backend/src/infrastructure/persistence/supabase/audit_log_repository.py  # stub
backend/src/infrastructure/factories.py                                   # MODIFY
backend/src/interface/http/middleware/security_headers.py
backend/src/interface/http/middleware/rate_limit.py
backend/src/interface/http/exception_handlers.py                          # MODIFY (full catalog)
backend/src/interface/http/routers/health.py                              # MODIFY (ready)
backend/src/interface/http/routers/openapi.py
backend/src/interface/http/routers/metrics.py
backend/src/interface/http/routers/audit.py
backend/tests/contract/__init__.py
backend/tests/contract/test_openapi_compliance.py
backend/tests/contract/test_websocket_contract.py
backend/tests/e2e/test_full_flow_e2e.py
```

## Catálogo de errores — final

Verificar que TODOS los códigos de `integration_contracts.md` §9 estén en `errors.py`:
`UNAUTHORIZED, FORBIDDEN, NOT_FOUND, IDEMPOTENCY_KEY_REUSED, WORK_ORDER_NOT_FOUND, WORK_ORDER_ALREADY_STARTED, WORK_ORDER_ALREADY_COMPLETED, SESSION_NOT_FOUND, SESSION_ALREADY_FINALIZED, STEP_CRITICAL_CANNOT_SKIP, STEP_REQUIRES_PHOTO, STEP_OUT_OF_ORDER, STEP_ALREADY_DONE, PHOTO_NOT_FOUND, PHOTO_VALIDATION_FAILED, MANUAL_NOT_FOUND, MANUAL_INDEXING_FAILED, MANUAL_INVALID_PDF, PROCEDURE_TEMPLATE_INVALID, RATE_LIMITED, LANGGRAPH_UNAVAILABLE, ELEVENLABS_UNAVAILABLE, OPENROUTER_UNAVAILABLE, INTERNAL_ERROR, INVALID_SIGNATURE, INVALID_CREDENTIALS, TOKEN_EXPIRED`.

## E2E test scenario

```bash
# 1. openapi servido
curl .../openapi.json | jq '.paths | keys'
# esperado: contiene /v1/auth/login, /v1/work-orders, /v1/sessions, /v1/photos, /v1/reports, /v1/manuals, /v1/elevenlabs/*

# 2. metrics
curl .../metrics
# esperado: text/plain con líneas # HELP, # TYPE, contadores http_requests_total, etc.

# 3. rate limit
for i in {1..70}; do
  curl -s -o /dev/null -w "%{http_code}\n" .../v1/auth/me -H "Authorization: Bearer $TOKEN"
done
# esperado: primeros 60 → 200, resto → 429

# 4. security headers
curl -I .../health
# esperado: X-Content-Type-Options, X-Frame-Options, etc.

# 5. ready
curl .../ready
# esperado: 200 (con todas las deps en memory)

# 6. audit
curl .../v1/audit -H "Authorization: Bearer $ADMIN_TOKEN"
# esperado: lista de entries con login, work_order_start, session_finalize

# 7. contract test
pytest tests/contract/ -v
# esperado: 0 fallos
```

## Definition of Done

- [ ] `pytest -q` pasa 100 % (incluye contract tests)
- [ ] `/openapi.json` se sirve y es válido
- [ ] `/ready` refleja configuración de deps reales
- [ ] `/metrics` formato Prometheus válido
- [ ] Rate limiting activo en mutaciones (configurable)
- [ ] Security headers en todas las respuestas
- [ ] Catálogo de errores completo
- [ ] Audit hooks en al menos: login, logout, start_session, finalize_session, manual_upload, manual_archive
- [ ] `tests/contract/test_openapi_compliance.py` pasa contra todos los routers
- [ ] `tests/e2e/test_full_flow_e2e.py` pasa flujo completo end-to-end
- [ ] Runbook (`backend/RUNBOOK.md`) documenta operación

## Variables de entorno nuevas

```
METRICS=memory|prometheus
RATE_LIMIT_PER_MIN=60
RATE_LIMIT_ENABLED=true
AUDIT_LOG=memory|supabase
SECURITY_HEADERS=true
```

## Notas

- OTel traces NO se introducen aquí (opcional; logs estructurados bastan para demo). Si se requiere, sería un plan BE-09.
- Los `*Supabase*` stubs se mantienen — la migración real es proyecto aparte, fuera del scope de demo.