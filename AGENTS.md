# AGENTS.md — SUPERION (root)

Reglas fundamentales para cualquier agente AI que trabaje en este repositorio. Son **vinculantes** y prevalecen sobre cualquier sugerencia del modelo.

## Proyectos

Este monorepo contiene dos proyectos principales, cada uno con su propio `AGENTS.md`:

| Proyecto | Path | AGENTS.md | Stack |
|---|---|---|---|
| **Backend** | `backend/` | [`backend/AGENTS.md`](./backend/AGENTS.md) | FastAPI · Python 3.12 · LangGraph · Supabase · OpenRouter · ElevenLabs |
| **Frontend** | `frontend/` | [`frontend/AGENTS.md`](./frontend/AGENTS.md) | React 19 · TS · Vite · pnpm workspaces · TanStack Query · Zustand |

Documentos vinculantes que **debes leer** antes de tocar código:

- `PRD.md` — producto global
- `PRD-backend.md`, `PRD-frontend.md` — features por subproyecto
- `integration_contracts.md` — **contrato único** REST + WS + LangGraph + ElevenLabs + Supabase + OpenRouter
- `plans/README.md` — índice de planes incrementales
- `plans/CLEAN-ARCHITECTURE.md` — reglas comunes de arquitectura hexagonal
- `plans/DOCKER.md` — estrategia de `docker-compose` por subproyecto y global para E2E

---

## 1. PRD como contexto obligatorio

1. **SIEMPRE** lee el PRD del proyecto en el que vas a trabajar antes de escribir una sola línea de código.
2. Cualquier decisión técnica que contradiga el PRD debe ser consultada con el humano **antes** de implementar.
3. Si detectas un gap en el PRD, **propón mejora en un PR de docs** (`docs/...`); nunca asumas el gap silenciosamente.
4. Cada commit y PR debe referenciar el plan (`plans/backend/04-photos.md`) o feature del PRD (`PRD-frontend.md §M6`).

---

## 2. Contrato como fuente de verdad

- `integration_contracts.md` es **vinculante** entre backend y frontend.
- **PROHIBICIÓN ABSOLUTA**: ningún agente AI puede violar `integration_contracts.md` en ningún proyecto, bajo ninguna circunstancia, ni siquiera "temporalmente", ni siquiera "solo en este PR", ni siquiera "porque el backend aún no expone X". Si una feature del PRD no encaja con el contrato actual, el orden correcto es **primero** abrir PR `contract/` que actualice el contrato (con bump de versión si es breaking), **después** implementar la feature contra el nuevo contrato.
- Cambios de contrato ⇒ PR separado con prefijo `contract/` y etiqueta `contract-change`.
- Breaking changes ⇒ bump de versión (`/v1` → `/v2`); mantener `/v1` deprecated ≥ 90 días.
- Tests contractuales son **obligatorios y bloqueantes** (Schemathesis para REST, AsyncAPI para WS). Un PR que rompa un test contractual no puede mergearse. Bajar cobertura contractual, saltarse tests contractuales o usar `skip`/`xfail` para que CI pase está **prohibido** y equivale a violar el contrato.
- **Regla de oro**: si dudas si algo viola el contrato, **lo viola**. Consulta al humano antes de mergear.

---

## 3. Clean Architecture + SOLID (regla global)

Estas reglas aplican a backend y frontend con la misma fuerza. Detalle por stack en cada `AGENTS.md` específico.

### Capas
```
Domain  →  Application  →  Infrastructure  →  Interface
```
- **Domain**: puro, cero dependencias de I/O, frameworks, HTTP, DB, fetch, localStorage.
- **Application**: orquesta casos de uso; depende solo de domain + ports.
- **Infrastructure**: implementa ports (in-memory por defecto, real como stub intercambiable).
- **Interface**: routers HTTP, WS, webhooks (backend) / pages, components, hooks (frontend).

### SOLID sin excepciones
- **S** Single Responsibility — un módulo = una razón para cambiar.
- **O** Open/Closed — extender, no modificar.
- **L** Liskov Substitution — cualquier impl de un port debe servir donde se espera el port.
- **I** Interface Segregation — ports pequeños y específicos, no god-interfaces.
- **D** Dependency Inversion — el dominio define ports; infraestructura depende del dominio, nunca al revés.

