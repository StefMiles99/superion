# Docker Compose — Estrategia

Documentación operativa de los `docker-compose` por subproyecto y el global para E2E.

## Filosofía

- **In-memory mocks primero**: cada plan corre con mocks sin Docker (ver `plans/CLEAN-ARCHITECTURE.md`).
- **`docker-compose` por subproyecto**: cuando un plan necesita servicios reales (Supabase local, Postgres + pgvector, Redis, etc.) o se quiere integración cercana a producción, se levanta el subproyecto con su compose.
- **`docker-compose` global en raíz para E2E**: escenarios completos donde backend + frontend (mobile + desktop) + servicios reales corren juntos, incluyendo el runner de Playwright.

## Estructura esperada

```
backend/
├── Dockerfile
├── docker-compose.yml           # API + postgres+pgvector + (opcional) redis
├── docker-compose.dev.yml       # dev con hot-reload y bind-mounts
└── .env.docker.example

frontend/
├── Dockerfile                   # usado por compose global
├── docker-compose.yml           # mobile + desktop + mock-server (InMemoryApiClient / FastAPI mock)
├── docker-compose.e2e.yml       # añade playwright runner
└── .env.docker.example

docker-compose.e2e.yml           # raíz: backend + postgres + mobile + desktop + playwright
.env.e2e.example
```

---

## Backend — `backend/docker-compose.yml`

### Servicios
- **`api`**: FastAPI app (puerto `8000`). Imagen del `Dockerfile` del backend.
- **`postgres`**: `postgres:16` + extensión `pgvector` (imagen `ankane/pgvector:latest` o build local con init SQL). Puerto `5432`.
- **`redis`**: opcional. Solo si el modo `EVENTBUS=redis` o `RATE_LIMIT=redis`. Puerto `6379`.

### Levantar (modo integración)
```bash
cd backend
docker compose up -d
# API:      http://localhost:8000
# Postgres: localhost:5432  (user/pass en .env.docker)
# Health:   curl http://localhost:8000/ready
```

### Dev con hot-reload
```bash
docker compose -f docker-compose.dev.yml up
# bind-mount de ./src → /app/src, uvicorn --reload
```

### Variables
Definidas en `backend/.env.docker` (gitignored). Plantilla en `.env.docker.example`:
```dotenv
POSTGRES_USER=superion
POSTGRES_PASSWORD=dev-only-change-me
POSTGRES_DB=superion

PERSISTENCE=supabase
SUPABASE_URL=http://postgres:5432          # host interno de Docker
SUPABASE_SERVICE_ROLE_KEY=dev-only-change-me

JWT_SECRET=dev-only-32-bytes-min-change-me
RATE_LIMIT=memory
EVENTBUS=memory
```

---

## Frontend — `frontend/docker-compose.yml`

### Servicios
- **`mobile`**: Vite dev server para la app mobile (puerto `5173`).
- **`desktop`**: Vite dev server para la app desktop (puerto `5174`).
- **`mock-server`**: backend FastAPI corriendo en modo `PERSISTENCE=memory` (puerto `8000`). Sirve como API mock cuando aún no hay backend real o para tests deterministas.

### Levantar
```bash
cd frontend
docker compose up -d
# mobile:     http://localhost:5173
# desktop:    http://localhost:5174
# mock-server: http://localhost:8000
```

### Variables
```dotenv
VITE_API_BASE_URL=http://mock-server:8000
VITE_WS_BASE_URL=ws://mock-server:8000
VITE_API_MODE=http          # apunta al mock-server real, no a InMemoryApiClient
VITE_WS_MODE=real
```

### E2E con Playwright
```bash
cd frontend
docker compose -f docker-compose.e2e.yml up --abort-on-container-exit
# añade servicio `playwright` que corre los tests contra mobile + desktop
```

---

## Global — `docker-compose.e2e.yml` (raíz)

Levanta **todo** para un E2E completo con servicios reales, listo para CI y para demos locales.

### Servicios
- **`backend`** (build `./backend`): FastAPI + endpoints reales.
- **`postgres`**: Postgres 16 + pgvector.
- **`mobile`** (build `./frontend/apps/mobile`): Vite dev.
- **`desktop`** (build `./frontend/apps/desktop`): Vite dev.
- **`playwright`** (build `./frontend`): runner de tests E2E contra los dos apps.

### Levantar
```bash
# desde la raíz del repo
docker compose -f docker-compose.e2e.yml up --abort-on-container-exit --exit-code-from playwright
# Playwright corre y, al terminar, el compose sale con su exit code
```

### Networking
- Red compartida `superion_net` (bridge).
- Hostnames internos: `backend`, `postgres`, `mobile`, `desktop`, `playwright`.
- Healthchecks:
  - `postgres` → `pg_isready`
  - `backend` → `GET /ready` (espera a `postgres`)
  - `mobile` → `GET /` (HTTP 200)
  - `desktop` → `GET /` (HTTP 200)
  - `playwright` → depende de `backend + mobile + desktop`

### Volúmenes
- `postgres_data` para persistencia de DB entre runs (se borra con `docker compose down -v`).
- Bind-mounts en dev solo si se usa overlay de dev.

---

## Cuándo usar cada compose

| Escenario | Compose |
|---|---|
| Unit tests (mocks) | ninguno — `pytest`, `pnpm test` |
| Plan que necesita DB real local | `backend/docker-compose.yml` |
| Frontend contra backend mock | `frontend/docker-compose.yml` |
| E2E mobile o desktop contra mocks | `frontend/docker-compose.e2e.yml` |
| E2E global con DB y backend reales | `docker-compose.e2e.yml` (raíz) |
| Demo local end-to-end | `docker-compose.e2e.yml` (raíz) |
| Staging / prod | infra gestionada real, fuera de compose local |

---

## Reglas

- **Nunca** commitear `.env.docker` con secretos reales. Solo `.env.docker.example` y `.env.e2e.example`.
- Cada Dockerfile multi-stage con imagen base pineada (evitar `latest` para runtime).
- `docker compose down -v` antes de re-correr E2E para garantizar estado limpio.
- `restart: "no"` en servicios de test (Playwright, scripts one-shot).
- Tests E2E deben ser **deterministas**: fixtures fijos, sin reloj real (inyectar `Clock` mock), sin red externa.
- CI usa estos mismos compose files; cualquier cambio debe probarse primero localmente con `docker compose up`.
- Cada plan puede declarar explícitamente si requiere o no `docker compose up` antes de su E2E.

---

## Troubleshooting común

- **"Connection refused" a postgres desde backend**: el healthcheck no esperó; añadir `depends_on: postgres: condition: service_healthy`.
- **Playwright falla al primer test**: aumentar `retries` en `playwright.config.ts` y/o `wait-on http://mobile:5173`.
- **Cache de node_modules obsoleto**: `docker compose build --no-cache frontend`.
- **Conflictos de puerto**: cambiar el mapping en compose (`5173:5173` → `15173:5173`).

---

## Referencias

- `plans/CLEAN-ARCHITECTURE.md` — filosofía de mocks y factories.
- `integration_contracts.md` §3 — endpoints que se prueban en E2E.
- Cada plan de `plans/backend/` y `plans/frontend/` puede declarar en su sección "Setup" si requiere `docker compose up` previo.