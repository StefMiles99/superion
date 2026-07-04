# AGENTS.md — Frontend SUPERION

Reglas específicas para trabajar en el subproyecto frontend (mobile + desktop). Las reglas globales viven en [`/AGENTS.md`](../AGENTS.md). Este archivo **no las duplica**, las concreta para el stack React/TS.

---

## Stack

React 19 · TypeScript estricto · Vite · pnpm workspaces + turborepo · TanStack Query · Zustand · React Router v7 · Tailwind + shadcn/ui · Playwright · Vitest · Testing Library · react-i18next · Workbox (PWA).

---

## Contexto obligatorio antes de tocar código

Antes de empezar **cualquier plan** del frontend:

1. Lee [`PRD-frontend.md`](../PRD-frontend.md) — features M1–M10, D1–D8, S1–S8.
2. Lee el plan concreto: [`plans/frontend/<NN>-<name>.md`](../plans/frontend/).
3. Lee [`plans/CLEAN-ARCHITECTURE.md`](../plans/CLEAN-ARCHITECTURE.md) — capas y reglas de env.
4. Lee [`integration_contracts.md`](../integration_contracts.md) — REST + WS shapes.

Si una decisión contradice el PRD, consulta al humano antes de implementar.

---

## Setup local con Docker (opcional)

Por defecto los planes corren con mocks in-memory sin Docker. Si necesitas un stack completo (mobile + desktop + mock-server backend) o E2E con Playwright, usa los compose del subproyecto:

```bash
cd frontend
docker compose up -d
# mobile:      http://localhost:5173
# desktop:     http://localhost:5174
# mock-server: http://localhost:8000
docker compose -f docker-compose.e2e.yml up --abort-on-container-exit  # + Playwright
```

Variables vía `frontend/.env.docker` (gitignored). Plantilla en `.env.docker.example`.

Para E2E global con backend real y Postgres: `docker-compose.e2e.yml` desde la raíz (ver [`plans/DOCKER.md`](../plans/DOCKER.md)).

---

## Estructura esperada del monorepo

```
frontend/
├── apps/
│   ├── mobile/                  # SPA técnico (PWA instalable)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── routes.tsx
│   │   │   └── main.tsx
│   │   ├── public/
│   │   │   ├── manifest.webmanifest
│   │   │   └── service-worker.ts
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── desktop/                 # SPA supervisor + admin RAG
│       └── ... (mismo patrón)
├── packages/
│   ├── domain/                  # tipos + validadores zod + ports
│   │   └── src/
│   │       ├── entities/
│   │       ├── value_objects/
│   │       ├── ports/           # IApiClient, IWsClient, IStorage
│   │       └── validators/
│   ├── api-client/              # impls de IApiClient
│   │   └── src/
│   │       ├── http.ts          # HttpApiClient (real)
│   │       ├── in_memory.ts     # InMemoryApiClient (mock)
│   │       └── factory.ts
│   ├── ws-client/               # impls de IWsClient
│   │   └── src/
│   │       ├── ws.ts            # RealWsClient
│   │       ├── in_memory.ts     # InMemoryWsClient (mock con emit())
│   │       └── factory.ts
│   ├── ui/                      # design system compartido
│   │   └── src/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       └── ...
│   ├── auth/                    # useAuth, RequireAuth
│   ├── i18n/                    # setup react-i18next + locales
│   └── config/                  # env vars tipadas + feature flags
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── .env.example
```

---

## Clean Architecture (frontend) — reglas concretas

### Domain (`packages/domain`)
- Sin imports de `react`, `fetch`, `localStorage`, `window`, `document`.
- Solo tipos TS, zod, branded types (`Uuid`, `IsoDate`).
- Ports = `interface IApiClient { ... }` (no `abstract class`).
- Validadores con zod (`photoSchema`, `workOrderSchema`).
- Errores como `Result<T, E>` o clases específicas (`AuthError`, `NetworkError`).

