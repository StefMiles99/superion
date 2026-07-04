# PRD — Frontend (React 19 + TS)

**Subproyecto:** Frontend SUPERION (Mobile + Desktop)
**Stack:** React 19 · TypeScript estricto · Vite · React Router · TanStack Query · Zustand · react-i18next · Tailwind + shadcn/ui · @superion/api-client (generado)
**Consumidor único:** Backend FastAPI
**Documentos relacionados:** `PRD.md`, `integration_contracts.md`

---

## 1. Resumen

Dos aplicaciones web (móvil para técnico, desktop para supervisor/admin) construidas sobre una librería compartida de UI, cliente API, cliente WebSocket y modelo de dominio. Ambas se comunican **exclusivamente** con el backend vía REST + WebSocket definidos en `integration_contracts.md`.

**Reglas de oro:**
- Frontend **nunca** habla directo con Supabase, OpenRouter, LangGraph o ElevenLabs.
- Toda la lógica de IA vive en el backend; el frontend solo renderiza resultados.
- Diseño **voice-first** en móvil, **densidad informacional** en desktop.

---

## 2. Alcance

### 2.1 In-scope
- Dos SPAs: `mobile` y `desktop` (un solo repo, monorepo pnpm).
- Librería compartida `@superion/ui`, `@superion/api-client`, `@superion/ws-client`, `@superion/domain`.
- Autenticación, manejo de sesión, refresh.
- Mobile: lista OT, vista de paso, cámara, validación de fotos, reporte resumido, descarga PDF, UI de voz.
- Desktop: biblioteca de manuales (RAG), plantillas de procedimiento, monitor de sesiones, reporte en vivo.
- i18n preparado (es en v1).
- Modo offline para fotos.
- Accesibilidad WCAG 2.1 AA.

### 2.2 Out-of-scope
- Backend, Supabase, LangGraph, ElevenLabs (lo hace backend).
- Auth real propio (delega a Supabase vía backend).
- Pagos, facturación.
- App nativa (PWA instalable sí, nativa no).

---

## 3. Arquitectura frontend

```
frontend/
├── apps/
│   ├── mobile/                  # SPA móvil (técnico)
│   │   ├── src/
│   │   │   ├── routes.tsx
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── WorkOrdersPage.tsx
│   │   │   │   ├── SessionPage.tsx
│   │   │   │   ├── CameraPage.tsx
│   │   │   │   └── ReportPage.tsx
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   └── vite.config.ts
│   └── desktop/                 # SPA desktop (supervisor + admin RAG)
│       ├── src/
│       │   ├── routes.tsx
│       │   ├── pages/
│       │   │   ├── LoginPage.tsx
│       │   │   ├── DashboardPage.tsx
│       │   │   ├── SessionDetailPage.tsx
│       │   │   ├── ManualsPage.tsx
│       │   │   ├── ManualUploadPage.tsx
│       │   │   ├── ProcedureTemplatesPage.tsx
│       │   │   └── ReportViewPage.tsx
│       │   └── main.tsx
│       ├── index.html
│       └── vite.config.ts
├── packages/
│   ├── api-client/              # generado desde openapi.yaml
│   │   ├── src/
│   │   │   ├── client.ts        # fetch wrapper con auth, retries
│   │   │   ├── types.ts         # tipos generados
│   │   │   ├── hooks.ts         # react-query wrappers
│   │   │   └── index.ts
│   ├── ws-client/               # cliente WS con reconexión + catch-up
│   │   └── src/
│   ├── ui/                      # design system compartido
│   │   └── src/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Stepper.tsx
│   │       ├── VoiceIndicator.tsx
│   │       ├── PhotoCapture.tsx
│   │       ├── CitationChip.tsx
│   │       └── ...
│   ├── domain/                  # tipos compartidos, validadores
│   │   └── src/
│   └── config/                  # env, feature flags
├── public/
├── package.json (pnpm workspace)
└── turbo.json (o nx.json)
```

---

## 4. Features — Mobile (técnico)

### 4.1 Autenticación
- **M1.1 Login screen** email + password.
- **M1.2 Persistencia de sesión**: `access_token` en memoria + cookie httpOnly de refresh (seteada por backend).
- **M1.3 Auto-refresh** transparente vía interceptor en `api-client`.
- **M1.4 Logout** limpia storage + revoca token.
- **M1.5 PIN mode kiosko** opcional: input numérico para entornos de planta donde el supervisor pre-loggea al técnico.

