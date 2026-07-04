# PRD — SUPERION

**Producto:** Copiloto de voz para técnicos de mantenimiento industrial
**Versión:** 1.0 (Demo Web, dos dispositivos)
**Estado:** Borrador para validación
**Stack base:** React 19 + TS · FastAPI · LangGraph · ElevenLabs Agents · OpenRouter · Supabase (Postgres + Storage + pgvector)

---

## 1. Resumen ejecutivo

SUPERION es un asistente de voz para técnicos de mantenimiento industrial que guía paso a paso la ejecución de procedimientos preventivos, responde dudas en contexto citando el manual exacto, registra voz + fotos durante toda la intervención y, al cierre, produce el reporte de mantenimiento y las órdenes de trabajo derivadas.

**Propuesta de valor:** convertir hasta el 50 % del tiempo de jornada perdido en papeleo en tiempo efectivo de trabajo, eliminando omisión de pasos críticos y eliminando la duplicación captura-en-planta → transcripción-en-oficina.

**Demo objetivo:** 100 % web, ejecutable en dos dispositivos (móvil para el técnico, desktop para el supervisor/oficina técnica) comunicados en tiempo real.

---

## 2. Contexto y problema

| Dolor actual | Impacto |
|---|---|
| Manuales impresos o en PDFs largos, búsqueda lenta | ~10–15 min por consulta |
| Pasos críticos omitidos por fatiga/distracción | Fallas recurrentes,安全事故 |
| Papeleo post-intervención | 30–50 % de la jornada |
| Reportes inconsistentes entre técnicos | Pérdida de trazabilidad |
| Disociación entre lo ejecutado en planta y lo reportado | Decisiones de mantenimiento basadas en datos incompletos |

SUPERION ataca los cuatro primeros de manera estructural; el quinto lo mitiga mediante captura continua de eventos.

---

## 3. Objetivos (SMART)

| # | Objetivo | Métrica | Plazo |
|---|---|---|---|
| O1 | Reducir tiempo administrativo del técnico | ≥ 50 % menos minutos en papeleo por intervención | Demo |
| O2 | Eliminar omisión de pasos críticos | 0 % pasos críticos omitidos | Demo |
| O3 | Hacer respondibles las dudas técnicas en < 3 s | p95 latencia voz→respuesta < 3 s | Demo |
| O4 | Generar reporte con ≥ 95 % completitud sin edición manual | % de campos auto-completados | Demo |
| O5 | Mantener al supervisor sincronizado en tiempo real | Retardo evento→UI < 2 s | Demo |

---

## 4. KPIs de éxito

**Adopción y uso**
- % de intervenciones iniciadas por voz vs. touch
- Frecuencia de uso (intervenciones / técnico / semana)
- Tasa de abandono por sesión

**Calidad**
- % de reportes finalizados sin edición manual
- % de pasos críticos ejecutados correctamente
- % de fotos aceptadas en el primer intento
- Tasa de citas correctas del RAG (eval set)

**Performance**
- Latencia voz→respuesta (p50, p95)
- Disponibilidad mensual
- Tiempo medio entre caída y recuperación (MTTR)

**Satisfacción**
- NPS técnico (post-intervención, 1–5)
- Tasa de reincidencia de uso

---

## 5. Personas

**P1 — Técnico de mantenimiento (usuario primario, móvil)**
- 25–55 años, planta industrial, manos a veces ocupadas o con guantes
- Habla español (regionalismos varios), nivel técnico medio-alto
- Necesita: manos libres, inmediatez, no fallar

**P2 — Supervisor / Jefe de mantenimiento (usuario secundario, desktop)**
- Monitorea 5–30 técnicos en simultáneo
- Necesita: visibilidad de avance, evidencia, alertas

**P3 — Ingeniero de confiabilidad / Admin RAG (usuario terciario, desktop)**
- Gestiona la biblioteca de manuales y plantillas de procedimiento
- Necesita: subir/actualizar PDFs con control de versión

---

## 6. Alcance

### 6.1 In-scope (demo)

- Web app móvil + desktop, comunicadas por WebSocket
- Autenticación básica
- Mantenimiento **preventivo** guiado
- Estado del procedimiento controlado por **LangGraph**
- Canal de voz **ElevenLabs** (ASR Scribe + TTS + barge-in + turn detection)
- **RAG** sobre manuales PDF subidos vía desktop, con citas visibles
- Captura y validación de **fotos de evidencia** mediante VLM
- **Reporte de mantenimiento** formándose en tiempo real (vista móvil resumida + vista desktop completa)
- Generación de **PDF** final con fotos embebidas
- Idioma: español (es-ES, es-MX, es-CO)

### 6.2 Out-of-scope (v1)