### Application (`packages/<feature>/hooks/`, `apps/*/src/hooks/`)
- Hooks de React que orquestan use cases (`useLogin`, `useUploadPhoto`, `useSessionStream`).
- TanStack Query para data fetching (queries + mutations).
- Zustand para estado UI local (filtros, modales, current user).
- **Sin JSX**. Si un hook devuelve JSX, no es hook — es componente.
- Sin `useEffect` para data fetching (eso es lo que hace TanStack Query).
- Errores esperados en domain (`Result`); errores inesperados → `console.error` + Sentry.

### Infrastructure (`packages/api-client`, `packages/ws-client`)
- `InMemory*` siempre funcional desde el primer commit, con `emit()` (ws) y `reset()` para tests E2E.
- `Http*` y `Ws*` arrancan como stubs que tiran `NotImplementedError` (cuando aún no aplica).
- `factory.ts` lee `import.meta.env.VITE_*_MODE` y devuelve la impl correcta. **Nunca** instanciar adapters directamente fuera de factories.
- Interceptores: añadir `Authorization`, `Idempotency-Key` (auto UUID), retry en 401 (una vez).

### UI (`apps/*/src/pages`, `apps/*/src/components`, `packages/ui`)
- Componentes funcionales. **Nunca** class components.
- Props tipadas con `interface` o `type`.
- Componentes "dumb" (reciben props) por defecto; container solo donde se justifica.
- Sin acceso directo a `fetch`/`localStorage` (siempre vía hook dedicado).
- Strings siempre con `t('key')` de i18n (nunca hardcoded).
- Default export solo en pages; named export en componentes.

---

## AI-TDD — secuencia concreta por plan

Cada plan en `plans/frontend/` declara tests explícitos. Esta es la secuencia canónica.

### Paso 1 — Tests rojos (orden de escritura)
```typescript
// 1. Tests unit del NUEVO domain (validadores, types)
// packages/domain/tests/<entity>.test.ts
import { describe, it, expect } from 'vitest';
import { photoSchema } from '../src/validators/photo';

describe('photoSchema', () => {
  it('rejects invalid status', () => { ... });
});

// 2. Tests unit del NUEVO adapter in-memory
// packages/api-client/tests/in_memory_<feature>.test.ts
describe('InMemoryApiClient.uploadPhoto', () => {
  it('returns accepted for A magic byte', async () => { ... });
});

// 3. Tests unit del NUEVO hook (con @testing-library/react-hooks o render)
// apps/mobile/tests/unit/useUploadPhoto.test.ts
describe('useUploadPhoto', () => {
  it('invalidates session on success', async () => { ... });
});

// 4. Tests integration del NUEVO componente (Testing Library)
// apps/mobile/tests/integration/PhotoValidationOverlay.test.tsx
import { render, screen } from '@testing-library/react';
import { PhotoValidationOverlay } from '@/components/PhotoValidationOverlay';

it('shows feedback on rejected', () => { ... });

// 5. Test E2E (al final del plan, Playwright)
// apps/mobile/tests/e2e/<NN>-<feature>.spec.ts
import { test, expect } from '@playwright/test';

test('photo accepted flow', async ({ page }) => { ... });
```

### Paso 2 — Verificar rojo
```bash
pnpm --filter @superion/domain test
pnpm --filter @superion/api-client test
pnpm --filter mobile test
pnpm exec playwright test apps/mobile/tests/e2e/<NN>-<feature>.spec.ts
```

### Paso 3 — Implementación mínima para verde
- Solo lo necesario.

### Paso 4 — Verde
```bash
pnpm test
```

### Paso 5 — Refactor + lint
```bash
pnpm lint
pnpm typecheck
pnpm test
```

### Paso 6 — E2E + a11y
```bash
pnpm exec playwright test
pnpm exec playwright test --grep "@a11y"
```

### Paso 7 — Commit (un commit por tipo)
```bash
git add packages/domain/src/validators/photo.ts
git commit -m "test(fe-<NN>): añadir validador zod de foto"
git add packages/api-client/src/in_memory.ts
git commit -m "feat(fe-<NN>): añadir uploadPhoto al InMemoryApiClient"
git add apps/mobile/src/components/PhotoValidationOverlay.tsx
git commit -m "feat(fe-<NN>): añadir overlay de validación de foto"
git add apps/mobile/tests/e2e/<NN>-<feature>.spec.ts
git commit -m "test(fe-<NN>): añadir E2E de foto aceptada"
```