### 4.2 Lista de órdenes de trabajo
- **M2.1 Listado** con scroll infinito (TanStack Query + cursor).
- **M2.2 Tarjeta OT**: código, equipo, prioridad, plan, badge de estado.
- **M2.3 Filtros**: status (tabs), prioridad (chip filter), búsqueda por código/tag.
- **M2.4 Estado vacío** instructivo con CTA.
- **M2.5 Pull-to-refresh**.
- **M2.6 Empty/loading/error states** con skeletons.

### 4.3 Selección de OT (toque o voz)
- **M3.1 Tap en tarjeta** → vista de detalle de OT.
- **M3.2 Botón flotante "Iniciar mantenimiento"** → llama `POST /work-orders/{id}/start`.
- **M3.3 Voice command** "abrir orden 1234" / "abrir mantenimiento del [equipo]" → reconocimiento via ElevenLabs (en el canal de voz), el resultado llega como intent y el cliente navega.
- **M3.4 Confirmación visual** antes de iniciar (modal con resumen del procedimiento).

### 4.4 Vista de sesión (paso activo)
- **M4.1 Header** con código OT, botón pausar, cronómetro total.
- **M4.2 Progress stepper**: "Paso 4 de 12" + barra horizontal + dots.
- **M4.3 Lista compacta de pasos restantes** (scroll vertical).
- **M4.4 Card de paso actual**:
  - Título grande (legible a 2 m)
  - Descripción con scroll
  - Badge "Crítico" si aplica
  - Badge "Requiere foto" si aplica
- **M4.5 Cronómetro del paso actual** + **ETA dinámico** (recibe del WS `step.entered` con `estimated_minutes`; recalcula con ritmo real).
- **M4.6 Botones grandes** (≥ 56 dp):
  - "Siguiente paso" (deshabilitado si pre-req falta)
  - "Repetir paso"
  - "Pausar"
- **M4.7 Voice indicator**: barra inferior con animación de onda cuando ASR activo; label "Escuchando…"; muestra último transcript.
- **M4.8 Modal de duda**: input texto + lista de respuestas previas (citas).

### 4.5 Comandos de voz UI (sin pasar por ElevenLabs)
- **M5.1 Tap en mic** → abre sesión de voz con ElevenLabs (en realidad la sesión ya está abierta durante toda la sesión; este botón es explícito "preguntar").
- **M5.2 Botón "Tengo una duda"** → activa intent `query` durante 5 s.

### 4.6 Captura de fotos
- **M6.1 Activación automática** cuando llega WS `photo.requested` (via `assistant.answering` o `step.entered` con `requires_photo`).
- **M6.2 Pantalla de cámara fullscreen** con overlay:
  - Instrucciones contextuales ("Acércate al sensor de temperatura")
  - Botón de captura grande
  - Cancelar
- **M6.3 Preview post-captura**:
  - Botón "Re-tomar"
  - Botón "Enviar" (sube a `POST /photos`)
- **M6.4 Estado "Validando…"** mientras llega evento WS `photo.validated|rejected`.
- **M6.5 Si rechazado**: overlay con feedback de IA + botón "Re-tomar".
- **M6.6 Si aceptado**: animación check + vuelve a vista de paso.
- **M6.7 Modo offline**:
  - Si no hay red, foto se guarda en IndexedDB con `pending_upload=true`.
  - Background sync (Service Worker) sube cuando vuelve la red.
  - UI muestra badge "Sincronizando…" en la foto.

### 4.7 Vista previa del reporte (móvil)
- **M7.1 Acceso** vía tab o botón en header.
- **M7.2 Resumen**: total de pasos hechos, fotos, tiempo total.
- **M7.3 Lista de pasos** con estados (✓ hecho, ▶ actual, ○ pendiente, ⚠ saltado).
- **M7.4 Miniaturas** de fotos aceptadas.
- **M7.5 Hallazgos** en lista.
- **M7.6 Botón "Descargar PDF"** cuando sesión finalizada.

### 4.8 Cierre de sesión
- **M8.1 Al completar último paso** → confirmación visual + opción de finalizar.
- **M8.2 Pantalla de cierre** con resumen + botón "Descargar reporte PDF".
- **M8.3 Compartir PDF** vía Web Share API o download.
- **M8.4 Confirmación post-descarga** y vuelta a lista de OTs.

### 4.9 Estados y errores (mobile)
- **M9.1 Skeletons** en carga.
- **M9.2 Error de red** → banner + retry.
- **M9.3 ElevenLabs caído** → banner + fallback a input texto.
- **M9.4 Token expirado** → interceptor refresca silencioso.
- **M9.5 Sesión perdida** (WS) → reconexión automática + toast.

### 4.10 PWA (instalable)
- **M10.1 Web App Manifest** con iconos, name, theme color.
- **M10.2 Service Worker** para offline + cache de assets.
- **M10.3 Install prompt** inteligente.

