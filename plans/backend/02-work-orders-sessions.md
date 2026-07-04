# BE-02 — Work Orders + Sessions (start/get)

**Estado:** ⏳
**Depende de:** BE-01
**Desbloquea:** BE-03, BE-05, BE-06, BE-07
**PRD features:** F2.1, F2.2, F2.3, F3.1, F7.1, F7.2 (read-only)
**Stack:** backend · capas: domain + application + infrastructure + interface

## Goal

Técnico autenticado lista sus OTs asignadas, ve el detalle, e inicia una sesión que devuelve `procedure_template` completo. Todo con repositorios in-memory sembrados y stub Supabase.

## Capas afectadas

### Domain
- `entities/asset.py` — `Asset(id, plant_id, tag, name, model, manufacturer, current_manual_id)`
- `entities/procedure_template.py` — `ProcedureTemplate(id, name, version, manual_id, steps[], critical_step_indices[], photo_required_step_indices[], estimated_minutes)`
- `entities/work_order.py` — `WorkOrder(id, code, asset_id, type, priority, status, assigned_to, planned_start, planned_end, procedure_template_id)`
- `entities/maintenance_session.py` — `MaintenanceSession(id, work_order_id, technician_id, status, started_at, current_step_index, langgraph_thread_id)`
- `value_objects/step.py` — `Step(index, title, description, estimated_minutes, critical, requires_photo, photo_criteria)`
- `value_objects/status.py` — `WorkOrderStatus`, `SessionStatus` enums
- `ports/repositories.py` — `IWorkOrderRepository`, `IProcedureTemplateRepository`, `IAssetRepository`, `ISessionRepository`

### Application
- `use_cases/work_orders/list.py` — filtra por `assigned_to=current_user.id` y/o `plant_id`
- `use_cases/work_orders/get.py` — devuelve detalle + asset + template resumen
- `use_cases/work_orders/start_session.py` — valida OT `pending`, no tiene sesión activa, crea `MaintenanceSession` con `langgraph_thread_id=uuid`, llama a `IProcedureTemplateRepository.get()`, cambia OT a `in_progress`
- `use_cases/sessions/get.py` — devuelve sesión + métricas básicas
- `dto/work_order.py`, `dto/session.py`, `dto/procedure_template.py`

### Infrastructure
- `persistence/in_memory/work_order_repository.py` con fixtures (5 OTs: 3 pending asignadas a Juan, 1 in_progress, 1 completed)
- `persistence/in_memory/procedure_template_repository.py` con 2 plantillas (compresor, bomba)
- `persistence/in_memory/asset_repository.py` con 6 assets
- `persistence/in_memory/session_repository.py` (sin fixtures; arranca vacío)
- `persistence/supabase/*` stubs
- `factories.py` extendidas

### Interface
- `http/routers/work_orders.py` — `GET /v1/work-orders`, `GET /v1/work-orders/{id}`, `POST /v1/work-orders/{id}/start`
- `http/routers/sessions.py` — `GET /v1/sessions/{id}`
- `http/exception_handlers.py` — añadir `WORK_ORDER_NOT_FOUND`, `WORK_ORDER_ALREADY_STARTED`, `WORK_ORDER_ALREADY_COMPLETED`

## Switch vía .env

Sin vars nuevas; usa `PERSISTENCE=memory|supabase` existente.

## Tests que se escriben PRIMERO

### Unit
1. `tests/unit/domain/test_work_order_entity.py` — invariantes, transiciones de estado válidas
2. `tests/unit/domain/test_procedure_template_entity.py` — steps contiguos, critical ⊆ range
3. `tests/unit/domain/test_session_entity.py` — solo una activa por OT
4. `tests/unit/application/test_list_work_orders.py` — filtra por assigned_to, paginación cursor
5. `tests/unit/application/test_start_session.py` — happy path, OT no existe, OT ya started, OT completed

### Integration
6. `tests/integration/test_work_orders_router.py` — 200/404/409, paginación
7. `tests/integration/test_sessions_router.py` — 200/404

### E2E
8. `tests/e2e/test_work_orders_sessions_e2e.py` — login → list → start → get session con procedure_template completo

