# BE-07 — Reports + PDF + Finalize

**Estado:** ✅
**Depende de:** BE-03, BE-04, BE-06
**Desbloquea:** BE-08
**PRD features:** F3.5, F5.1, F5.2, F5.3, F5.4, F5.5
**Stack:** backend · capas: domain + application + infrastructure + interface

## Goal

A medida que la sesión avanza, el reporte JSON se actualiza incrementalmente; al `finalize`, se genera un PDF mock (bytes deterministas con header PDF válido) con SHA256, se sube a storage, se devuelve URL firmada. El reporte tiene `version` monotónica y diff publicado por WS.

## Capas afectadas

### Domain
- `entities/maintenance_report.py` — `MaintenanceReport(id, session_id, status [draft|finalized], content_json, version, pdf_storage_path?, sha256?, generated_at, finalized_at)`
- `value_objects/report_diff.py` — `ReportDiff(summary_changed, step_index?, added_event_seq, fields_changed[])`
- `ports/services.py` — `IReportRenderer` (genera PDF)

### Application
- `use_cases/reports/build_live.py` — escucha eventos publicados, actualiza `content_json`, calcula diff, emite WS `report.updated`
- `use_cases/reports/finalize.py` — bloquea si `current_step_index != last`, genera PDF, sube a storage, calcula SHA256, marca `finalized`
- `use_cases/reports/get.py` — devuelve JSON
- `use_cases/reports/get_pdf.py` — devuelve bytes + signed URL
- `dto/report.py`

### Infrastructure
- `services/report_renderer.py` — `MockReportRenderer`: genera PDF mínimo válido (`%PDF-1.4\n...\n%%EOF`) con header + texto plano del summary; suficiente para test E2E de descarga
- `services/report_builder.py` — lógica de transformar `session_events` + `procedure_template` + `findings` + `measurements` + `photos` en JSON estructurado
- `persistence/in_memory/report_repository.py`
- `factories.py` extendidas

### Interface
- `http/routers/reports.py` — `GET /v1/sessions/{id}/report`, `GET /v1/sessions/{id}/report/pdf`, `POST /v1/sessions/{id}/finalize`
- Modificar `http/routers/sessions.py` para que `/finalize` ahora invoque `use_cases/reports/finalize.py`
- `http/exception_handlers.py` — añadir `SESSION_NOT_FINALIZED`, `REPORT_NOT_FOUND`

## Switch vía .env

```
PDF=mock|weasyprint
REPORT_BUILDER=memory|langgraph
```

## Tests que se escriben PRIMERO

### Unit
1. `tests/unit/domain/test_maintenance_report.py` — version monotónica, status transitions
2. `tests/unit/application/test_report_builder.py` — convierte eventos + fotos + findings en JSON estructurado
3. `tests/unit/application/test_build_live.py` — actualiza y calcula diff
4. `tests/unit/application/test_finalize.py` — happy path, falta último paso, ya finalizada
5. `tests/unit/infrastructure/test_mock_pdf_renderer.py` — bytes válidos, SHA256 calculado, summary presente

### Integration
6. `tests/integration/test_reports_router.py` — GET JSON, GET PDF (Content-Type, SHA256 header)
7. `tests/integration/test_live_updates.py` — post evento → GET report refleja cambio
8. `tests/integration/test_ws_report_event.py` — `report.updated` emitido con diff correcto

### E2E
9. `tests/e2e/test_report_e2e.py` — login → start → post eventos (avanzar pasos, finding, foto) → WS report.updated cada vez → finalize → GET PDF descarga bytes válidos → SHA256 header coincide

## Implementación mínima para verde

- `MockReportRenderer`:
  ```python
  def render(self, content_json: dict) -> tuple[bytes, str]:
      text = f"%PDF-1.4\n% Report OT {content_json['header']['ot_code']}\n{content_json['summary']}\n"
      # ... escribir bytes PDF mínimos válidos
      sha = hashlib.sha256(text).hexdigest()
      return text.encode(), sha
  ```
- `ReportBuilder.build(session_events, procedure, photos, findings, measurements)` → dict con shape `integration_contracts.md` §14.1.
- `build_live` suscribe al `IEventBus` para eventos relevantes (`step.completed`, `photo.accepted`, `finding.appended`, `measurement.recorded`).
- `finalize` valida: sesión existe, `current_step_index == len(steps) - 1` Y último paso está `completed`.
- SHA256 en header `X-Document-SHA256`.

## Archivos a crear/modificar

```
backend/src/domain/entities/maintenance_report.py
backend/src/domain/value_objects/report_diff.py
backend/src/domain/ports/services.py                       # MODIFY
backend/src/domain/services/report_renderer.py             # NEW (MockReportRenderer)
backend/src/application/use_cases/reports/build_live.py
backend/src/application/use_cases/reports/finalize.py
backend/src/application/use_cases/reports/get.py
backend/src/application/use_cases/reports/get_pdf.py
backend/src/application/use_cases/reports/builder.py       # helper puro
backend/src/application/dto/report.py
backend/src/infrastructure/persistence/in_memory/report_repository.py
backend/src/infrastructure/persistence/supabase/report_repository.py    # stub
backend/src/infrastructure/factories.py                                   # MODIFY
backend/src/interface/http/routers/reports.py
backend/src/interface/http/routers/sessions.py                           # MODIFY
backend/src/interface/http/exception_handlers.py                         # MODIFY
```

## E2E test scenario

```bash
# Setup sesión, avanzar varios pasos con eventos
curl -X POST .../v1/sessions/$SID/events ... # avanzar paso 1
curl -X POST .../v1/sessions/$SID/events ... # finding
# upload foto aceptada
printf 'Aok' > /tmp/p.jpg
curl -X POST .../v1/sessions/$SID/photos -F file=@/tmp/p.jpg ...

# Stream WS debe traer report.updated tras cada cambio
# asertar via WS test

# Finalize
curl -X POST .../v1/sessions/$SID/finalize -H "Authorization: Bearer $TOKEN"
# esperado: 200 {report_id, pdf_url, pdf_expires_at}

# Get PDF
curl -o /tmp/r.pdf -D /tmp/headers.txt .../v1/sessions/$SID/report/pdf -H "Authorization: Bearer $TOKEN"
# esperado: Content-Type: application/pdf, X-Document-SHA256 presente
head -c 8 /tmp/r.pdf | grep -q "%PDF-1"

# Get JSON
curl .../v1/sessions/$SID/report -H "Authorization: Bearer $TOKEN"
# esperado: status:"finalized", version:N
```

## Definition of Done

- [ ] `pytest -q` pasa 100 %
- [ ] Cumple `integration_contracts.md` §2.5 y §14
- [ ] Reporte se actualiza en vivo por cada evento relevante (step, foto, finding, measurement)
- [ ] Diff publicado por WS con shape correcto
- [ ] `finalize` rechaza si último paso no completado (409)
- [ ] PDF descargable es válido (`%PDF-` magic)
- [ ] SHA256 en header `X-Document-SHA256` coincide con el calculado sobre bytes servidos
- [ ] URL firmada TTL 15 min (mock: misma mecánica que storage in-memory)
- [ ] Stub `SupabaseReportRepository` con `NotImplementedError`

## Notas

- `MockReportRenderer` no usa imágenes reales; suficiente para validar header + summary en texto plano. WeasyPrint real llega si se requiere en BE-08.
- `version` del reporte es entero monotónico; cada `build_live` lo incrementa.