---

## 5. Features — Desktop (supervisor + admin RAG)

### 5.1 Autenticación
- **D1.1 Login** mismo flow que mobile.
- **D1.2 Persistencia** + auto-refresh.

### 5.2 Dashboard / Monitor
- **D2.1 Lista de sesiones activas** con:
  - Técnico, equipo, OT, paso actual, tiempo transcurrido, último evento.
  - Status indicator (live/paused/error).
- **D2.2 Actualización en vivo** vía WS (sin polling).
- **D2.3 Filtros**: por planta, por técnico, por estado.
- **D2.4 Click en sesión** → vista detalle.
- **D2.5 Acciones rápidas** desde la lista:
  - Pausar remoto
  - Forzar mensaje al técnico
  - Agregar nota interna

### 5.3 Vista detalle de sesión
- **D3.1 Header** con OT, técnico, equipo, plan vs. real, status.
- **D3.2 Layout 2 columnas**:
  - Izquierda: lista de sesiones (más estrecha, fija).
  - Derecha: panel principal (reporte + eventos).
- **D3.3 Reporte en construcción** (panel principal):
  - **Resumen ejecutivo** (auto-actualizado).
  - **Procedimiento ejecutado**: tabla de pasos con tiempo, fotos miniatura, observaciones, findings.
  - **Galería de fotos**: grid con lightbox.
  - **Hallazgos** con severidad (chip color).
  - **Mediciones** en tabla.
- **D3.4 Stream de eventos en vivo** (panel inferior o lateral):
  - Utterances del técnico (verbatim)
  - Comandos reconocidos
  - Respuestas del asistente (con citas clicables → abren página del PDF)
  - Fotos capturadas/validadas/rechazadas
- **D3.5 Acciones de supervisor**:
  - Pausar/Reanudar remoto
  - Forzar `step_advance` con `force=true` (audit log)
  - Escalar foto (resolver foto con >3 reintentos)
  - Agregar nota
  - Abrir chat de voz con el técnico (futuro)
- **D3.6 Timeline visual**: scrubber temporal con markers de eventos clave.

### 5.4 Biblioteca de manuales (RAG)
- **D4.1 Lista de manuales**: tabla con título, modelo, versión, status, chunks, fecha, autor.
- **D4.2 Upload**:
  - Drag & drop de PDF
  - Form: título, modelo de asset, reemplaza manual X (opcional)
  - Progress bar durante upload + indexación
- **D4.3 Vista previa del PDF** (visor iframe).
- **D4.4 Acciones**: reindexar, descargar, archivar, ver log de indexación.
- **D4.5 Búsqueda full-text** dentro del manual.
- **D4.6 Estado de indexación** con retry en caso de error.

### 5.5 Plantillas de procedimiento
- **D5.1 Lista de plantillas** con versión, manual asociado, # pasos.
- **D5.2 Editor** (form):
  - Nombre, versión, manual, asset (opcional), minutos estimados
  - Lista de pasos reordenables (drag & drop)
  - Cada paso: título, descripción, minutos, checkbox `critical`, checkbox `requires_photo`, input `photo_criteria`
- **D5.3 Validación inline** (indices contiguos, sin duplicados).
- **D5.4 Duplicar plantilla** como base para nueva versión.
- **D5.5 Archivar** plantilla.

### 5.6 Vista de reporte finalizado
- **D6.1 Render del reporte completo** (estructura JSON).
- **D6.2 Descarga de PDF** con hash visible.
- **D6.3 Historial de versiones** del JSON.
- **D6.4 Link a OT derivada** si se generó.

### 5.7 Assets
- **D7.1 Lista de activos** con tag, modelo, manual activo.
- **D7.2 Detalle** con OTs históricas.
- (D7.3 CRUD solo para admin, en v2).

### 5.8 Estados y errores (desktop)
- **D8.1 Toasts** para eventos importantes (foto rechazada, sesión pausada).
- **D8.2 Reconexión WS** silenciosa con indicador.
- **D8.3 Error boundaries** por panel.

---

## 6. Features compartidas

### 6.1 `@superion/api-client`
- **S1.1 Cliente fetch** con `Authorization` automático.
- **S1.2 Auto-refresh** en 401 (una sola vez, evita loops).
- **S1.3 Idempotency-Key** auto-generado en POST mutacionales.
- **S1.4 Tipos generados** desde `openapi.yaml` (openapi-typescript).
- **S1.5 Hooks react-query** (`useWorkOrders`, `useSession`, etc.) para TanStack Query.
- **S1.6 Manejo de errores** normalizado al envelope §1.8.