- Apps nativas iOS/Android
- Mantenimiento correctivo autónomo (solo se permite documentar hallazgos)
- Integración bidireccional con CMMS/EAM externos (solo exportable vía PDF)
- Multi-tenant multi-planta con jerarquías complejas (se soporta una planta en demo)
- Reconocimiento óptico sobre paneles/medidores (OCR) — se maneja vía narración del técnico
- RBAC avanzado (roles planos)
- Firmas digitales (placeholder en PDF)
- Multi-idioma (preparado i18n, no habilitado)

---

## 7. Requerimientos funcionales

### 7.1 Módulo móvil (técnico)

**7.1.1 Autenticación**
- Email + password (Supabase Auth) o PIN de planta (modo kiosko)
- Sesión persistente 8 h

**7.1.2 Lista de órdenes de trabajo**
- Filtros: estado (`pendiente`, `en curso`, `pausada`), prioridad, equipo, fecha planificada
- Búsqueda por código de OT o tag de equipo
- Estado vacío instructivo

**7.1.3 Selección de OT**
- Toque directo en tarjeta
- **Por voz**: "abrir orden 1234" / "abrir mantenimiento del compresor 3"
- Confirmación visual antes de iniciar

**7.1.4 Inicio de mantenimiento preventivo**
- Botón "Iniciar mantenimiento"
- Anuncio por voz: equipo, procedimiento, N pasos, ETA
- Cambio de estado OT → `in_progress`
- Creación de `maintenance_session` + thread LangGraph

**7.1.5 Vista de paso activo**
- Número de paso actual / total
- Título y descripción del paso (jerárquico si lo permite la plantilla)
- Lista compacta de pasos restantes (scroll)
- **Cronómetro del paso** y **cronómetro total**
- **ETA** dinámico (basado en ritmo actual vs. media planificada)
- Indicador grande de "Escuchando…" cuando el ASR está activo
- Botón grande (≥ 56 dp) "Siguiente paso" (deshabilitado si quedan sub-requisitos)
- Botón "Pausar" / "Finalizar"

**7.1.6 Consulta al asistente durante un paso**
- El técnico puede preguntar en cualquier momento (voz o texto)
- La IA clasifica: si es duda técnica → RAG; si es comando (saltar, repetir, pausar) → acción
- Respuesta con cita visible: "Según manual p. 42, sección 4.3: «…»"
- La consulta no avanza ni retrocede el paso

**7.1.7 Captura de evidencia fotográfica**
- Disparador contextual cuando el paso lo requiere
- Cámara del dispositivo (input `capture="environment"`)
- **Validación visual** previa a aceptar: si la foto no cumple criterio, se instruye re-toma específica ("acércate más", "no se ve el sensor", etc.)
- Hasta 3 re-tomas antes de requerir intervención del supervisor
- Foto aceptada se sube a Supabase Storage y se asocia al paso

**7.1.8 Narración continua**
- ASR siempre activo mientras la sesión esté `in_progress`
- Cada utterance se convierte en `session_event` (timestamp, texto, paso actual)
- Permite al técnico narrar lo que ve/hace sin estructura rígida

**7.1.9 Vista previa del reporte (móvil)**
- Panel lateral o pantalla accesible con el reporte en construcción
- Resumen: pasos hechos, fotos, observaciones
- Vista simplificada (la completa está en desktop)

**7.1.10 Cierre**
- Confirmación por voz: "¿Doy por finalizado el mantenimiento?"
- Generación de PDF + almacenamiento en Storage
- Botón "Descargar" / "Compartir"
- Estado OT → `completed`

### 7.2 Módulo desktop (supervisor / admin RAG)

**7.2.1 Biblioteca de manuales (RAG)**
- Listado de manuales con: nombre, equipo asociado, versión, fecha, autor, estado (activo/archivado)
- Subir PDF (drag & drop)
- Reemplazar versión (incremento de versión, archivado automático de la anterior)
- Vista previa del PDF
- Acciones: re-indexar, descargar, archivar
- Estado de indexación (pendiente, en proceso, indexado, error)

**7.2.2 Plantillas de procedimiento**
- Listado y editor básico (JSON o formulario)
- Cada plantilla referencia un manual
- Marcar pasos como `critical` y/o `requires_photo`

**7.2.3 Monitoreo de OTs en curso**
- Lista de sesiones activas con: técnico, equipo, OT, paso actual, tiempo transcurrido, último evento
- Auto-refresco vía WebSocket
- Click → vista detalle

**7.2.4 Vista detalle de OT en curso**
- Encabezado: OT, técnico, equipo, tiempos, estado
- **Reporte formándose en vivo** (panel principal):
  - Resumen ejecutivo (auto-generado incrementalmente)
  - Procedimiento ejecutado: tabla de pasos con tiempo por paso, fotos miniatura, observaciones
  - Hallazgos (extraídos de narración / discrepancias)
  - Galería de fotos