---

## In-memory discipline (frontend)

- `InMemoryApiClient` con fixtures sembrados al instanciar (5 OTs, 3 técnicos, 2 manuales).
- `InMemoryWsClient` con `emit(event)` para tests E2E que necesitan inyectar eventos.
- Reset entre tests (`window.__superion.api.reset()`, `window.__superion.ws.reset()`).
- Para tiempo: `Clock` port (`now(): number`) — no `Date.now()` en lógica testeable.
- Exponer handles en `window.__superion` solo en modo dev/test para que Playwright pueda manipularlos.

```typescript
// apps/mobile/src/main.tsx
const api = getApiClient();
const ws = getWsClient();

if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
  (window as any).__superion = { api, ws };
}
```

---

## Switch por env

```typescript
// packages/api-client/src/factory.ts
export function getApiClient(): IApiClient {
  const mode = import.meta.env.VITE_API_MODE ?? 'mock';
  if (mode === 'mock') return new InMemoryApiClient();
  if (mode === 'http') return new HttpApiClient(import.meta.env.VITE_API_BASE_URL);
  throw new Error(`VITE_API_MODE=${mode} no soportado`);
}
```

```bash
# .env.example
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
VITE_API_MODE=mock           # mock | http
VITE_WS_MODE=mock            # mock | real
VITE_DEFAULT_LOCALE=es-ES
VITE_DEFAULT_THEME=dark
VITE_SENTRY_DSN=
VITE_TELEMETRY_ENABLED=true
```

### Defaults = mock
Toda env var nueva arranca con `mock` para que el plan corra sin backend.

---

## React patterns

### Hooks
- `useQuery` con keys estables jerárquicas: `['session', sessionId]`, `['session', sessionId, 'events']`.
- `useMutation` con invalidación explícita (`queryClient.invalidateQueries`).
- Custom hooks para lógica reutilizable (`useSessionTimers`, `useEta`, `usePhotoQueue`).
- `useEffect` solo para side effects reales (timers, subscriptions, focus, scroll).
- Sin `useEffect` para data fetching.

### Estado
- **TanStack Query** = data del servidor.
- **Zustand** = estado UI (filtros, modales, current user, draft de form).
- **Sin Redux** en este proyecto.
- **Sin Context** para data (es anti-patrón con TanStack Query).
- **localStorage** solo para sesión (FE-01) y `last_seq` (FE-05). Hook dedicado (`useLocalStorage`).

### Componentes
- Functional components únicamente.
- Props con `interface Props { ... }` o `type Props = ...`.
- Composición sobre herencia.
- `React.memo` solo si hay re-renders medibles (no prematuro).
- `useMemo`/`useCallback` solo si hay ganancia medida.
- `useId()` para IDs accesibles, no hardcoded.

### Routing
- React Router v7 con lazy loading por ruta:
  ```tsx
  const SessionPage = lazy(() => import('./pages/SessionPage'));
  <Suspense fallback={<Skeleton />}>
    <SessionPage />
  </Suspense>
  ```
- Guard `<RequireAuth>` (FE-01) redirige a `/login` si no hay sesión.
- Rutas con `:id` validan param antes de fetch.

---

## i18n (obligatorio desde FE-00)

- Setup con `react-i18next`.
- `packages/i18n/src/locales/es.json` con todas las strings.
- `packages/i18n/src/locales/en.json` stub (no usado en v1).
- Strings en código: `const { t } = useTranslation(); t('workOrders.title')`.
- Detección: `navigator.language` → fallback `es-ES`.
- Formato de fecha/número con `Intl.DateTimeFormat` / `Intl.NumberFormat` según locale.
- **NUNCA** strings hardcoded en JSX (revisión de PR falla si se detecta).

