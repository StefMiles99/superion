# AGENTS.md — Backend SUPERION

Reglas específicas para trabajar en el subproyecto backend. Las reglas globales viven en [`/AGENTS.md`](../AGENTS.md). Este archivo **no las duplica**, las concreta.

---

## Stack

Python 3.12 · FastAPI · Pydantic v2 · pytest · schemathesis · LangGraph · Supabase (Postgres + pgvector + Storage) · OpenRouter · ElevenLabs (vía webhook).

---

## Contexto obligatorio antes de tocar código

Antes de empezar **cualquier plan** del backend:

1. Lee [`PRD-backend.md`](../PRD-backend.md) — features F1–F18.
2. Lee el plan concreto: [`plans/backend/<NN>-<name>.md`](../plans/backend/).
3. Lee [`plans/CLEAN-ARCHITECTURE.md`](../plans/CLEAN-ARCHITECTURE.md) — capas y reglas de env.
4. Lee [`integration_contracts.md`](../integration_contracts.md) — REST + WS + LangGraph + ElevenLabs.

Si una decisión contradice el PRD, consulta al humano antes de implementar.

---

## Setup local con Docker (opcional)

Si un plan requiere DB real o integración cercana a producción, levanta el subproyecto con su compose (no es obligatorio para unit tests — esos corren con mocks en memoria):

```bash
cd backend
docker compose up -d
# API en http://localhost:8000, Postgres en localhost:5432
docker compose -f docker-compose.dev.yml up  # hot-reload
```

Variables vía `backend/.env.docker` (gitignored). Plantilla en `.env.docker.example`.

Detalle de la estrategia completa en [`plans/DOCKER.md`](../plans/DOCKER.md).

---

## Estructura esperada del proyecto

```
backend/
├── src/
│   ├── domain/                  # entidades, value objects, ports (Protocol)
│   │   ├── entities/
│   │   ├── value_objects/
│   │   ├── ports/
│   │   ├── services/            # impls puras (clock, hash, tokens)
│   │   └── exceptions.py
│   ├── application/             # use cases + DTOs + decorators
│   │   ├── use_cases/
│   │   ├── dto/
│   │   └── decorators/
│   ├── infrastructure/          # adapters in-memory + stubs reales
│   │   ├── persistence/
│   │   │   ├── in_memory/
│   │   │   └── supabase/        # stubs con NotImplementedError
│   │   ├── external/            # openrouter, elevenlabs, langgraph
│   │   ├── storage/
│   │   ├── observability/       # logging, metrics, tracing
│   │   ├── security/            # rate_limit, signature, audit
│   │   ├── realtime/            # event_bus, ws_manager
│   │   └── factories.py
│   ├── interface/               # FastAPI routers, WS, webhooks
│   │   ├── http/
│   │   │   ├── routers/
│   │   │   ├── middleware/
│   │   │   ├── deps/
│   │   │   └── exception_handlers.py
│   │   ├── ws/
│   │   └── webhooks/
│   ├── config.py
│   └── main.py                  # app factory
├── tests/
│   ├── unit/                    # domain + application
│   ├── integration/             # routers + middleware + adapters in-memory
│   ├── e2e/                     # flujos completos
│   └── contract/                # schemathesis contra openapi.yaml
├── pyproject.toml
├── .env.example
└── README.md
```

---

## Clean Architecture (backend) — reglas concretas

### Domain
- Cero imports de FastAPI, Pydantic, SQLAlchemy, asyncio, httpx, logging.
- Solo stdlib + typing.
- Entidades como `@dataclass` (o `BaseModel` solo si necesitan validación, pero suele evitarse en domain).
- Ports = `typing.Protocol` con type hints completos (no `ABC`).
- Excepciones de dominio (`DomainError`, `NotFoundError`, `ValidationError`, `RuleViolationError`) en `domain/exceptions.py`. **No** en application ni interface.
- Regla: si necesita I/O para probarse, no es domain.