## Implementación mínima para verde

- `WorkOrder.assign_to(user)` valida que user.plant_id == asset.plant_id.
- `start_session` orquesta: lee OT, valida status, lee template, crea sesión, transiciona OT a `in_progress`, devuelve DTO con `websocket_url` placeholder (`wss://placeholder/sessions/{id}`).
- Paginación cursor: cursor = base64(`{last_id}:{last_created_at}`).

## Archivos a crear

```
backend/src/domain/entities/asset.py
backend/src/domain/entities/procedure_template.py
backend/src/domain/entities/work_order.py
backend/src/domain/entities/maintenance_session.py
backend/src/domain/value_objects/step.py
backend/src/domain/value_objects/status.py
backend/src/domain/ports/repositories.py                   # MODIFY
backend/src/application/use_cases/work_orders/list.py
backend/src/application/use_cases/work_orders/get.py
backend/src/application/use_cases/work_orders/start_session.py
backend/src/application/use_cases/sessions/get.py
backend/src/application/dto/work_order.py
backend/src/application/dto/session.py
backend/src/application/dto/procedure_template.py
backend/src/infrastructure/persistence/in_memory/work_order_repository.py
backend/src/infrastructure/persistence/in_memory/procedure_template_repository.py
backend/src/infrastructure/persistence/in_memory/asset_repository.py
backend/src/infrastructure/persistence/in_memory/session_repository.py
backend/src/infrastructure/persistence/supabase/work_order_repository.py    # stub
backend/src/infrastructure/persistence/supabase/procedure_template_repository.py # stub
backend/src/infrastructure/persistence/supabase/asset_repository.py        # stub
backend/src/infrastructure/persistence/supabase/session_repository.py       # stub
backend/src/infrastructure/factories.py                                     # MODIFY
backend/src/interface/http/routers/work_orders.py
backend/src/interface/http/routers/sessions.py
backend/src/interface/http/exception_handlers.py                            # MODIFY
```

## E2E test scenario

```bash
# Login (BE-01)
TOKEN=$(curl -s -X POST .../v1/auth/login -d '{...}' | jq -r .access_token)

# Listar OTs
curl .../v1/work-orders -H "Authorization: Bearer $TOKEN"
# esperado: 200, 3 OTs pending asignadas a Juan

# Detalle OT
curl .../v1/work-orders/wo-uuid-1 -H "Authorization: Bearer $TOKEN"
# esperado: 200, objeto completo

# Iniciar sesión
curl -X POST .../v1/work-orders/wo-uuid-1/start -H "Authorization: Bearer $TOKEN"
# esperado: 201, {session_id, procedure_template:{steps:[12 items]}, websocket_url}

# Get session
curl .../v1/sessions/sess-uuid -H "Authorization: Bearer $TOKEN"
# esperado: 200, {status:"active", current_step_index:0, ...}

# Doble start → 409
curl -X POST .../v1/work-orders/wo-uuid-1/start -H "Authorization: Bearer $TOKEN"
# esperado: 409, code:"WORK_ORDER_ALREADY_STARTED"

# OT ajena → 404 (RLS simulado)
curl .../v1/work-orders/wo-de-otro -H "Authorization: Bearer $TOKEN"
# esperado: 404
```

## Definition of Done

- [ ] `pytest -q` pasa 100 %
- [ ] Endpoints cumplen `integration_contracts.md` §2.2 y §2.3 (parcial §2.3)
- [ ] Paginación cursor funcional
- [ ] RLS simulado por filtro en repositorio (técnico solo ve sus OTs)
- [ ] Transición OT `pending → in_progress` atómica
- [ ] `start_session` rechaza 409 si ya activa
- [ ] Fixtures: 3 OTs pending + 2 plantillas + 6 assets
- [ ] Stubs Supabase con `NotImplementedError` claro

## Notas

- `langgraph_thread_id` se genera pero no se usa todavía. BE-03 lo conectará.
- `websocket_url` es placeholder. BE-03 lo hará real.
- Aquí NO se crea aún `langgraph_checkpoints` (llega en BE-06).