```tsx
// ❌ MAL
<button>Iniciar mantenimiento</button>

// ✅ BIEN
<button>{t('session.start')}</button>
```

---

## Accesibilidad (WCAG 2.1 AA — obligatorio)

- Botones con `aria-label` cuando el texto no es claro (icon buttons).
- `aria-live="polite"` para eventos que cambian contenido (assistant.answer, photo.validated).
- `aria-live="assertive"` solo para errores críticos.
- Focus visible siempre (no `outline: none` sin alternativa clara).
- Navegación por teclado completa (Tab, Shift+Tab, Enter, Esc en modales).
- Contraste suficiente en dark mode (verificar con axe-core).
- Targets ≥ 48×48 dp en mobile (uso con guantes).
- `prefers-reduced-motion`: respetar (desactivar animaciones de VoiceIndicator).
- Skip links en desktop (saltar a main content).

---

## PWA

- `public/manifest.webmanifest` con `name`, `short_name`, `icons` (192, 512), `theme_color`, `background_color`, `display: standalone`.
- Service Worker para cache de assets estáticos.
- Background Sync para cola de fotos offline (FE-07).
- Install prompt en mobile tras primer evento relevante.

---

## Telemetría

- Sentry init en `main.tsx`.
- `console.error` capturado.
- Errores no manejados (window.onerror, unhandledrejection) → Sentry.
- Web Vitals (LCP, FID, CLS) con `web-vitals` lib → Sentry o endpoint `/telemetry`.
- Eventos custom de negocio: `session_started`, `photo_uploaded`, `manual_searched`, `assistant_question`.

---

## Estilo de código

- **ESLint + Prettier** con config estricta (reglas Airbnb o custom equivalente).
- **TS strict** total:
  ```json
  {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true
  }
  ```
- Naming:
  - `camelCase` para variables/funciones/hooks.
  - `PascalCase` para tipos/componentes/interfaces.
  - `UPPER_SNAKE_CASE` para constantes.
- Sin `any` (usar `unknown` + narrowing).
- Sin `@ts-ignore` (usar `@ts-expect-error` con razón documentada).
- Imports ordenados: externos → `@superion/*` → relativos.
- Naming de archivos: `PascalCase.tsx` para componentes, `camelCase.ts` para utils/hooks.

---

## Errores

- `Result<T, E>` para errores esperados en domain (red, validación, auth).
- `try/catch` solo en boundaries (HTTP, WS, localStorage, Sentry).
- `<ErrorBoundary>` en root y por página crítica.
- Toast (no `alert()`) para errores de usuario.
- Sentry para todo lo no manejado.

---

## Testing patterns

### Unit (vitest)
```typescript
import { describe, it, expect } from 'vitest';

describe('useUploadPhoto', () => {
  it('invalidates session cache on success', async () => {
    const { result } = renderHook(() => useUploadPhoto('sess-1'), {
      wrapper: createWrapper(),
    });
    
    await act(async () => {
      await result.current.mutateAsync({ file: new Blob(['A']), stepIndex: 0 });
    });
    
    expect(mockInvalidate).toHaveBeenCalledWith(['session', 'sess-1']);
  });
});
```

### Integration (Testing Library)
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoValidationOverlay } from '@/components/PhotoValidationOverlay';

it('shows feedback on rejected', async () => {
  const user = userEvent.setup();
  render(<PhotoValidationOverlay status="rejected" feedback="acércate más" />);
  await user.click(screen.getByRole('button'));
  expect(screen.getByText(/acércate más/i)).toBeInTheDocument();
});
```

### E2E (Playwright)
```typescript
import { test, expect } from '@playwright/test';

test('photo accepted flow', async ({ page }) => {
  await page.goto('/');
  await page.fill('[name=email]', 'juan@planta.com');
  await page.fill('[name=password]', 'test1234');
  await page.click('button[type=submit]');
  await page.waitForURL('**/work-orders');
  await page.getByText('OT-1234').click();
  await page.getByRole('button', { name: 'Iniciar mantenimiento' }).click();
  await page.waitForURL('**/sessions/**');
  await page.getByTestId('mock-camera').setInputFiles({
    name: 'ok.jpg', mimeType: 'image/jpeg',
    buffer: Buffer.from('Acontenido'),
  });
  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(page.getByText(/foto aceptada/i)).toBeVisible({ timeout: 3000 });
});
```

### a11y (axe-core en Playwright)
```typescript
import { AxeBuilder } from '@axe-core/playwright';