- Stream de eventos: transcripción reciente, comandos del técnico, respuestas del asistente
- Botones administrativos: pausar remoto, escalar a supervisor, agregar nota

**7.2.5 (futuro) Edición de reporte en curso**
- En demo no se requiere; el reporte es de solo lectura durante la sesión y se edita post-cierre si hace falta

### 7.3 Backend / API

**7.3.1 REST (FastAPI)**
- `POST /auth/login`
- `GET /work-orders?assignee=&status=`
- `GET /work-orders/{id}`
- `POST /sessions` (iniciar)
- `POST /sessions/{id}/events` (evento desde frontend: comando explícito, foto aceptada, etc.)
- `GET /sessions/{id}` (estado)
- `GET /reports/{session_id}`
- `GET /reports/{session_id}/pdf`
- `GET /manuals`, `POST /manuals`, `DELETE /manuals/{id}`
- `GET /procedures`, `POST /procedures`

**7.3.2 WebSocket `/ws/sessions/{id}`**
- Eventos push al desktop
- Reconexión con último seq para catch-up

**7.3.3 Capa de orquestación**
- LangGraph como dueño del estado de la sesión
- Backend FastAPI proxy hacia LangGraph (no se expone directamente)

### 7.4 Capa IA (LangGraph)

**7.4.1 State machine del procedimiento**
- Estados: `idle`, `awaiting_input`, `in_step`, `awaiting_photo`, `validating_photo`, `photo_retry`, `awaiting_advance`, `finalizing`, `closed`
- Nodos: `init_session`, `route_intent`, `run_step`, `answer_query`, `request_photo`, `validate_photo`, `advance_step`, `record_event`, `finalize_report`, `close_session`
- Guardas: no se puede salir de un paso si `requires_photo` y falta foto válida; no se puede saltar un paso `critical`

**7.4.2 Tools (expuestas por LangGraph)**
- `get_current_step`
- `query_manual(question, asset_model_id) → citations[]`
- `validate_evidence_photo(image_ref, criteria) → {ok, feedback}`
- `mark_step_done(step_id)`
- `add_session_event(event)`
- `request_user_confirmation(prompt)`

**7.4.3 Memoria**
- Checkpointer Postgres (tabla `langgraph_checkpoints` en Supabase)
- Thread por `session_id`
- Buffer de últimos N turnos verbatim + resumen comprimido de turnos anteriores

**7.4.4 Generación de reporte**
- Estructura JSON incremental mantenida en estado LangGraph
- Resumen ejecutivo regenerado cuando cambia un evento "pesado" (foto, hallazgo, cierre de paso)
- El JSON se persiste en `maintenance_report.content`

### 7.5 Capa de voz (ElevenLabs Agents)

- **ASR**: Scribe
- **TTS**: voz configurable por planta, velocidad ajustada
- **Detección de turnos**: nativa de ElevenLabs
- **Barge-in**: nativo (pausa TTS, nuevo turno)
- **Tool calling**: tools que invocan endpoints FastAPI → LangGraph
- **Despliegue**: configuración vía código Python (SDK de ElevenLabs)
- **Privacidad**: audio en tránsito, retenido según política; transcripciones retenidas para auditoría

---

## 8. Requerimientos no funcionales

### 8.1 Performance
- Latencia voz → primera respuesta audible < 2.5 s (p95)
- Render de pantalla móvil < 100 ms (p95) en hardware medio
- WebSocket: primer evento al desktop < 2 s tras utterance
- Generación PDF < 8 s (p95)

### 8.2 Disponibilidad
- SLA demo: 99.5 %
- Degradación graceful: si ElevenLabs cae, fallback a modo texto en móvil
- Si WebSocket cae, móvil sigue funcionando y sincroniza al reconectar

### 8.3 Seguridad
- TLS 1.3 en todo el tráfico
- JWT (RS256) con refresh tokens (Supabase Auth)
- **RLS** en Postgres: técnico solo ve sus OTs; supervisor ve OTs de su planta
- Cifrado at-rest en Storage
- Auditoría: tabla `audit_log` para acciones críticas (login, cierre de sesión, edición de manual)
- Audio: retención configurable (sugerido 30 días), purga automática
- No se loguean secretos, API keys ni el contenido del audio completo

### 8.4 Escalabilidad
- App servers stateless
- LangGraph Cloud o self-hosted con escalado horizontal
- Supabase escala según plan; pgvector con HNSW
- ElevenLabs escala cloud
- OpenRouter escala cloud

### 8.5 Confiabilidad
- Idempotencia en eventos por `event_id` (UUID cliente)
- Reintentos exponenciales cliente + servidor
- Cola offline en móvil para fotos si no hay red (localStorage / IndexedDB)
- Reconexión WebSocket con backoff + catch-up por seq

