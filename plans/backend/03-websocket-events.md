# BE-03 — WebSocket + Events

**Estado:** ⏳
**Depende de:** BE-02
**Desbloquea:** BE-04, BE-05, BE-07
**PRD features:** F3.2, F3.3, F3.4, F9.1, F9.2, F9.3, F9.4, F9.5
**Stack:** backend · capas: domain + application + infrastructure + interface (WS)

## Goal

Canal WebSocket funcional: cliente se conecta con JWT + `last_seq`, recibe replay desde ahí + eventos en vivo; `POST /events` acepta eventos no-voz (comandos, measurements, findings) con idempotency; pause/resume emiten eventos; seq monotónico por sesión.

## Capas afectadas

### Domain
- `entities/session_event.py` — `SessionEvent(id [UUID cliente], session_id, seq, type, payload, step_index, created_at)`
- `value_objects/event_type.py` — enum `EVENT_TYPES` (utterance, command, measurement, finding, step_enter, step_exit, assistant_query, assistant_answer, pause, resume, photo, finalize, etc.)
- `events/session_started.py`, `events/step_entered.py`, etc. — DTOs de evento
- `ports/event_bus.py` — `IEventBus.publish(event)`, `IEventBus.subscribe(session_id, handler)`
- `ports/repositories.py` — añadir `ISessionEventRepository`

### Application
- `use_cases/events/append.py` — idempotency check por `event_id`, asigna `seq`, persiste, publica en bus
- `use_cases/events/list_since.py` — devuelve eventos desde `seq > X`
- `use_cases/sessions/pause.py` — cambia status, emite `session.paused` y `step.paused`
- `use_cases/sessions/resume.py` — idem con `session.resumed`
- `use_cases/sessions/transition_step.py` — `mark_step_complete` (valida pre-req: foto), `skip_step` (rechaza si critical)

### Infrastructure
- `persistence/in_memory/session_event_repository.py` — append-only con `seq` autoincremental por sesión (lock por session_id)
- `infrastructure/realtime/event_bus.py` — `InMemoryEventBus` con `asyncio.Queue` por session_id y pub/sub para WS
- `persistence/supabase/session_event_repository.py` — stub

### Interface
- `ws/manager.py` — `ConnectionManager`: dict `session_id → set[WebSocket]`, `connect()`, `disconnect()`, `broadcast(session_id, event)`
- `ws/handlers.py` — autenticación JWT (query param), handshake `subscribe`, replay desde `last_seq`, heartbeat ping/pong
- `http/routers/sessions.py` — añadir `GET /v1/sessions/{id}/events?since_seq=X`, `POST /v1/sessions/{id}/events`, `POST /v1/sessions/{id}/pause`, `POST /v1/sessions/{id}/resume`, `POST /v1/sessions/{id}/finalize` (stub que solo cierra sin PDF)

## Switch vía .env

```
WS_HEARTBEAT_INTERVAL=30
WS_REPLAY_ON_CONNECT=true
EVENTBUS=memory|redis
```

## Tests que se escriben PRIMERO

### Unit
1. `tests/unit/domain/test_session_event.py` — `seq` monotónico, payload por type validado
2. `tests/unit/application/test_append_event.py` — idempotency (mismo `event_id` no duplica), genera seq correlativo
3. `tests/unit/application/test_pause_resume.py` — transiciones válidas
4. `tests/unit/application/test_step_transition.py` — `mark_step_complete` falla sin foto si `requires_photo`; `skip_step` falla si critical

### Integration
5. `tests/integration/test_event_bus.py` — publish/subscribe en mismo proceso
6. `tests/integration/test_session_event_repo.py` — seq monotónico, list_since
7. `tests/integration/test_ws_manager.py` — broadcast a múltiples clientes
8. `tests/integration/test_sessions_router_events.py` — POST event, pause/resume, GET events
9. `tests/integration/test_ws_handshake.py` — auth OK, replay correcto, heartbeat

### E2E
10. `tests/e2e/test_websocket_e2e.py` — login → start session → conectar WS → post event → recibir broadcast → reconnect con last_seq → catch-up

## Implementación mínima para verde