### 6.2 `@superion/ws-client`
- **S2.1 Conexión** con auth + `last_seq`.
- **S2.2 Reconexión** con backoff exponencial + jitter.
- **S2.3 Catch-up** automático vía REST al reconectar.
- **S2.4 Heartbeat** ping/pong.
- **S2.5 API pub/sub**: `ws.subscribe('session.{id}', handler)`, `ws.subscribe('admin:manuals', handler)`.
- **S2.6 Listener genérico** para nuevos tipos (forward-compat).

### 6.3 `@superion/ui` (design system)
- **S3.1 Tokens** (colores, spacing, typography) en modo oscuro por defecto.
- **S3.2 Componentes base** (Button, Input, Card, Modal, Toast, Skeleton).
- **S3.3 Componentes de dominio**:
  - `<Stepper>` (progreso pasos)
  - `<VoiceIndicator>` (onda animada)
  - `<PhotoCapture>` (cámara + preview)
  - `<PhotoValidationOverlay>` (validando/rechazado)
  - `<CitationChip>` (cita con link al manual)
  - `<WorkOrderCard>` (tarjeta OT)
  - `<ReportViewer>` (render del JSON)
  - `<EventStreamItem>` (item del stream en vivo)
  - `<ProcedureStepEditor>` (editor)
- **S3.4 Iconografía** (lucide-react).
- **S3.5 Accesibilidad**: focus visible, aria, navegación por teclado.

### 6.4 `@superion/domain`
- **S4.1 Tipos compartidos** (ProcedureStep, WorkOrder, SessionEvent, etc.) — espejo de schemas.
- **S4.2 Validadores** (zod) para runtime.
- **S4.3 Helpers de formato** (duración, ETA, locale).

### 6.5 `@superion/config`
- **S5.1 Env vars** con tipos y validación en build.
- **S5.2 Feature flags** (kill switch de features).

### 6.6 i18n
- **S6.1 react-i18next** configurado.
- **S6.2 Locale por defecto**: es-ES (con fallback a es).
- **S6.3 Detección** de locale del navegador.
- **S6.4 Archivos** `locales/es.json`, `locales/en.json` (vacío en v1).
- **S6.5 Formato de fechas/números** con `Intl` según locale.

### 6.7 Accesibilidad
- **S7.1 WCAG 2.1 AA** objetivo.
- **S7.2 Navegación por teclado** completa (desktop prioritario; móvil opcional).
- **S7.3 Focus management** en modales y wizard de paso.
- **S7.4 aria-live** para eventos del asistente y respuestas del RAG (sordos).
- **S7.5 Texto escalable** hasta 200 % sin romper layout.
- **S7.6 Alto contraste** disponible.
- **S7.7 Targets táctiles ≥ 48×48 dp** (uso con guantes).
- **S7.8 Voice-first** ya cubre no-videntes.

### 6.8 Telemetría cliente
- **S8.1 Eventos de UX** (sin PII): page view, action completed, error seen.
- **S8.2 Web Vitals** (LCP, FID, CLS) enviados a backend `/telemetry` o directamente a servicio.
- **S8.3 Errores JS** → Sentry.
- **S8.4 Session replay** opcional (configurable).

---

## 7. Routing

### Mobile
```
/login
/work-orders
/work-orders/:id
/sessions/:id
/sessions/:id/photo
/sessions/:id/report
```

### Desktop
```
/login
/dashboard
/sessions/:id
/manuals
/manuals/upload
/manuals/:id
/procedures
/procedures/:id
/procedures/new
/assets
/reports/:sessionId
```

Ambas SPAs: React Router v7 con lazy loading por ruta.

---

## 8. Estados de UI críticos

Definidos en `@superion/ui` y reutilizados:

- `voice.listening` (onda animada + label)
- `voice.thinking` (spinner sutil)
- `voice.speaking` (icon TTS + barra de progreso de utterance)
- `photo.capturing` (cámara activa)
- `photo.validating` (overlay con "Validando foto…")
- `photo.rejected` (overlay con feedback)
- `photo.accepted` (check animación)
- `step.critical` (badge pulsante rojo)
- `step.requires_photo` (badge pulsante amarillo)
- `ws.connecting` / `ws.reconnecting` (banner discreto)
- `ws.disconnected` (banner con CTA reconectar)

---

## 9. Variables de entorno

**Mobile (`apps/mobile/.env`)**:
```
VITE_API_BASE_URL=https://api.dev.superion.app
VITE_WS_BASE_URL=wss://api.dev.superion.app
VITE_USE_MOCK=false
VITE_SENTRY_DSN=...
VITE_DEFAULT_LOCALE=es-ES
```