### 8.6 Accesibilidad
- WCAG 2.1 AA
- Botones ≥ 48 dp (uso con guantes)
- Modo oscuro por defecto (plantas)
- Alto contraste disponible
- Voice-first ya cubre no-videntes; transcript visible cubre sordos
- Texto escalable sin romper layout

### 8.7 Compatibilidad
- Móvil: Safari iOS 16+, Chrome Android (últimas 2 versiones)
- Desktop: Chrome, Edge, Safari (últimas 2 versiones)
- React 19, TypeScript estricto

### 8.8 Internacionalización
- Preparar i18n (Lingui o react-i18next)
- v1: español únicamente
- Formato de fechas/números según locale detectado

### 8.9 Observabilidad
- Logs estructurados (JSON) con `correlation_id` por sesión
- Tracing distribuido (OpenTelemetry) entre FastAPI → LangGraph → OpenRouter → Supabase
- Métricas: latencia voz, latencia RAG, fotos rechazadas, sesiones concurrentes
- Dashboards (Grafana o servicio gestionado)
- Alertas: p95 latencia voz > 4 s, tasa error RAG > 5 %

---

## 9. Arquitectura técnica

### 9.1 Vista de componentes

```
┌────────────────────┐     ┌────────────────────┐
│  Mobile (PWA/Web)  │     │  Desktop (PWA/Web) │
│  React 19 + TS     │     │  React 19 + TS     │
└────────┬───────────┘     └──────────┬─────────┘
         │ HTTPS / WSS                │ HTTPS / WSS
         ▼                            ▼
┌────────────────────────────────────────────────┐
│             FastAPI (REST + WebSocket)         │
│  - Auth proxy                                   │
│  - Session/Event services                       │
│  - Manual/Procedure services                    │
│  - Report generator (PDF)                       │
└────────┬──────────────────────┬─────────────────┘
         │                      │
         ▼                      ▼
┌──────────────────┐    ┌───────────────────────┐
│   LangGraph      │    │     Supabase          │
│   (state + RAG + │◄──►│ Postgres + pgvector   │
│    report gen)   │    │ Storage (PDFs, fotos) │
└────────┬─────────┘    │ Auth                  │
         │              └───────────────────────┘
         ▼
┌──────────────────┐    ┌───────────────────────┐
│   OpenRouter     │    │   ElevenLabs Agents   │
│   (LLM + embed)  │    │   (ASR/TTS/tools)     │
└──────────────────┘    └───────────────────────┘
```

### 9.2 Flujo de evento (voz)

```
Técnico habla
 → ElevenLabs ASR (Scribe) → texto + audio
 → ElevenLabs Agent (intent + tool call)
 → Tool call → endpoint FastAPI
 → FastAPI → LangGraph (thread session_id)
 → LangGraph node: classify → {query|command|photo_request}
   - query → RAG retrieval (pgvector) → OpenRouter (LLM con citations) → respuesta
   - command → ejecutar (mark_step_done, pause, etc.)
   - photo_request → emitir evento WS al móvil →拍照 → upload → validate (VLM)
 → LangGraph produce respuesta textual
 → FastAPI devuelve a ElevenLabs
 → ElevenLabs TTS → audio al técnico
 → Evento paralelo push por WS a desktop
```

### 9.3 Persistencia

- **Postgres (Supabase)**: tablas operativas + RLS + pgvector
- **Storage (Supabase)**: manuales PDF (privados), fotos (privadas), PDFs de reporte (firmados URL temporales)
- **LangGraph checkpointer**: tabla Postgres para resume de threads

---

## 10. Modelo de datos (entidades)

```
plant
  id, name, location, created_at

user
  id (FK auth.users), email, full_name, role (technician|supervisor|rag_admin), plant_id

asset
  id, plant_id, tag, name, model, manufacturer, criticality, current_manual_id, created_at

manual
  id, asset_model, version, status (active|archived),
  storage_path, uploaded_by, uploaded_at, chunk_count, index_status

manual_chunk
  id, manual_id, page, section_path, content text,
  embedding vector(1536), token_count

procedure_template
  id, name, version, manual_id, asset_id?, steps jsonb,
  critical_step_ids int[], photo_required_step_ids int[], estimated_minutes

work_order
  id, code, asset_id, type (preventive|corrective), priority (low|med|high),
  status (pending|in_progress|paused|completed|cancelled),
  assigned_to, planned_start, planned_end,
  actual_start, actual_end, procedure_template_id, parent_wo_id?, created_at

maintenance_session
  id, work_order_id, technician_id, status (active|paused|finalized|aborted),
  started_at, ended_at, current_step_index, langgraph_thread_id,
  metrics jsonb (total_time, step_times, voice_seconds, photos_count)

session_event
  id (UUID cliente), session_id, type
    (utterance | command | photo | step_enter | step_exit |
     assistant_query | assistant_answer | measurement | finding |
     pause | resume | finalize),
  payload jsonb, step_index, created_at,
  audio_ref?, transcript?

evidence_photo
  id, session_id, step_index, storage_path, captured_at,
  validation_status (pending|accepted|rejected),
  validation_feedback text, model_version, retries int

maintenance_report
  id, session_id, status (draft|finalized), pdf_storage_path?,
  content jsonb, generated_at, finalized_at, sha256

report_derived_work_order (futuro opcional)
  id, parent_session_id, derived_work_order_id, reason text

audit_log
  id, actor_user_id, action, target_type, target_id, payload jsonb, created_at
```