### Application
- Use cases = funciones o clases `async`. Reciben puertos por constructor o por DI.
- Un use case = una acción de negocio. Nombre en imperativo (`StartSession`, `UploadPhoto`).
- Orquestan repos + services; **no** hacen I/O directo (ni `httpx`, ni `asyncpg`, ni `requests`).
- DTOs = `pydantic.BaseModel` con `model_config = ConfigDict(extra="forbid")`.
- Errores: lanzar `DomainError` con `code` estable.
- Decoradores (`@audit`, `@idempotent`) en `application/decorators/`.

### Infrastructure
- Cada adapter en `infrastructure/<servicio>/<adaptador>.py`.
- Naming: `<Servicio><Port>` → `SupabaseWorkOrderRepository`, `MockJwtTokenService`, `InMemoryEventBus`.
- `*InMemory*` siempre funcional desde el primer commit; `*Supabase*` y `*Real*` arrancan como stub con `raise NotImplementedError("SupabaseWorkOrderRepository.list — implementar al activar BE-08")`.
- Config vía `settings.<X>` (pydantic-settings); nunca `os.getenv` directo.
- Toda impl in-memory con `asyncio.Lock` y método `reset()` para tests.

### Interface
- Routers solo orquestan: validan con pydantic → llaman use case → formatean response.
- Middleware global: `correlation_id`, `logging`, `security_headers`, `rate_limit`.
- WebSocket handlers separados de HTTP (`interface/ws/`, no `interface/http/ws/`).
- Webhook handlers en `interface/webhooks/<servicio>.py`.
- `exception_handlers.py` mapea `DomainError` → envelope de `integration_contracts.md` §1.8.

---

## AI-TDD — secuencia concreta por plan

Cada plan en `plans/backend/` declara tests explícitos. Esta es la secuencia canónica.

### Paso 1 — Tests rojos (orden de escritura)
```python
# 1. Tests unit del NUEVO domain
# tests/unit/domain/test_<entity>.py
def test_<entity>_invariants(): ...

# 2. Tests unit del NUEVO application
# tests/unit/application/test_<use_case>.py
async def test_<use_case>_happy_path(): ...
async def test_<use_case>_error_<caso>(): ...

# 3. Tests de integration del NUEVO adapter in-memory
# tests/integration/test_<port>_in_memory.py
async def test_<adapter>_<method>(): ...

# 4. Tests de integration del NUEVO router
# tests/integration/test_<router>.py
async def test_<endpoint>_<caso>(): ...

# 5. Test E2E (al final del plan)
# tests/e2e/test_<plan>_e2e.py
async def test_full_flow_<plan>(): ...
```

### Paso 2 — Verificar rojo
```bash
pytest tests/unit/domain/test_<entity>.py -x --no-header
# debe fallar por la razón correcta (NameError, NotImplementedError, AssertionError)
```

### Paso 3 — Implementación mínima
- Solo lo necesario para que el test pase.
- Sin over-engineering, sin abstracciones especulativas.

### Paso 4 — Verde
```bash
pytest tests/unit/domain/ tests/unit/application/ -q
```

### Paso 5 — Refactor
- Extraer funciones puras si una hace dos cosas.
- Renombrar para consistencia.
- Sin cambiar comportamiento. Re-correr tests.

### Paso 6 — Integration + E2E
```bash
pytest tests/integration/ tests/e2e/ -q
```

### Paso 7 — Contract (si aplica)
```bash
pytest tests/contract/ -q
```

### Paso 8 — Commit
```bash
git add tests/unit/domain/test_<entity>.py
git commit -m "test(be-<NN>): añadir tests de invariantes de <entity>"
# ahora implementar
git add src/domain/entities/<entity>.py
git commit -m "feat(be-<NN>): añadir entidad <entity> con invariantes"
```

---

## In-memory discipline

- Thread-safe: `asyncio.Lock` por store.
- Fixtures sembrados al instanciar (3 técnicos, 5 OTs, 1 manual, 1 plantilla por defecto).
- `reset()` para tests E2E deterministas.
- **No** `datetime.now()` en código de producción → inyectar `IClock`.
- **No** `random.random()` en lógica → inyectar `IRandom` o seed.
- **No** `uuid4()` fuera de factories de ID → inyectar `IIdGenerator` (en código testeable).