**Desktop** mismas + `VITE_DEFAULT_THEME=dark`.

---

## 10. Performance

- **LCP < 2.5 s** en mobile (3G fast).
- **FID < 100 ms**.
- **CLS < 0.1**.
- **Bundle inicial mobile < 200 KB gzip** (code splitting por ruta).
- **Imágenes** vía `loading="lazy"` + AVIF/WebP.
- **WS no bloquea** UI: render optimista + reconciliación.
- **TanStack Query** con stale-while-revalidate.

---

## 11. Testing

| Tipo | Herramienta | Cobertura |
|---|---|---|
| Unit | vitest | components, hooks, utils |
| Integration | vitest + Testing Library | pages |
| E2E | Playwright | happy paths mobile + desktop |
| Visual regression | Playwright screenshots | mobile + desktop |
| a11y | axe-core / pa11y | todas las páginas |
| Mock WS | script | secuencias pre-canned |
| Mock REST | `@superion/api-client` contra mock-server | todas las pantallas |

**Objetivo:** 80 % unit, 100 % happy paths E2E, 0 violaciones a11y AA críticas.

---

## 12. DevOps

- **Monorepo pnpm** + turborepo (cache de build).
- **Vite** para ambos apps.
- **CI GitHub Actions**:
  - lint (eslint + prettier)
  - typecheck (tsc strict)
  - tests (vitest + playwright)
  - build
  - preview deploy (Vercel por PR)
- **CD**:
  - `main` → auto deploy `dev` (Vercel)
  - tag `v*` → manual approval `prod`
- **Versión del paquete `@superion/api-client`** se publica a npm interno (Verdaccio o GitHub Packages) para que ambos apps la consuman.

---

## 13. Roadmap frontend

**Fase 0 — Setup (1 sem)**
- F0.1 Monorepo pnpm + turborepo
- F0.2 Tailwind + shadcn base
- F0.3 `api-client` con tipos generados del OpenAPI inicial
- F0.4 Mock server levantado → conectar mobile y desktop

**Fase 1 — Mobile mínimo sin voz**
- F1.1 Login + lista OT
- F1.2 Vista de paso estática
- F1.3 Botones siguiente/pausar
- F1.4 Integración REST + WS básico (eventos pintados)

**Fase 2 — Desktop mínimo**
- F2.1 Login + dashboard
- F2.2 Vista detalle de sesión
- F2.3 Stream de eventos (lectura)
- F2.4 Reporte en vivo (lectura)

**Fase 3 — Voz + dudas**
- F3.1 Indicador de voz
- F3.2 Modal de duda + cita en respuesta
- F3.3 Selección OT por voz (recepción de intent)

**Fase 4 — Fotos**
- F4.1 Cámara
- F4.2 Validación feedback
- F4.3 Cola offline

**Fase 5 — RAG admin**
- F5.1 Upload manual
- F5.2 Estado de indexación
- F5.3 Editor de plantillas

**Fase 6 — Polish**
- F6.1 a11y audit
- F6.2 Visual regression
- F6.3 PWA install
- F6.4 i18n scaffolding
- F6.5 Telemetry

---

## 14. Criterios de aceptación frontend

**Mobile**
- [ ] Login → ve OTs asignadas (filtra por RLS)
- [ ] Abre OT por toque y por voz
- [ ] Ve paso actual + cronómetro + ETA dinámico
- [ ] Step crítico no se puede saltar
- [ ] Step con `requires_photo` bloquea avance hasta foto válida
- [ ] Foto rechazada muestra feedback específico de IA
- [ ] Reporte resumido se actualiza en vivo
- [ ] PDF descargable al cierre
- [ ] Funciona en iOS Safari y Chrome Android
- [ ] Funciona con guantes (targets ≥ 48 dp)
- [ ] Reconexión WS sin perder eventos
- [ ] Cola offline de fotos funciona

**Desktop**
- [ ] Login con rol supervisor
- [ ] Ve sesiones activas en tiempo real
- [ ] Click en sesión abre reporte formándose
- [ ] Ve utterances, comandos, respuestas con citas
- [ ] Puede pausar remoto
- [ ] Puede subir PDF al RAG y ve estado de indexación
- [ ] Puede crear/editar plantilla
- [ ] Ve reporte finalizado y descarga PDF con hash

**Compartido**
- [ ] 0 violaciones a11y AA críticas
- [ ] LCP < 2.5 s en mobile
- [ ] Tipos generados del OpenAPI siempre sincronizados con CI
- [ ] Funciona contra mock server sin backend real
- [ ] Errores del backend se muestran de forma clara