`session_event.payload` se modela como JSONB con un schema validado por tipo para evitar caos.

---

## 11. Diseño de conversación (voice UX)

### 11.1 Arranque

```
T: "abrir orden 1234"   (o tap)
Sistema: "Orden 1234. Mantenimiento preventivo del compresor C-3.
           Procedimiento de 12 pasos, tiempo estimado 45 minutos.
           ¿Comenzamos?"
T: "sí"
Sistema: "Paso 1 de 12. Aislar el equipo cerrando la válvula V-12
           y bloqueando con candado. Cuando termines, di 'siguiente'."
```

### 11.2 Loop de paso

- Clasificación de utterance → {comando | duda | narración | medición | hallazgo}
- Duda → RAG con respuesta citada
- Narración → se registra como `finding` o `observation`
- "Siguiente" → check de pre-requisitos (foto si requerida) → advance
- Si pre-req falta → "Antes de avanzar, necesito la foto del [X]."

### 11.3 Saltos

- Pasos `critical` no se pueden saltar (bloqueo explícito por voz: "No puedo saltarme este paso por seguridad.")
- Pasos no críticos se pueden saltar con "saltar paso" + motivo (queda en reporte)

### 11.4 Barge-in

- Técnico interrumpe → TTS se cancela → nuevo turno se procesa

### 11.5 Ambigüedad

- ASR confianza baja → "¿Puedes repetir?"
- Comando desconocido → "No entendí. ¿Quieres avanzar, repetir el paso, o pausar?"

### 11.6 Cierre

```
Sistema: "Último paso completado. Voy a generar el reporte de mantenimiento.
           ¿Confirmas que damos por finalizada la intervención?"
T: "sí"
Sistema: "Reporte generado. Ya puedes descargarlo desde esta pantalla."
```

---

## 12. Estrategia RAG

### 12.1 Ingesta
- PDF → extracción con **PyMuPDF** (texto + imágenes)
- Limpieza: eliminar headers/footers repetidos, normalizar
- Chunking jerárquico:
  - Nivel 1: sección (H1/H2)
  - Nivel 2: subsección (H3)
  - Nivel 3: párrafo / lista, ventana 512 tokens, overlap 64
- Embeddings: modelo vía OpenRouter (p.ej. `text-embedding-3-large` o equivalente open)
- Persistencia en `manual_chunk` con metadata (asset_model, manual_version, page, section_path)

### 12.2 Índices
- pgvector: índice **HNSW** por `manual_id` (cosine)
- Postgres FTS: índice GIN sobre `content` para búsqueda léxica

### 12.3 Retrieval
- Híbrido: BM25 (FTS) + vector → fusión por RRF
- Reranking con cross-encoder (vía OpenRouter) sobre top-k=8 → top-n=3 al LLM
- Filtro obligatorio por `asset_model` y `manual_version` activa

### 12.4 Generación con cita
- Prompt obliga formato: `[{n}] "cita literal" — p. X, sección Y`
- UI muestra: respuesta + chips clicables que abren página del PDF
- Si ninguna cita cumple umbral → abstención: "No encuentro esa información en el manual. ¿Quieres que lo documente como consulta sin respuesta?"

### 12.5 Versionado
- Manual v1 archivado al subir v2
- Búsqueda solo en versión activa del activo
- Permite rollback rápido

---

## 13. Validación de fotos

- Disparador: `procedure_template.photo_required_step_ids` o request explícito del LLM
- Criterio: texto libre generado por LangGraph ("foto del sensor de temperatura con lectura visible")
- Validación: VLM vía OpenRouter (modelo multimodal) recibe:
  - Imagen
  - Criterio
  - Contexto del paso
- Output: `{ok: bool, feedback: string, confidence: float}`
- Si `ok=false`: feedback específico → re-toma (máx. 3, luego escala a supervisor)
- Si `ok=true`: foto asociada al paso + caption auto-generada para el reporte

---

## 14. Pipeline de generación de reporte

### 14.1 Estructura del JSON