### Desacoplamiento
- Cada dependencia externa (Supabase, OpenRouter, ElevenLabs, LangGraph, fetch, WebSocket, IndexedDB) detrás de un **port**.
- Implementación in-memory por defecto + stub real con `NotImplementedError` claro.
- Una clase/módulo < 300 líneas; si crece, refactor.
- Sin imports cruzados entre Infrastructure e Interface.

---

## 4. AI-TDD obligatorio (regla global)

Cada plan de `plans/` define explícitamente la **secuencia de tests que se escriben primero**. Ese orden no es opcional.

### Ciclo obligatorio por cada test
1. **RED**: escribe el test; verifica que falla por la razón correcta.
2. **GREEN**: implementa lo **mínimo** para que pase. Nada más.
3. **REFACTOR**: extrae, renombra, limpia. Sin cambiar comportamiento.
4. **COMMIT**: un commit por ciclo (idealmente) o agrupando ciclos del mismo tipo.

### Patrón de commits
```
test(be-04): añadir test para upload con magic bytes inválidos   ← RED
feat(be-04): implementar validación de mime y magic bytes          ← GREEN
refactor(be-04): extraer validador a función pura                 ← REFACTOR
test(be-04): añadir test para flujo de validación con foto aceptada
feat(be-04): implementar servicio de validación mock
...
```

### Prohibido
- ❌ Escribir código y test al mismo tiempo.
- ❌ Modificar tests para que pasen (cambia el contrato).
- ❌ Implementar más allá del test que falla.
- ❌ Commitear tests que ya estaban verdes sin haberlos rojos primero.
- ❌ `skip`, `xfail`, `--no-verify`, deshabilitar hooks, bajar cobertura para que CI pase.
- ❌ Marcar plan como `done` sin 100 % tests pasando + escenario E2E verde.

---

## 5. Gitflow (obligatorio)

### Ramas

```
main                          # producción, protegido, deploya demo
  ├── hotfix/*                # fixes urgentes desde main
  └── release/v*.*.*          # preparación de release

develop                       # integración continua, deploya staging
  ├── feature/<scope>-<nn>-<desc>   # features nuevas (alineadas con plans/)
  ├── chore/<desc>                  # tooling, deps, refactors sin cambio funcional
  ├── docs/<desc>                   # documentación
  └── contract/<desc>               # cambios en integration_contracts.md
```

### Reglas de rama
- `main` y `develop` están **protegidas**: push directo prohibido; PR + review obligatorio.
- Toda feature parte de `develop` y se mergea a `develop`.
- Release se mergea a `main` y de vuelta a `develop`.
- Hotfix parte de `main`, se mergea a `main` y `develop`.
- Naming `feature/`:
  - `feature/be-04-photos`
  - `feature/fe-07-camera`
  - `feature/contract-v2-routes`
- Naming `chore/`: `chore/upgrade-pydantic`, `chore/cleanup-deps`.
- Naming `docs/`: `docs/update-architecture-diagram`.
- Naming `contract/`: `contract/add-derived-work-orders`.

---

## 6. Commits (Conventional Commits estricto)

### Formato
```
<type>(<scope>): <description>

[body opcional: explica el "por qué"]

[footer opcional: Refs / Closes / BREAKING CHANGE]
```

### Types permitidos
| Type | Uso |
|---|---|
| `feat` | nueva funcionalidad |
| `fix` | corrección de bug |
| `refactor` | cambio de código sin alterar comportamiento |
| `test` | solo tests |
| `docs` | solo documentación |
| `chore` | tooling, deps, configs |
| `perf` | mejora de performance |
| `build` | cambios en build/CI local |
| `ci` | cambios en CI/CD |
| `revert` | revierte commit anterior |
| `contract` | cambios en `integration_contracts.md` |

### Scopes permitidos
- `be-<NN>` — plan backend N (ej: `feat(be-04): añadir endpoint upload de fotos`)
- `fe-<NN>` — plan frontend N
- `be` / `fe` — cambios cross-plan
- `infra` — CI, Docker, deploy
- `docs` — docs
- `contracts` — cambios de contrato

### Reglas de mensaje
- **Español**.
- Imperativo presente: "añadir", "corregir", "refactorizar" — no "añadido", "añadiendo".
- Sin punto final.
- ≤ 72 chars en subject.
- Body wrapped a 72 chars; explica el **por qué**, no el **qué**.
- Footer: `Refs: plans/backend/04-photos.md` o `Refs: PRD-frontend.md §M6`.

