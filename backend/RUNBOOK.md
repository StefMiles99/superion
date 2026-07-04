# SUPERION Backend — Runbook operativo

Documento de operación para BE-08 (observability + hardening).

## Endpoints operativos

| Endpoint | Propósito | Código OK |
|---|---|---|
| `GET /health` | Liveness — proceso vivo | 200 |
| `GET /ready` | Readiness — deps configuradas | 200 / 503 |
| `GET /metrics` | Métricas Prometheus (text/plain) | 200 |
| `GET /openapi.json` | Esquema OpenAPI generado | 200 |
| `GET /v1/audit` | Audit log (solo `rag_admin`) | 200 |

## Variables de entorno críticas

```bash
METRICS=memory              # memory | prometheus
RATE_LIMIT_PER_MIN=60       # requests/min por usuario autenticado
RATE_LIMIT_ENABLED=true
AUDIT_LOG=memory            # memory | supabase
SECURITY_HEADERS=true
```

Cuando un adapter apunta a servicio real, `/ready` exige credenciales:

- `AUTH=supabase_auth` → `SUPABASE_URL`
- `PERSISTENCE=supabase` → `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- `LLM=openrouter` / `EMBEDDING=openrouter` → `OPENROUTER_API_KEY`
- `VOICE=elevenlabs` → `ELEVENLABS_API_KEY`
- `LANGGRAPH=langgraph` → `LANGGRAPH_URL`

Con defaults `memory`/`mock`, `/ready` responde 200 sin deps externas.

## Diagnóstico rápido

```bash
# Liveness
curl -s http://localhost:8000/health | jq .

# Readiness
curl -s http://localhost:8000/ready | jq .

# Métricas
curl -s http://localhost:8000/metrics | head -20

# OpenAPI
curl -s http://localhost:8000/openapi.json | jq '.paths | keys | length'

# Security headers
curl -sI http://localhost:8000/health | grep -E 'X-Content-Type|X-Frame|Strict-Transport|Referrer'
```

## Rate limiting

- Aplica a requests autenticados (Bearer JWT válido).
- Exentos: `/health`, `/ready`, `/metrics`, `/openapi.json`, `/v1/auth/login`, `/v1/auth/refresh`.
- Al exceder límite: HTTP 429 con código `RATE_LIMITED`.

## Audit log

Acciones registradas automáticamente:

- `login`, `logout`
- `start_session`, `finalize_session`
- `manual_upload`, `manual_archive`

Consulta (admin):

```bash
curl -s http://localhost:8000/v1/audit \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

## Tests

```bash
cd backend
pytest -q                          # suite completa
pytest tests/contract/ -v          # contract (Schemathesis + WS shapes)
pytest tests/e2e/test_full_flow_e2e.py -v
```

## Incidentes comunes

| Síntoma | Causa probable | Acción |
|---|---|---|
| `/ready` 503 | Adapter real sin credenciales | Completar env vars o volver a `memory`/`mock` |
| 429 masivo | Rate limit bajo o cliente en loop | Subir `RATE_LIMIT_PER_MIN` o desactivar `RATE_LIMIT_ENABLED` en dev |
| Audit vacío | `AUDIT_LOG=supabase` stub | Usar `AUDIT_LOG=memory` hasta migración Supabase |
| Contract test falla | OpenAPI desincronizado con routers | Regenerar y revisar diff en `/openapi.json` |

## Logs

Logs JSON estructurados con `correlation_id` (header `X-Correlation-Id`).
Spans ligeros vía `infrastructure.observability.tracing.trace_span`.

Refs: `plans/backend/08-observability-hardening.md`, PRD-backend.md F14–F16.