```
{
  header: { ot_code, technician, asset, plant, started_at, ended_at, duration_min },
  summary: "..." ,             // auto, regenerado en hitos
  procedure: [
    { index, title, started_at, ended_at, duration_min,
      status (done|skipped), skip_reason?,
      photos: [{path, caption}],
      observations: ["..."],
      findings: [{ text, severity }]
    }
  ],
  findings: [...],             // agregados cross-step
  measurements: [...],
  photos_gallery: [...],
  next_actions: [ "..." ]      // opcional, sugeridas por LLM
}
```

### 14.2 Actualización en vivo
- Cada `session_event` relevante dispara mutación del JSON
- Resumen ejecutivo se regenera en: cierre de paso, foto aceptada, hallazgo severo
- JSON se persiste tras cada cambio (`maintenance_report.content`)
- WebSocket push al desktop con diff

### 14.3 PDF final
- Plantilla Jinja2 → HTML → **WeasyPrint** (soporta imágenes, CSS print)
- Página 1: header + resumen + tabla de pasos
- Páginas siguientes: fotos a página completa con caption
- Footer con SHA256 del documento para integridad
- Subido a Storage; URL temporal (15 min) para descarga

---

## 15. Sincronización en tiempo real (móvil ↔ desktop)

### 15.1 Canal
- WebSocket FastAPI: `/ws/sessions/{session_id}`
- Sala por sesión; ambos clientes pueden unirse

### 15.2 Eventos (push)
```
session.started
session.paused
session.resumed
session.closed
step.entered
step.completed
step.skipped
event.appended          (utterance, observación, medición, hallazgo)
photo.captured
photo.validated
photo.rejected
assistant.answered
report.updated
derived_work_order.suggested
```

### 15.3 Resiliencia
- Cliente mantiene `last_seq`
- Al reconectar, GET `/sessions/{id}/events?since_seq=X`
- UI optimista: estado local se reconcilia con servidor
- Reintento exponencial con jitter

---

## 16. Seguridad y compliance

| Aspecto | Decisión |
|---|---|
| Autenticación | Supabase Auth (email/password) + JWT |
| Autorización | RLS en todas las tablas operativas |
| Cifrado tránsito | TLS 1.3 |
| Cifrado reposo | Storage cifrado por Supabase; columna audio opcional |
| Retención audio | 30 días (configurable), purga con job programado |
| Retención eventos texto | Indefinida para auditoría |
| Retención fotos | Indefinida |
| Derecho al olvido | Endpoint admin purga `session_event`, fotos, reportes asociados |
| Audit log | Acciones de admin (login, edición de manual, cierre forzado) |
| Logs | Sin secretos, sin audio completo, con `correlation_id` |

---

## 17. Manejo de errores

| Escenario | Respuesta |
|---|---|
| Caída de ElevenLabs | Banner en móvil + fallback a entrada texto + cola de utterances |
| ASR confianza baja | "Disculpa, ¿puedes repetir?" |
| Comando desconocido | Ofrecer 3 opciones: avanzar / repetir / pausar |
| RAG sin resultados | Abstención + ofrecer documentar consulta |
| RAG cita poco fiable | Mostrar aviso + bajar confidence en UI |
| Foto rechazada | Mensaje específico + re-toma (máx 3) |
| Cámara no disponible | Banner + permitir continuar con narración explícita |
| Upload foto falla | Cola offline + reintento + sync al reconectar |
| WebSocket caído | UI optimista + reconexión con backoff + catch-up |
| LangGraph crash | Recovery desde último checkpoint (thread persistido) |
| Backend 5xx | Mensaje claro + mantener sesión, reintentar |

---

## 18. UX / UI — directrices

### 18.1 Principios
- **Glanceable**: el técnico debe entender el estado en 2 s
- **Voice-first**, pero con botones siempre disponibles
- **Manos libres** prioritario (uso con guantes)
- **Modo oscuro** por defecto (entornos de planta)
- **Español** único en v1; tipografía legible a 2 m de distancia

### 18.2 Pantallas clave (wireframes textuales)

**Móvil — Lista OT**
```
┌──────────────────────────────┐
│ SUPERION   ☰  🔔  Avatar    │
├──────────────────────────────┤
│ Órdenes de trabajo   [filtros]│
│ ┌──────────────────────────┐ │
│ │ OT-1234  Compresor C-3   │ │
│ │ Preventivo · Alta        │ │
│ │ Plan: hoy 14:00          │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ OT-1235  Bomba P-2       │ │
│ │ Preventivo · Media        │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ 🎤  "Abrir orden..."         │
└──────────────────────────────┘
```