### Atomicidad
- Un commit = un cambio lógico.
- Si encuentras dos cambios no relacionados en tu diff, haz dos commits.
- Si tocas > 5 archivos no relacionados, probablemente necesitas dividir.

---

## 7. ⛔ NUNCA SUBIR A GITHUB (PUSH) AUTOMÁTICAMENTE

**REGLA CRÍTICA — no negociable.**

> **Ningún agente AI debe ejecutar `git push`, abrir PRs, crear tags remotos, ni crear repos en GitHub en ningún momento. Solo el humano (o un humano explícitamente designado) puede hacerlo.**

### Prohibido
- ❌ `git push` (cualquier remote, cualquier rama).
- ❌ `git push --force` o `--force-with-lease`.
- ❌ `git push --tags`.
- ❌ `gh pr create` (aunque la PR esté lista).
- ❌ `gh repo create`, `gh release create`.
- ❌ Configurar push automático en hooks (`post-commit`, `post-merge`).
- ❌ Disparar workflows que desplieguen (Actions, Vercel, Fly, Render).

### Permitido
- ✅ `git commit` local.
- ✅ `git push` **solo si el humano lo pide explícitamente** con el comando literal en ese turno.
- ✅ `gh pr create` **solo si el humano lo pide explícitamente**.
- ✅ Tags locales (`git tag v0.1.0`).
- ✅ `git fetch`, `git pull` (lectura).

### Cómo solicitarlo al humano
Cuando termines el trabajo y consideres que está listo para subir:
```
Trabajo listo para revisión. ¿Procedo con push y apertura de PR?
- Rama: feature/be-04-photos
- Commits: 7 (todos locales)
- PR target: develop
- Tests: 100% pasando
```

**Espera confirmación explícita.** No asumas permiso implícito.

---

## 8. Git worktrees

Para trabajo en paralelo (varios planes a la vez), usa worktrees.

### Cuándo SÍ usar worktree
- ✅ Múltiples planes en paralelo (uno por worktree).
- ✅ Aislamiento de dependencias (Python vs Node).
- ✅ Mantener `develop` limpio mientras se desarrolla.
- ✅ Evitar `git stash` repetido.

### Cuándo NO usar worktree
- ❌ Cambios triviales de una sola línea.
- ❌ Cuando necesitas ver varios archivos del mismo proyecto a la vez (mejor: pestañas).

### Convención
```bash
# Crear worktree para un plan
git worktree add ../superion-be-04 -b feature/be-04-photos develop

# Trabajar
cd ../superion-be-04

# Limpiar al mergear
git worktree remove ../superion-be-04
git branch -d feature/be-04-photos
```

- Path: `../superion-<scope>-<NN>-<short-desc>` (ej: `../superion-be-04-photos`).
- Branch: `feature/<scope>-<NN>-<desc>`.

---

## 9. Definition of Done (global)

Un cambio está `done` solo si **todas** estas casillas están marcadas:

- [ ] PRD del proyecto leído y referenciado en la descripción del PR.
- [ ] Plan correspondiente de `plans/` consultado y respetado.
- [ ] Tests pasan (unit + integration + e2e + contract si aplica).
- [ ] Lint y typecheck pasan (`ruff`, `mypy`, `eslint`, `tsc`).
- [ ] Sin código comentado, sin TODOs sin ticket, sin `print`/`console.log` de debug.
- [ ] Sin secrets en código, en logs, ni en commits.
- [ ] `.env.example` actualizado si se añadieron env vars.
- [ ] Mensajes de commit siguen Conventional Commits en español.
- [ ] Branch actualizado con `develop` (sin conflictos).
- [ ] Documentación actualizada si hubo cambio de contrato o setup.
- [ ] PR abierto (NO mergeado, NO pusheado) y etiquetado.
- [ ] Si hubo cambio de contrato, PR `contract/` separado y aprobado.

---

## 10. Seguridad y secretos

### Prohibido
- ❌ Commitear `.env`, `.env.local`, `.env.*.local`, claves, tokens, service_role_key.
- ❌ Loguear passwords, tokens completos, contenido de utterances, audio crudo, PII.
- ❌ Hardcodear URLs con secrets (`https://user:pass@host`).

