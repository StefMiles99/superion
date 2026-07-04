# Clean Architecture — Reglas comunes

Aplica a backend y frontend. Hexagonal estricta. Permite que cualquier plan se ejecute con mocks en memoria sin servicios externos.

## Capas

```
┌─────────────────────────────────────────┐
│              Interface                  │  FastAPI routers / WS / React pages
├─────────────────────────────────────────┤
│             Application                │  Use cases / hooks
├─────────────────────────────────────────┤
│             Infrastructure             │  Adapters: in-memory, supabase, real APIs
├─────────────────────────────────────────┤
│               Domain                   │  Entidades, value objects, ports (Protocol)
└─────────────────────────────────────────┘
```

Reglas de dependencia (flechas apuntan hacia adentro):
- `interface` → `application` → `domain`
- `infrastructure` → `domain` (implementa puertos del dominio)
- `domain` **nunca** importa nada de las otras capas
- `application` **nunca** importa de `infrastructure` ni `interface`
- `infrastructure` y `interface` **nunca** se importan entre sí directamente

## Ports (interfaces abstractas)

Definidos en `domain/ports/*.py` (backend) o `domain/ports/*.ts` (frontend) como `Protocol` / `interface`.

Ejemplo backend:
```python
# backend/src/domain/ports/repositories.py
from typing import Protocol
from domain.entities.work_order import WorkOrder

class IWorkOrderRepository(Protocol):
    async def list(self, *, assigned_to: str | None, status: list[str] | None,
                   cursor: str | None, limit: int) -> tuple[list[WorkOrder], str | None]: ...
    async def get(self, work_order_id: str) -> WorkOrder | None: ...
    async def save(self, work_order: WorkOrder) -> None: ...
```

Ejemplo frontend:
```typescript
// frontend/packages/domain/src/ports/IApiClient.ts
export interface IApiClient {
  login(input: LoginInput): Promise<AuthSession>;
  listWorkOrders(filter: WorkOrderFilter): Promise<Paginated<WorkOrder>>;
  startSession(workOrderId: string): Promise<SessionStart>;
}
```

## Switch via `.env`

Cada puerto tiene **al menos dos implementaciones**: una `InMemory` (siempre disponible) y una `Real` (stub que arranca pero `raise NotImplementedError` en operaciones que requieren servicios externos).

Selección por env (en `config.py` / `config.ts`):
```
SUPERION_PERSISTENCE=memory|supabase
SUPERION_LLM=mock|openrouter
SUPERION_VOICE=mock|elevenlabs
SUPERION_VECTOR_STORE=memory|pgvector
SUPERION_STORAGE=memory|supabase
SUPERION_PDF=mock|weasyprint
SUPERION_AUTH=memory|supabase_auth
```

Defaults = siempre `memory|mock` para que cualquier plan corra sin setup.

### Patrón de factory (backend)

```python
# backend/src/infrastructure/factories.py
def get_work_order_repository() -> IWorkOrderRepository:
    if settings.PERSISTENCE == "memory":
        return InMemoryWorkOrderRepository.shared()
    if settings.PERSISTENCE == "supabase":
        return SupabaseWorkOrderRepository(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    raise ValueError(f"Unknown persistence: {settings.PERSISTENCE}")
```

DI vía FastAPI `Depends(get_work_order_repository)`.

### Patrón de factory (frontend)

```typescript
// frontend/packages/infrastructure/src/factories.ts
export function getApiClient(): IApiClient {
  if (import.meta.env.VITE_API_MODE === 'mock') return new InMemoryApiClient();
  return new HttpApiClient(import.meta.env.VITE_API_BASE_URL);
}
```

## In-memory implementations — reglas

- Deben ser **thread-safe** (backend: `asyncio.Lock`; frontend: asumimos single-thread).
- Deben tener **fixtures sembrados** al instanciarse (3 técnicos, 5 OTs, 1 manual, 1 plantilla).
- Deben permitir **reset** (útil para tests E2E).
- No deben depender de reloj real: usar `Clock` port inyectable.
- No deben persistir entre reinicios salvo que se pida explícitamente.

```python
# backend/src/infrastructure/persistence/in_memory/base.py
class InMemoryStore(Generic[T]):
    def __init__(self, items: list[T] = None):
        self._items = {item.id: item for item in (items or [])}
        self._lock = asyncio.Lock()

    async def reset(self): ...
    async def list(self, predicate: Callable[[T], bool]): ...
```

## Real implementations — stubs

Cada `*Real` adapter arranca sin fallar, expone la misma interfaz, pero las operaciones que tocan el servicio externo lanzan `NotImplementedError` con un mensaje claro que dice "implementar cuando se conecte el servicio real". El plan que corresponda los completará.

```python
# backend/src/infrastructure/persistence/supabase/work_order_repo.py
class SupabaseWorkOrderRepository:
    async def list(self, ...):
        raise NotImplementedError("SupabaseWorkOrderRepository.list — implement in BE-08 or later")
```

## Tests — pirámide

```
       E2E (pocos, escenarios clave)
     ────────────────────────────
    Integration (puertos + adapters in-memory)
   ──────────────────────────────────────────
  Unit (domain + use cases)
 ──────────────────────────────────────────
```

Cada plan declara explícitamente los tests en este orden. AI TDD estricto = escribir los tests rojos primero.

## Convenciones de naming

- Backend: snake_case (Python).
- Frontend: camelCase (TS).
- IDs: UUID v4 (string).
- Timestamps: ISO 8601 UTC con `Z`.
- Ports: prefijo `I` (`IWorkOrderRepository`).
- Adapters in-memory: sufijo `InMemory`.
- Adapters reales: sufijo del servicio (`SupabaseWorkOrderRepository`).

## Tests E2E — patrón

**Backend**: `tests/e2e/test_<plan>_e2e.py` con `httpx.AsyncClient` + `websockets`. Levanta la app con `mode=memory|mock` y ejecuta el escenario del plan.

**Frontend**: `tests/e2e/<plan>.spec.ts` con Playwright. Apunta `VITE_API_MODE=mock` y `VITE_WS_MODE=mock` y ejecuta el escenario del plan.

## Migración entre planes

Cada plan **no rompe** lo anterior. Si introduce cambios en una interfaz existente, debe:
1. Mantener backwards-compat dentro de la misma `major`.
2. Marcar deprecated lo viejo con un plan explícito para limpiarlo.
3. Agregar test que pruebe ambos paths.