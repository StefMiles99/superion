# BE-00 — Foundation

**Estado:** ⏳
**Depende de:** —
**Desbloquea:** BE-01..08
**PRD features:** F18 (mock server), F15 (errors catalog), F8.1 (health)
**Stack:** backend · capas: domain skeleton + application skeleton + infrastructure skeleton + interface skeleton

## Goal

Skeleton FastAPI con arquitectura hexagonal completa, configuración por `.env`, endpoints `/health` y `/ready`, infraestructura in-memory wired, y un test E2E que verifica que el árbol completo levanta y responde.

## Capas afectadas

### Domain (núcleo)
- `entities/__init__.py` vacío pero con `__all__` documentado
- `value_objects/__init__.py` con `Clock` port (`now()`)
- `ports/__init__.py` con `IUnitOfWork` (placeholder)
- `exceptions.py` con `DomainError`, `NotFoundError`, `ValidationError`, `ForbiddenError`
- `services/__init__.py` con `SystemClock` (impl real de `Clock`)

### Application
- `use_cases/health/__init__.py` con `HealthCheck` use case (puro, devuelve dict)
- `dto/__init__.py` con DTOs base `HealthDTO`, `ErrorDTO`

### Infrastructure
- `config.py` con `Settings` (pydantic-settings) leyendo `.env`
- `factories.py` con `get_settings()` y placeholders para futuras factories
- `persistence/in_memory/clock.py` con `InMemoryClock` (avanzable manualmente, útil para tests deterministas)
- `observability/logging.py` con logger estructurado JSON
- `errors.py` con catálogo `ErrorCode` (mínimo: `INTERNAL_ERROR`, `NOT_FOUND`, `VALIDATION_ERROR`)

### Interface
- `main.py` con factory `create_app(settings)`
- `http/middleware/correlation.py` que añade `X-Correlation-Id`
- `http/middleware/logging.py` que loguea cada request
- `http/routers/health.py` con `GET /health` y `GET /ready`
- `http/exception_handlers.py` mapea `DomainError` → envelope §1.8

## Switch vía .env

```
APP_ENV=dev
LOG_LEVEL=INFO
PERSISTENCE=memory
LLM=mock
VOICE=mock
VECTOR_STORE=memory
STORAGE=memory
PDF=mock
AUTH=memory
CLOCK_MODE=real|memory
```

Defaults = todo memory/mock. El plan no introduce ningún servicio externo real.

## Tests que se escriben PRIMERO

1. `tests/unit/domain/test_exceptions.py` — jerarquía de excepciones
2. `tests/unit/application/test_health_check.py` — devuelve status + version + deps
3. `tests/unit/infrastructure/test_settings.py` — carga `.env`, defaults OK
4. `tests/integration/test_app_factory.py` — `create_app()` retorna instancia FastAPI
5. `tests/integration/test_correlation_middleware.py` — añade correlation_id
6. `tests/e2e/test_foundation_e2e.py` — arranca app, hace `GET /health` → 200 con shape definido

## Implementación mínima para verde

- Settings con pydantic.
- App factory que monta middleware + routers.
- Logger con `correlation_id` en contexto.
- Exception handlers que devuelven envelope.
- Health check que devuelve `{"status":"ok","version":"0.1.0","deps":{}}`.
- Ready check que de momento devuelve 200 (no hay deps externas aún).

## Archivos a crear

```
backend/
├── pyproject.toml
├── .env.example
├── .env                        # gitignored, defaults memoria
├── README.md
├── src/
│   ├── __init__.py
│   ├── domain/
│   │   ├── __init__.py
│   │   ├── entities/__init__.py
│   │   ├── value_objects/__init__.py
│   │   ├── ports/__init__.py
│   │   ├── services/__init__.py
│   │   └── exceptions.py
│   ├── application/
│   │   ├── __init__.py
│   │   ├── dto/__init__.py
│   │   └── use_cases/health.py
│   ├── infrastructure/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── factories.py
│   │   ├── errors.py
│   │   ├── observability/logging.py
│   │   └── persistence/in_memory/clock.py
│   └── interface/
│       ├── __init__.py
│       ├── main.py
│       ├── http/
│       │   ├── middleware/correlation.py
│       │   ├── middleware/logging.py
│       │   ├── routers/health.py
│       │   └── exception_handlers.py
│       └── ws/__init__.py
└── tests/
    ├── conftest.py             # fixtures: settings, client, app
    ├── unit/
    ├── integration/
    └── e2e/
```

## E2E test scenario

```bash
# 1. arrancar backend
cd backend
cp .env.example .env
uvicorn interface.main:app --reload

# 2. health
curl -i http://localhost:8000/health
# esperado: 200, body {"status":"ok","version":"0.1.0","deps":{}}

# 3. correlation id propagación
curl -i -H "X-Correlation-Id: test-123" http://localhost:8000/health
# esperado: response incluye header X-Correlation-Id: test-123

# 4. ready
curl -i http://localhost:8000/ready
# esperado: 200, body {"status":"ready"}

# 5. error envelope (forzar 404)
curl -i http://localhost:8000/v1/does-not-exist
# esperado: 404, body {"error":{"code":"NOT_FOUND","message":"...","trace_id":"..."}}
```

## Definition of Done

- [ ] `pytest -q` pasa 100 % (unit + integration + e2e)
- [ ] `GET /health` y `GET /ready` responden según contrato
- [ ] Correlation ID se propaga
- [ ] Errores usan envelope §1.8
- [ ] Sin claves ni servicios externos necesarios
- [ ] `pip install -e .` levanta la app
- [ ] `.env.example` documenta todas las vars

## Variables de entorno nuevas

```
APP_ENV=dev|prod
LOG_LEVEL=DEBUG|INFO|WARNING|ERROR
APP_VERSION=0.1.0
CLOCK_MODE=real|memory
PERSISTENCE=memory|supabase
LLM=mock|openrouter
VOICE=mock|elevenlabs
VECTOR_STORE=memory|pgvector
STORAGE=memory|supabase
PDF=mock|weasyprint
AUTH=memory|supabase_auth
```

## Notas

- No introducir SQLAlchemy ni Supabase client todavía. Eso llega en BE-08 (hardening) si hace falta.
- El catálogo de errores se ampliará en cada plan; aquí solo los mínimos.