### Obligatorio
- ✅ `.gitignore` cubre: `.env`, `.env.*`, `node_modules/`, `__pycache__/`, `dist/`, `build/`, `.venv/`, `coverage/`, `*.pyc`, `.DS_Store`, `.idea/`, `.vscode/`, `*.log`.
- ✅ `.env.example` documentado para cada nueva env var.
- ✅ Usar `redact()` helper para enmascarar secrets antes de loguear.
- ✅ Si por error se commitea un secret, **rotar inmediatamente** y avisar al humano.

---

## 11. Comunicación con el humano

- Si una instrucción es ambigua, **pregunta antes de actuar**.
- Si encuentras una decisión que contradice el PRD, **pregunta antes de cambiar**.
- Si encuentras un gap en el PRD, **propón mejora en lugar de asumir**.
- Al terminar un plan, resume qué se hizo, qué falta y cuál es el siguiente plan sugerido.
- Si te bloqueas, dilo claramente; **no improvises soluciones silenciosas**.
- Si vas a tardar más de N iteraciones en un test rojo, pide input al humano.

---

## 12. Plantillas

### Mensaje de commit

```
feat(be-04): añadir endpoint de upload de fotos con validación mock

Implementa POST /v1/sessions/{id}/photos con:
- validación de mime y magic bytes
- almacenamiento en storage in-memory
- evento WS photo.captured al recibir

Refs: plans/backend/04-photos.md
```

### Descripción de PR

```markdown
## Qué
[Resumen de 1-3 líneas]

## Por qué
[Referencia al plan y al PRD]

## Cómo
[Cambios principales]

## Tests
- [ ] Unit
- [ ] Integration
- [ ] E2E
- [ ] Contract (si aplica)

## Checklist DoD
- [ ] PRD leído
- [ ] Plan respetado
- [ ] Lint + typecheck pasan
- [ ] Sin secrets
- [ ] Commit message convention

## Notas para reviewer
[Cualquier cosa que requiera atención especial]
```

---

## 13. Resumen de "qué hacer / qué NO hacer"

### ✅ SÍ
- Leer PRD antes de codear.
- Escribir tests primero.
- Hacer commits locales atómicos.
- Usar worktrees cuando hay paralelismo.
- Preguntar cuando hay ambigüedad.
- Pedir permiso antes de pushear.

### ❌ NO
- Pushear a GitHub sin permiso explícito.
- Modificar tests para que pasen.
- Importar infrastructure/framework en domain.
- Hardcodear strings de UI (usar i18n).
- Hardcodear URLs/secrets.
- Implementar más allá del test que falla.
- Marcar plan `done` con tests rojos.
- Asumir gaps del PRD silenciosamente.
- **Violar `integration_contracts.md` por ningún motivo** (ni "temporalmente", ni "solo en este PR", ni "porque aún no está implementado"). Si necesitas cambiar el contrato, abre PR `contract/` primero.

---

¿Dudas? Consulta:
- `plans/README.md` — índice de planes
- `plans/CLEAN-ARCHITECTURE.md` — reglas de arquitectura
- `plans/DOCKER.md` — estrategia docker-compose y E2E
- `integration_contracts.md` — contratos vinculantes
- `PRD-backend.md` / `PRD-frontend.md` — features por subproyecto

---

## 14. Docker Compose (estrategia general)

- **Mocks in-memory primero**: cada plan corre sin Docker usando los mocks descritos en `plans/CLEAN-ARCHITECTURE.md`. Solo se levanta Docker cuando el plan lo declara explícitamente o cuando hay un E2E completo.
- **Cada subproyecto tiene su propio `docker-compose.yml`** para integración cercana a producción:
  - `backend/docker-compose.yml` — API + Postgres + pgvector (+ Redis opcional)
  - `frontend/docker-compose.yml` — apps mobile/desktop + mock-server backend
- **Existe un `docker-compose.e2e.yml` global en la raíz** que levanta backend + Postgres + mobile + desktop + Playwright runner, con red compartida y healthchecks en cascada. Se usa para demos, CI de E2E y validación final de cada plan.
- **Reglas**:
  - `.env.docker` y `.env.e2e` están gitignored; solo `.env.docker.example` y `.env.e2e.example` se commitean.
  - Imágenes base pineadas (no `latest` en runtime), Dockerfiles multi-stage.
  - `restart: "no"` en servicios de test (Playwright).
  - `docker compose down -v` antes de re-correr E2E para garantizar estado limpio.
  - Tests E2E deterministas: fixtures fijos, sin reloj real, sin red externa.
- Detalle operativo en `plans/DOCKER.md`.