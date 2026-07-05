# Plans — Índice maestro

Plan de ejecución incremental de SUPERION. Cada plan es **independientemente entregable** y **E2E testeable**, aporta valor observable, y se construye sobre los anteriores.

## Principios

1. **Clean Architecture hexagonal** estricta. Domain puro (sin I/O), application orquesta casos de uso, infrastructure implementa puertos (in-memory por defecto, real como stub intercambiable), interface expone HTTP/WS/webhooks.
2. **Swappable vía `.env`**: cada dependencia externa (Supabase, OpenRouter, ElevenLabs, LangGraph) tiene `MOCK` y `REAL` intercambiables sin tocar código de dominio ni use cases.
3. **In-memory mocks por defecto**: cualquier `*_REPO`, `*_CLIENT`, `*_VALIDATOR` tiene impl en memoria con fixtures que permiten `pnpm test` / `pytest` sin Docker, sin claves, sin internet.
4. **AI TDD estricto**: cada plan define tests que se escriben **primero** (rojos), después la implementación mínima para verde, después refactor. Secuencia nominal y verificable.
5. **E2E por plan**: cada plan cierra con un escenario end-to-end concreto (curl o Playwright) que demuestra el valor entregado.

## Orden de ejecución

### Backend (`plans/backend/`)

| # | Plan | Valor E2E | Desbloquea |
|---|---|---|---|
| 00 | Foundation | Skeleton + `/health` + in-memory infra wired | BE-01 |
| 01 | Auth | Login → JWT → `me` con RLS simulado | BE-02 |
| 02 | Work Orders + Sessions start | Listar OTs, iniciar sesión, ver plantilla | BE-03, BE-06 |
| 03 | WebSocket + Events | Bidireccional: post evento → broadcast + catch-up | BE-04, BE-07 |
| 04 | Photos + Validation | Upload → mock VLM valida → evento WS | BE-07 |
| 05 | Manuals + RAG | Upload PDF → chunking → mock embeddings → query con cita | BE-06 |
| 06 | ElevenLabs Webhook Mock | Webhook firma OK → tool call → state change → WS | BE-07 |
| 07 | Reports + PDF + Finalize | Reporte live → finalize → PDF mock descargable | BE-08 |
| 08 | Observability + Hardening | OpenAPI servido, contract tests, audit, rate limit, `/ready` | BE-09 |
| 09 | ElevenLabs Agent Provision | CLI Python provision+deploy agente; `voice/connect` con signed_url | FE voz real |

### Frontend (`plans/frontend/`)

| # | Plan | Valor E2E | Desbloquea |
|---|---|---|---|
| 00 | Foundation | Monorepo + apps cargan + mock client wired | FE-01 |
| 01 | Auth (mobile+desktop) | Login con credenciales mock → guard de ruta | FE-02, FE-09 |
| 02 | Mobile — Work Orders list | Ver lista de OTs asignadas | FE-03 |
| 03 | Mobile — Session + Step view | Iniciar sesión, ver paso actual | FE-04 |
| 04 | Mobile — Stepper + Timers | Cronómetros + ETA dinámico | FE-05 |
| 05 | Mobile — WS live updates | Cambio de paso en vivo sin recargar | FE-06, FE-07, FE-08 |
| 06 | Mobile — Dudas (consultas) | Modal de duda + respuesta con cita | FE-07 |
| 07 | Mobile — Camera + Photo | Captura + validación mock + retry | FE-08 |
| 08 | Mobile — Report preview + PDF | Ver reporte resumido + descargar PDF | FE-13 |
| 09 | Desktop — Dashboard | Lista de sesiones activas en vivo | FE-10 |
| 10 | Desktop — Session detail | Reporte formándose + stream de eventos | FE-11, FE-12 |
| 11 | Desktop — Manuals RAG admin | Upload PDF + ver indexación | FE-12 |
| 12 | Desktop — Procedure templates | CRUD plantillas con validación | FE-13 |
| 13 | Polish | a11y AA, PWA, i18n, error boundaries, telemetría | — |

## Cómo ejecutar un plan

1. Lee `plans/CLEAN-ARCHITECTURE.md` para entender capas y reglas de env.
2. Lee el plan objetivo + planes de los que depende.
3. Marca el plan como `en_curso`.
4. Escribe los tests del plan PRIMERO. Verifica que fallan.
5. Implementa lo mínimo para verde.
6. Refactoriza.
7. Corre el escenario E2E del plan.
8. Marca como `done` solo si Definition of Done está completa.

## Estado

Actualiza este README cuando un plan cambie de estado:

```
BE-00 ✅
BE-01 🚧
BE-02 ⏳
...
```