**Móvil — Paso activo**
```
┌──────────────────────────────┐
│ ◀ OT-1234    [Pausar]  ⏱ 12:34│
├──────────────────────────────┤
│  Paso 4 de 12         ETA 18m │
│  ●●●●○○○○○○○○                │
│                              │
│  AISLAR EL EQUIPO            │
│  Cerrar válvula V-12 y       │
│  bloquear con candado LOTO.  │
│                              │
│  ⚠ Requiere foto del candado │
│                              │
│  ───────────────             │
│ 💬 "Tengo una duda..."       │
│ 🎤 Escuchando...             │
└──────────────────────────────┘
```

**Desktop — OT en curso (panel reporte)**
```
┌────────────────────────────────────────────────────────┐
│ SUPERION  /  OT-1234  Compresor C-3  · Juan P.  · 12:34│
├──────────────────┬─────────────────────────────────────┤
│ Sesiones activas │ REPORTE EN CONSTRUCCIÓN             │
│ ● OT-1234 (aquí)│ ┌─────────────────────────────────┐ │
│ ○ OT-1230       │ │ Resumen ejecutivo               │ │
│ ○ OT-1228       │ │ "Mantenimiento en curso, paso..." │ │
│                  │ └─────────────────────────────────┘ │
│                  │ Procedimiento                       │
│                  │  ✓ 1. Preparar área                 │
│                  │  ✓ 2. EPP                           │
│                  │  ✓ 3. Aislar energía                │
│                  │  ▶ 4. Cerrar V-12                   │
│                  │     [foto] [observación]            │
│                  │  ○ 5. ...                           │
│                  ├─────────────────────────────────────┤ │
│                  │ Eventos en vivo                     │ │
│                  │ 12:34 "voy a cerrar la válvula"     │ │
│                  │ 12:35 "ya está cerrada"             │ │
│                  │ 12:36 [foto aceptada]               │ │
└──────────────────┴─────────────────────────────────────┘
```

### 18.3 Estados visuales
- Voz escuchando: onda animada + label "Escuchando…"
- Pensando: spinner sutil + "Procesando…"
- Validando foto: overlay con mensaje de IA
- Paso hecho: check verde persistente
- Foto requerida: badge pulsante

---

## 19. Estrategia de testing

| Nivel | Alcance | Herramientas |
|---|---|---|
| Unit | State machine LangGraph, retrieval, validación fotos | pytest, vitest |
| Integración | ElevenLabs ↔ FastAPI ↔ LangGraph (con mocks) | pytest + WireMock |
| E2E | Flujo técnico completo | Playwright |
| Voz | Dataset de utterances (acentos, ruido) + barge-in | corpus propio + ElevenLabs eval |
| RAG | Eval set de Q&A con citas esperadas | RAGAS o propio |
| Performance | Carga N sesiones concurrentes, latencia p95 | k6 / Locust |
| UAT | Sesiones con técnicos reales (planta piloto) | guion + observación |

**Criterios de paso a demo:**
- 0 fallos E2E en happy path
- p95 voz < 3 s en staging
- ≥ 90 % accuracy del RAG sobre eval set (≥ 30 Q&A)
- ≥ 85 % de fotos aceptadas en primer intento en set de validación

---

## 20. Despliegue y DevOps

