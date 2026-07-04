# FE-00 — Foundation

**Estado:** ✅
**Depende de:** —
**Desbloquea:** FE-01..13
**PRD features:** S1 (skeleton), S3 (ui base), S4 (domain skeleton)
**Stack:** frontend · capas: domain skeleton + infrastructure skeleton + ui skeleton

## Goal

Monorepo pnpm + turborepo con dos apps (mobile, desktop) y packages compartidos (`@superion/api-client`, `@superion/ws-client`, `@superion/ui`, `@superion/domain`, `@superion/config`). Cada app carga, navega a una página placeholder, y los mocks in-memory están wired.

## Estructura del repo

```
frontend/
├── package.json                 # workspace root
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .env.example
├── apps/
│   ├── mobile/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── package.json
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       └── routes.tsx        # placeholder "/"
│   └── desktop/
│       ├── index.html
│       ├── vite.config.ts
│       ├── package.json
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           └── routes.tsx        # placeholder "/"
└── packages/
    ├── api-client/              # IApiClient + InMemoryApiClient + HttpApiClient (stub)
    ├── ws-client/               # IWsClient + InMemoryWsClient + WsClient (stub)
    ├── ui/                      # design tokens + Button + Card + Skeleton
    ├── domain/                  # types compartidos + validadores zod
    └── config/                  # env + feature flags
```

## Capas

### Domain (`packages/domain`)
- `entities/work_order.ts` — tipos placeholder
- `entities/user.ts` — `User`, `Role`
- `value_objects/index.ts` — branded types `Uuid`, `IsoDate`
- `ports/IApiClient.ts` — interface con 2-3 métodos placeholder
- `ports/IWsClient.ts` — interface con `connect`, `subscribe`, `disconnect`
- `validators/zod.ts` — `UserSchema`, `WorkOrderSchema`

### Infrastructure
- `packages/api-client/src/in_memory.ts` — `InMemoryApiClient` con fixtures mínimas (1 user)
- `packages/api-client/src/http.ts` — `HttpApiClient` con `fetch` (stub: lanza NotImplemented)
- `packages/api-client/src/factory.ts` — `getApiClient()` basado en `VITE_API_MODE`
- `packages/ws-client/src/in_memory.ts` — `InMemoryWsClient` que solo guarda subscribers
- `packages/ws-client/src/factory.ts` — `getWsClient()`

### UI
- `packages/ui/src/tokens.ts` — colores (dark default), spacing, typography
- `packages/ui/src/Button.tsx`
- `packages/ui/src/Card.tsx`
- `packages/ui/src/Skeleton.tsx`
- `packages/ui/src/index.ts`

### Config
- `packages/config/src/env.ts` — tipos + parser zod de `import.meta.env`
- Feature flags: `VITE_API_MODE`, `VITE_WS_MODE`, `VITE_DEFAULT_LOCALE`

## Switch vía .env

```
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
VITE_API_MODE=mock|http
VITE_WS_MODE=mock|real
VITE_DEFAULT_LOCALE=es-ES
VITE_DEFAULT_THEME=dark
```

## Tests que se escriben PRIMERO

1. `packages/domain/tests/entities/user.test.ts` — invariantes de tipos (compile + runtime con zod)
2. `packages/api-client/tests/in_memory.test.ts` — fixture user se devuelve
3. `packages/ws-client/tests/in_memory.test.ts` — subscribe recibe eventos emitidos
4. `packages/ui/tests/Button.test.tsx` — render, click handler
5. `apps/mobile/tests/e2e/00-foundation.spec.ts` — Playwright: app carga, ve página placeholder
6. `apps/desktop/tests/e2e/00-foundation.spec.ts` — Playwright: app carga

## Implementación mínima para verde

- Vite + React 19 + TS estricto.
- Tailwind + shadcn base (solo Button + Card en v1).
- React Router v7 con una ruta `/` por app.
- `pnpm dev` levanta ambos apps en paralelo.

## Definition of Done

- [x] `pnpm install` + `pnpm dev` levanta mobile (http://localhost:5173) y desktop (http://localhost:5174)
- [x] Ambos apps renderizan placeholder
- [x] `pnpm test` pasa unit tests de packages
- [x] `pnpm test:e2e` pasa Playwright de ambos apps
- [x] Mock clients funcionan sin backend
- [x] Switch `VITE_API_MODE=mock|http` wired y testeado

## Variables de entorno nuevas

Ver arriba.

## Notas

- Tailwind + shadcn se introducen aquí como dependencia compartida; los componentes específicos de dominio se añaden en cada plan (FE-02, FE-07, etc.).