# SUPERION — Frontend (monorepo)

App móvil **voice-first** para técnicos de mantenimiento. Monorepo pnpm con
arquitectura limpia (DDD + puertos/adaptadores), i18n, code-splitting y
adaptadores desacoplados que permiten **ejecutar y testear todo sin backend**.

## Estructura

```
frontend/
├── apps/
│   ├── mobile/                 # App técnico voice-first (móvil)
│   │   ├── src/
│   │   │   ├── pages/          # Login, WorkOrders, Detail, Session, Report (lazy)
│   │   │   ├── components/     # MicButton, StepBanner, CameraCapture, ...
│   │   │   ├── hooks/          # useLogin, useSession, useVoiceAgent, ...
│   │   │   ├── services/       # Inyección de dependencias (DI container + context)
│   │   │   ├── stores/         # Estado de UI de la sesión (zustand)
│   │   │   └── App.tsx, main.tsx, routes
│   │   ├── tests/              # Vitest + Testing Library
│   │   └── e2e/                # Playwright
│   └── desktop/                # Dashboard admin RAG (solo escritorio)
│       └── src/                # Login admin, panel de manuales (subida PDF, indexado)
└── packages/
    ├── domain/                 # Entidades, value objects, PORTS, zod, Result (sin I/O)
    ├── config/                 # Env tipado + feature flags (modos mock/http)
    ├── api-client/             # HttpApiClient · InMemoryApiClient · MockBackend
    ├── ws-client/              # RealWsClient · InMemoryWsClient (bus del MockBackend)
    ├── voice/                  # ElevenLabsVoiceClient · InMemoryVoiceClient
    ├── i18n/                   # react-i18next (es-ES / en-US)
    ├── ui/                     # Componentes presentacionales (Button, Screen…)
    └── auth/                   # IStorage (Browser/Memory) + store de usuario
```

## Arquitectura (Clean / DDD)

- **Domain** (`packages/domain`): puro, sin dependencias de framework/red. Define
  las entidades y los **puertos** (`IApiClient`, `IWsClient`, `IVoiceClient`,
  `IStorage`, `IClock`).
- **Infraestructura** (`api-client`, `ws-client`, `voice`, `auth`, `i18n`, `ui`):
  implementa los puertos. Cada uno ofrece un adaptador **real** y uno
  **in-memory** intercambiable.
- **Aplicación + Interfaz** (`apps/mobile`): hooks (casos de uso) y componentes.
  Las dependencias se inyectan vía `ServicesProvider` (`useServices()`), nunca se
  instancian dentro de los componentes.

### Desacoplamiento (probar sin backend)

Las factories eligen el adaptador según variables de entorno:

| Variable | Valores | Efecto |
|---|---|---|
| `VITE_API_MODE` | `mock` \| `http` | REST in-memory vs FastAPI real |
| `VITE_WS_MODE` | `mock` \| `real` | Bus in-memory vs WebSocket real |
| `VITE_VOICE_MODE` | `mock` \| `elevenlabs` | Voz simulada vs SDK ElevenLabs |

En modo `mock` (por defecto) un `MockBackend` comparte estado y bus de eventos
entre el cliente REST y el WS: iniciar sesión, subir fotos (con validación
simulada + avance de paso) y la respuesta del asistente funcionan sin servidor.

## Scripts

```bash
pnpm install                          # instala todo el workspace
pnpm dev                              # arranca apps/mobile (Vite, :5173)
pnpm --filter @superion/desktop dev   # arranca el dashboard desktop (:5174)
pnpm build                            # build de producción (mobile)
pnpm --filter @superion/desktop build # build del dashboard
pnpm test                             # Vitest en todos los packages
pnpm typecheck                        # tsc --noEmit en todos los packages
pnpm --filter @superion/mobile e2e    # Playwright (requiere: pnpm exec playwright install)
```

## Demo

- App móvil (técnico): `juan@planta.com` / `test1234`.
- Dashboard desktop (admin RAG): `admin@planta.com` / `test1234` (también `ana@planta.com` en mock).

El dashboard sube manuales PDF (drag & drop), simula la indexación asíncrona
(con **polling** del estado) y permite reindexar/archivar — todo sin backend.

> Cámara y micrófono requieren `https` o `localhost` y un gesto del usuario. En
> modo `mock` la voz se simula y no pide permisos.

## Convenciones

- Contrato vinculante: `../integration_contracts.md` (tipos en `packages/domain`).
- i18n obligatorio: nada de strings hardcodeados en UI (`useTranslation`).
- Code-splitting: páginas cargadas con `React.lazy` + vendors separados.