- `SessionEventRepository` con `dict[session_id, list[SessionEvent]]` + `dict[session_id, int]` (seq counter), lock por sesión.
- `InMemoryEventBus` con `dict[session_id, asyncio.Queue]` y un dispatcher que mueve del queue a los subscribers.
- WS manager: en handshake, lee `last_seq`, hace `GET /events?since_seq=X`, envía replay; luego live.
- Heartbeat: tarea asyncio que envía `{"type":"ping"}` cada N segundos, espera pong con timeout.
- `mark_step_complete` consulta `procedure_template` para verificar pre-req de foto (placeholder: lista de `photo_required_step_indices`); rechaza si no hay foto aceptada (BE-04 lo conectará de verdad).

## Archivos a crear/modificar

```
backend/src/domain/entities/session_event.py
backend/src/domain/value_objects/event_type.py
backend/src/domain/ports/event_bus.py
backend/src/domain/ports/repositories.py                   # MODIFY
backend/src/application/use_cases/events/append.py
backend/src/application/use_cases/events/list_since.py
backend/src/application/use_cases/sessions/pause.py
backend/src/application/use_cases/sessions/resume.py
backend/src/application/use_cases/sessions/transition_step.py
backend/src/application/dto/event.py
backend/src/infrastructure/persistence/in_memory/session_event_repository.py
backend/src/infrastructure/persistence/supabase/session_event_repository.py   # stub
backend/src/infrastructure/realtime/event_bus.py
backend/src/infrastructure/factories.py                                     # MODIFY
backend/src/interface/ws/manager.py
backend/src/interface/ws/handlers.py
backend/src/interface/http/routers/sessions.py                              # MODIFY
backend/src/interface/http/exception_handlers.py                            # MODIFY
```

## E2E test scenario (asyncio + websockets client)

```python
# pseudocódigo test_e2e
async with AsyncClient(app=app, base_url="http://test") as ac:
    # login + start session
    token = await login(...)
    sess = await start_wo(token, wo_id)

    # conectar WS
    async with websockets.connect(f"ws://test/v1/ws/sessions/{sess['session_id']}?token={token}&last_seq=0") as ws:
        # post evento (command pause)
        await ac.post(f"/v1/sessions/{sess['session_id']}/events",
                      json={"event_id": str(uuid4()), "type":"command", "step_index":0,
                            "payload":{"command":"pause"}},
                      headers={"Authorization": f"Bearer {token}"})

        # recibir broadcast
        msg = await asyncio.wait_for(ws.recv(), timeout=2)
        evt = json.loads(msg)
        assert evt["type"] == "session.paused"
        assert evt["seq"] == 1

        # reconnect con last_seq
    async with websockets.connect(f"ws://test/v1/ws/sessions/{sess['session_id']}?token={token}&last_seq=0") as ws2:
        replay = json.loads(await ws2.recv())
        assert replay["type"] in ("replay.batch", "session.paused")

        # post measurement
        await ac.post(f"/v1/sessions/{sess['session_id']}/events",
                      json={"event_id": str(uuid4()), "type":"measurement",
                            "step_index":0, "payload":{"name":"presion","value":85.2,"unit":"psi"}},
                      headers={"Authorization": f"Bearer {token}"})
        evt2 = json.loads(await ws2.recv())
        assert evt2["type"] == "event.appended"
        assert evt2["payload"]["type"] == "measurement"
```

## Definition of Done

- [ ] `pytest -q` pasa 100 %
- [ ] WS cumple `integration_contracts.md` §3
- [ ] Idempotency funciona: dos POST con mismo `event_id` no duplican
- [ ] `seq` monotónico por sesión, empieza en 1
- [ ] Catch-up funciona tras reconnect
- [ ] Heartbeat: cliente que no responde en 60 s se cierra
- [ ] `mark_step_complete` rechaza `STEP_REQUIRES_PHOTO` (mock: cualquier step con índice en `photo_required_step_indices` requiere un evento `photo.accepted` previo)
- [ ] `skip_step` rechaza `STEP_CRITICAL_CANNOT_SKIP`
- [ ] Pause/resume cambian status y emiten eventos

## Notas

- El placeholder de "foto aceptada" en `mark_step_complete` se valida contra `session_event` con `type=photo` y `payload.status=accepted` (lo crea BE-04).
- `finalize` aquí solo cierra la sesión; generación de reporte y PDF llega en BE-07.