```python
# Patrón de inyección
class StartSessionUseCase:
    def __init__(self, sessions: ISessionRepository, ids: IIdGenerator, clock: IClock):
        self._sessions = sessions
        self._ids = ids
        self._clock = clock

    async def execute(self, input: StartSessionInput) -> StartSessionOutput:
        session = MaintenanceSession(
            id=self._ids.new(),
            started_at=self._clock.now(),
            ...
        )
        await self._sessions.save(session)
```

---

## Switch por env (factorías)

```python
# src/infrastructure/factories.py
def get_work_order_repository() -> IWorkOrderRepository:
    if settings.PERSISTENCE == "memory":
        return InMemoryWorkOrderRepository.shared()
    if settings.PERSISTENCE == "supabase":
        return SupabaseWorkOrderRepository(
            url=settings.SUPABASE_URL,
            service_key=settings.SUPABASE_SERVICE_ROLE_KEY,
        )
    raise ValueError(f"PERSISTENCE={settings.PERSISTENCE} no soportado")
```

### Defaults = memory/mock
Toda env var nueva arranca con valor `memory`/`mock` para que el plan corra sin servicios externos.

### `.env.example`
- Toda env var añadida debe estar en `.env.example` con comentario.
- Sin secretos reales (placeholders tipo `change-me`).

---

## Tests — patrones

### Unit (domain + application)
```python
import pytest

@pytest.fixture
def repo():
    return InMemoryUserRepository.with_fixtures()

@pytest.fixture
def use_case(repo):
    return LoginUseCase(
        users=repo,
        hasher=BcryptPasswordHasher(),
        tokens=JwtTokenService(secret="test", clock=SystemClock()),
        clock=SystemClock(),
    )

async def test_login_with_valid_credentials_returns_session(use_case):
    result = await use_case.execute(LoginInput("juan@planta.com", "test1234"))
    
    assert result.access_token.startswith("eyJ")
    assert result.user.role == Role.TECHNICIAN
    assert result.user.plant_id == "plant-1"
```

### Integration (routers + adapters)
```python
async def test_upload_photo_returns_202(client, auth_headers, session):
    response = await client.post(
        f"/v1/sessions/{session.id}/photos",
        files={"file": ("photo.jpg", b"Aimagen-ok", "image/jpeg")},
        data={"step_index": "3", "event_id": str(uuid4()), "criteria": "sensor"},
        headers=auth_headers,
    )
    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "pending"
```

### E2E (flujo completo)
```python
async def test_full_session_flow(client, db, ws_client):
    # login → start session → events (incluye webhook simulado) → photos → finalize → pdf
    ...
```

### Contract (Schemathesis)
```python
# tests/contract/test_openapi_compliance.py
import schemathesis

schema = schemathesis.openapi.from_path("openapi.json")

@schema.parametrize()
async def test_api_compliance(case):
    response = await case.call(base_url="http://test")
    case.validate_response(response)
```

---

## Errores

### Catálogo único
`src/infrastructure/errors.py` con `class ErrorCode(str, Enum)`. Cada código mapea a HTTP + mensaje. Cobertura completa: ver `integration_contracts.md` §9.

### Uso
```python
# domain
raise NotFoundError(code=ErrorCode.WORK_ORDER_NOT_FOUND, details={"id": wo_id})

# interface (exception handler traduce a envelope)
return JSONResponse(
    status_code=404,
    content={"error": {"code": "WORK_ORDER_NOT_FOUND", "message": "...", "details": {...}, "trace_id": trace_id}}
)
```

---

## Observabilidad

- Logs estructurados JSON con `correlation_id`, `user_id`, `session_id`, `route`, `status`, `duration_ms`.
- **Nunca** loguear secrets, tokens completos, audio crudo, contenido completo de utterances.
- Helper `redact(secret)` para enmascarar antes de loguear.
- Métricas Prometheus en `/metrics` (formato text).
- OpenTelemetry traces con OTLP (configurar `OTEL_EXPORTER_OTLP_ENDPOINT`).

---

## Performance

- Async-first (`asyncpg`, `httpx.AsyncClient`, `aiofiles`).
- Connection pooling en Supabase (pooler URL).
- `p95` objetivos en `integration_contracts.md` §8.1:
  - Tool call LangGraph < 1.5 s
  - PDF generation < 8 s
