# SUPERION Backend

Skeleton FastAPI con arquitectura hexagonal (BE-00).

## Requisitos

- Python 3.12+
- pip

## Setup

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/macOS
source .venv/bin/activate

pip install -e ".[dev]"
cp .env.example .env
```

## Ejecutar

```bash
uvicorn interface.main:app --reload --app-dir src
```

Endpoints:

- `GET /health` — liveness (`{"status":"ok","version":"0.1.0","deps":{}}`)
- `GET /ready` — readiness (`{"status":"ready"}`)

## Tests

```bash
pytest -q
```

## Arquitectura

```
src/
├── domain/          # entidades, ports, excepciones
├── application/     # use cases, DTOs
├── infrastructure/  # config, adapters in-memory, logging
└── interface/       # FastAPI, middleware, routers
```

Refs: `plans/backend/00-foundation.md`