### 20.1 Ambientes
- `dev` (rama main, auto-deploy)
- `staging` (rama release/*, smoke tests)
- `prod` (tag, manual approval)

### 20.2 Infra
- **Frontend**: Vercel (o Cloudflare Pages)
- **Backend**: contenedor en Fly.io / Railway / Render
- **LangGraph**: LangGraph Cloud (gestionado) o self-host en contenedor
- **ElevenLabs / OpenRouter / Supabase**: gestionados

### 20.3 CI/CD
- GitHub Actions: lint (eslint, ruff), typecheck (tsc, mypy), tests, build, preview
- Migraciones Supabase versionadas (supabase/migrations)

### 20.4 Observabilidad
- **Sentry**: errores frontend + backend
- **OpenTelemetry**: traces con `correlation_id` por sesión
- **Métricas**: Prometheus + Grafana (o servicio gestionado)
- **Cost guardrails**: alerta si gasto OpenRouter > X USD/día

---

## 21. Roadmap por fases

**Fase 0 — Spike (1–2 sem)**
- Hello world ElevenLabs + LangGraph + Supabase
- Auth básica
- Decisión de despliegue LangGraph

**Fase 1 — Vertical mínimo sin voz (móvil)**
- Login + lista OT + selección + vista de paso estática
- LangGraph state machine mínima (avanzar/pausar)
- Persistencia de sesión

**Fase 2 — Voz**
- ElevenLabs Agents integrado con tools a FastAPI/LangGraph
- Selección de OT por voz
- Dudas técnicas (sin RAG aún, respuestas hardcoded)

**Fase 3 — RAG**
- Upload PDF desktop → chunking → embeddings
- Retrieval + citations
- Sustituir respuestas hardcoded

**Fase 4 — Fotos**
- Captura + validación VLM
- Re-toma inteligente

**Fase 5 — Reporte vivo + PDF**
- Generación incremental
- WebSocket a desktop
- PDF final

**Fase 6 — Pulido**
- Tests, performance, observabilidad
- Seguridad (RLS, audit)
- Documentación y demo guion

---

## 22. Riesgos y mitigaciones

| # | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | Latencia de voz alta | M | A | Streaming, ElevenLabs low-latency, fallback texto |
| R2 | RAG alucina o cita incorrecta | M | C | Citations obligatorias con umbral, abstención, eval set continuo |
| R3 | Técnicos no adoptan voz | M | A | Onboarding, dual mode (voz + botones), métricas de adopción |
| R4 | Foto no validable consistentemente | A | M | Instrucciones específicas, criterios explícitos por paso, escalamiento |
| R5 | Sync inconsistente | M | M | Idempotencia por `event_id`, seq numbers, catch-up, pruebas de red |
| R6 | Caída ElevenLabs | B | A | Fallback texto, retry, monitoreo |
| R7 | Costos OpenRouter | M | M | Cache de embeddings, control de tokens, alertas de gasto |
| R8 | Privacidad de audio | B | A | Retención corta, cifrado, RLS, opt-out documentado |
| R9 | LangGraph complejo de operar | M | M | LangGraph Cloud o self-host con runbooks |
| R10 | Calidad del PDF inconsistente | M | M | Plantilla Jinja2 con tests de snapshot |

---

## 23. Supuestos y preguntas abiertas

**Supuestos adoptados**
- Un único tenant (una planta) en la demo
- Autenticación propia (sin SSO corporativo en v1)
- Audio retenido 30 días
- VLM vía OpenRouter para validación de fotos
- Idioma único: español

**Preguntas abiertas (a confirmar antes de fase 1)**
1. ¿La plantilla de procedimiento se crea en código (jsonb) o viene de un sistema externo?
2. ¿Hay API CMMS a la que enviar OTs derivadas, o solo PDF?
3. ¿Cuántos técnicos concurrentes se esperan en demo?
4. ¿Necesidad de OCR sobre paneles/medidores?
5. ¿Firma del reporte: ignorada en v1 o placeholder con timestamp + hash?
6. ¿El supervisor puede editar el reporte en vivo o solo verlo?
7. ¿Políticas RLS por planta o globales?
8. ¿Modelo de embeddings preferido (open vs proprietary)?

---

## 24. Glosario

- **OT**: Orden de Trabajo
- **RAG**: Retrieval-Augmented Generation
- **ASR**: Automatic Speech Recognition
- **TTS**: Text-to-Speech
- **VLM**: Vision-Language Model
- **HNSW**: Hierarchical Navigable Small World (índice ANN)
- **pgvector**: extensión Postgres para búsqueda vectorial
- **RRF**: Reciprocal Rank Fusion
- **Barge-in**: interrupción del TTS por voz del usuario
- **LOTO**: Lockout/Tagout (procedimiento de seguridad)
- **CMMS/EAM**: Computerized Maintenance Management System / Enterprise Asset Management
- **WCAG**: Web Content Accessibility Guidelines
- **RLS**: Row-Level Security (Postgres)

---

## 25. Criterios de aceptación (demo)

**Funcionales**
- [ ] Técnico se autentica y ve solo sus OTs
- [ ] Puede abrir una OT por toque y por voz
- [ ] Cronómetro del paso y total corren en vivo
- [ ] ETA se actualiza dinámicamente
- [ ] Un paso `critical` no se puede saltar por ningún medio
- [ ] Un paso con `requires_photo` bloquea avance hasta foto válida
- [ ] Una duda se responde con cita visible (chunk + página) al manual correcto
- [ ] La foto rechazada ofrece instrucción específica de re-toma
- [ ] El reporte se ve en el desktop casi en tiempo real (< 2 s de retardo)
- [ ] El PDF final se descarga con fotos embebidas y resumen correcto
- [ ] El desktop permite subir un PDF y queda indexado para检索

**No funcionales**
- [ ] p95 latencia voz → primera respuesta audible < 3 s
- [ ] 99.5 % uptime durante ventana de demo
- [ ] Funciona en iOS Safari y Chrome Android
- [ ] RLS activo y verificado (técnico A no ve OTs de técnico B)
- [ ] Logs estructurados con `correlation_id` por sesión
- [ ] Reconexión WebSocket sin pérdida de eventos

**Calidad**
- [ ] ≥ 90 % accuracy RAG sobre eval set de ≥ 30 preguntas
- [ ] ≥ 85 % de fotos aceptadas en primer intento sobre set de validación
- [ ] 0 pasos críticos omitidos en 5 corridas E2E