test('work orders page a11y', async ({ page }) => {
  await page.goto('/work-orders');
  const results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter(v => v.impact === 'critical');
  expect(critical).toEqual([]);
});
```

---

## Performance

- `LCP < 2.5 s` en mobile (3G fast).
- `FID < 100 ms`, `CLS < 0.1`.
- Bundle inicial mobile < 200 KB gzip (code splitting por ruta).
- Imágenes: `loading="lazy"`, formatos modernos (AVIF/WebP).
- `react-virtuoso` para listas largas (FE-10 event stream).
- WS no bloquea UI: render optimista + reconciliación.

---

## ❌ NO HACER (frontend)

- ❌ Importar `react` desde `packages/domain`.
- ❌ Llamar a `fetch` directamente desde componentes (usar hook).
- ❌ Strings hardcoded (siempre `t('key')`).
- ❌ `localStorage` directo en componentes (hook dedicado).
- ❌ Side effects en render.
- ❌ Tipos `any` (usar `unknown` + narrowing).
- ❌ `console.log` de debug (usar `console.error` para errores reales; nada más).
- ❌ `useEffect` para data fetching (usar TanStack Query).
- ❌ Class components.
- ❌ Romper `integration_contracts.md` sin PR `contract/`.
- ❌ **Violar `integration_contracts.md` por ningún motivo** (ni "temporalmente", ni "solo en este PR", ni "porque el backend aún no expone X"). Si una feature del PRD no encaja con el contrato actual, el orden correcto es: (1) abrir PR `contract/` que actualice el contrato (con bump de versión si es breaking), (2) implementar contra el nuevo contrato. Si dudas si algo viola el contrato, **lo viola**: consulta al humano antes de mergear.
- ❌ **Hacer `git push`** — solo el humano.
- ❌ Implementar más allá del test que falla.

---

## ✅ Checklist antes de marcar plan `done`

- [ ] PRD-frontend.md leído y referenciado en descripción del PR.
- [ ] Plan de `plans/frontend/<NN>-<name>.md` leído y todos sus tests pasan.
- [ ] `pnpm test` pasa 100 % (unit + integration + e2e).
- [ ] `pnpm lint` pasa sin warnings.
- [ ] `pnpm typecheck` pasa en strict.
- [ ] axe-core 0 violaciones críticas en páginas nuevas o modificadas.
- [ ] Strings nuevas añadidas a `packages/i18n/src/locales/es.json`.
- [ ] Tipos actualizados si hubo cambios de API (`@superion/api-client` regenerado).
- [ ] Sin `any`, sin TODOs sin ticket, sin código comentado.
- [ ] Sin warnings de React (key, exhaustive deps).
- [ ] Sin CSS inline crítico fuera de tokens.
- [ ] Bundle inicial mobile sin crecer > 10 % vs plan anterior.
- [ ] Mensajes de commit siguen Conventional Commits en español.
- [ ] Branch `feature/fe-<NN>-<name>` actualizado con `develop`.
- [ ] PR abierto hacia `develop`, etiquetado `frontend` + nombre del plan.
- [ ] E2E scenario del plan verificado con Playwright.

---

## Recursos

- [PRD-frontend.md](../PRD-frontend.md) — features
- [integration_contracts.md](../integration_contracts.md) — contratos vinculantes
- [plans/frontend/](../plans/frontend/) — planes incrementales
- [plans/CLEAN-ARCHITECTURE.md](../plans/CLEAN-ARCHITECTURE.md) — reglas comunes
- [plans/DOCKER.md](../plans/DOCKER.md) — estrategia docker-compose y E2E
- [AGENTS.md raíz](../AGENTS.md) — reglas globales