- NO loguear en hot path si volumen > 1000/s (usar sampling).

---

## Seguridad

- RLS en TODAS las tablas operativas (migración SQL).
- JWT validado en middleware global.
- Firma de webhook ElevenLabs con `hmac.compare_digest` (constant-time).
- Sin secrets en logs, env vars de runtime, ni respuestas.
- Rate limit por user (60 req/min default), 600 req/min para WS handshake.

---

## Estilo de código

- **Ruff** estricto (`line-length=100`, `target-version="py312"`).
- **Mypy strict** en `src/domain` y `src/application`.
- Docstrings en funciones públicas (Google style).
- Type hints en **todo**. Sin `Any` salvo compat de port.
- Naming:
  - `snake_case` para funciones/variables/módulos.
  - `PascalCase` para clases.
  - `UPPER_SNAKE_CASE` para constantes y `Enum`.
- Sin comentarios obvios. Comentar el **por qué**.
- Sin código muerto, sin TODOs sin ticket.

---

## ❌ NO HACER (backend)

- ❌ Importar `fastapi`, `sqlalchemy`, `httpx`, `requests` desde `src/domain` o `src/application`.
- ❌ Usar `datetime.now()` en código de producción (inyectar `IClock`).
- ❌ Usar `print()` (usar `logger`).
- ❌ Hardcodear URLs, secrets, IDs.
- ❌ Llamar a servicios externos desde use cases (siempre vía port + adapter).
- ❌ Modificar tests para que pasen.
- ❌ Romper `integration_contracts.md` sin PR `contract/`.
- ❌ **Violar `integration_contracts.md` por ningún motivo** (ni "temporalmente", ni "solo en este PR", ni "porque la feature X aún no está implementada en el otro lado"). Si una feature del PRD no encaja con el contrato actual, el orden correcto es: (1) abrir PR `contract/` que actualice el contrato (con bump de versión si es breaking), (2) implementar contra el nuevo contrato. Si dudas si algo viola el contrato, **lo viola**: consulta al humano antes de mergear.
- ❌ **Hacer `git push`** — solo el humano.
- ❌ Crear `.env` real en commits (solo `.env.example`).
- ❌ Loguear contenido completo de utterances o audio.
- ❌ Implementar más allá del test que falla.

---

## ✅ Checklist antes de marcar plan `done`

- [ ] PRD-backend.md leído y referenciado en descripción del PR.
- [ ] Plan de `plans/backend/<NN>-<name>.md` leído y todos sus tests pasan.
- [ ] `pytest -q` pasa 100 % (unit + integration + e2e + contract si aplica).
- [ ] `ruff check src/ tests/` pasa sin warnings.
- [ ] `mypy src/domain src/application` pasa en strict.
- [ ] `openapi.json` regenerado si hubo cambios de ruta o shape.
- [ ] `.env.example` actualizado si hubo nuevas env vars.
- [ ] `integration_contracts.md` actualizado si hubo cambio de contrato (con PR `contract/` separado).
- [ ] Sin secrets, sin TODOs sin ticket, sin código comentado.
- [ ] Sin imports cruzados entre `infrastructure/` e `interface/`.
- [ ] Mensajes de commit siguen Conventional Commits en español.
- [ ] Branch `feature/be-<NN>-<name>` actualizado con `develop`.
- [ ] PR abierto hacia `develop`, etiquetado `backend` + nombre del plan.
- [ ] E2E scenario del plan verificado manualmente con `curl` o pytest.

---

## Recursos

- [PRD-backend.md](../PRD-backend.md) — features
- [integration_contracts.md](../integration_contracts.md) — contratos vinculantes
- [plans/backend/](../plans/backend/) — planes incrementales
- [plans/CLEAN-ARCHITECTURE.md](../plans/CLEAN-ARCHITECTURE.md) — reglas comunes
- [plans/DOCKER.md](../plans/DOCKER.md) — estrategia docker-compose y E2E
- [AGENTS.md raíz](../AGENTS.md) — reglas globales