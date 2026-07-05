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

- `AUTH=supabase_auth` → `DATABASE_URL` (tabla `app_user`)
- `PERSISTENCE=supabase` → `DATABASE_URL`
- `AUDIT_LOG=supabase` → `DATABASE_URL`
- `STORAGE=supabase` → `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- `LLM=openrouter` / `EMBEDDING=openrouter` → `OPENROUTER_API_KEY`
- `VOICE=elevenlabs` → `ELEVENLABS_API_KEY`
- `LANGGRAPH=langgraph` → `LANGGRAPH_URL`

Con defaults `memory`/`mock`, `/ready` responde 200 sin deps externas.

## Postgres / Supabase (persistencia real)

Ver también `backend/.env.cloudrun.example` para demo Cloud Run sin mock.

1. Configura en `.env`:

```bash
PERSISTENCE=supabase
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
# Opcional — auth contra la misma DB:
AUTH=supabase_auth
AUDIT_LOG=supabase
# Opcional — blobs en Supabase Storage:
STORAGE=supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=superion
```

2. Migra y siembra fixtures (usuarios, activos, OTs, plantillas):

```bash
cd backend
PYTHONPATH=src python -m interface.cli.seed
# o con DSN explícito:
PYTHONPATH=src python -m interface.cli.seed --dsn "$DATABASE_URL"
```

3. Arranca la API y verifica readiness:

```bash
curl -s http://localhost:8000/ready | jq .
```

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

## Cloud Run (demo producción)

```bash
# 1. Supabase: ejecutar 0001_init.sql + seed
cp backend/.env.cloudrun.example backend/.env.cloudrun
# completar DATABASE_URL, keys, Redis (Upstash), etc.

PYTHONPATH=src python -m interface.cli.seed

# 2. Secrets GCP (opcional pero recomendado)
./scripts/setup-gcp-secrets.sh YOUR_GCP_PROJECT

# 3. Deploy
./scripts/deploy-cloud-run.sh YOUR_GCP_PROJECT us-central1

# 4. Post-deploy
curl -s https://YOUR-BACKEND.run.app/ready | jq .
API_BASE_URL=https://YOUR-BACKEND.run.app python -m interface.cli.elevenlabs deploy
```

Variables clave (ninguna en mock): ver `backend/.env.cloudrun.example`.
