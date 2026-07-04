# BE-06 — ElevenLabs Webhook Mock + Tool Calls

**Estado:** ⏳
**Depende de:** BE-03, BE-05
**Desbloquea:** BE-07
**PRD features:** F10.1, F10.2, F10.3, F10.4, F11.1, F11.2, F11.3
**Stack:** backend · capas: domain + application + infrastructure + interface

## Goal

Receptor de webhook ElevenLabs con verificación de firma HMAC, handler de tool calls que ejecutan lógica de dominio (`query_manual`, `mark_step_complete`, `request_evidence_photo`, `add_finding`, etc.) y emiten eventos WS. Mock `LangGraphClient` que implementa un mini state machine (en memoria) para que el flujo de voz sea 100 % testeable sin ElevenLabs ni LangGraph reales.

## Capas afectadas

### Domain
- `entities/tool_call.py` — `ToolCall(id, name, arguments, session_id, called_at)`
- `entities/voice_command.py` — `VoiceCommand(session_id, text, intent, confidence, audio_ref?)`
- `ports/services.py` — `IIntentClassifier` (clasifica utterance → intent), `ILangGraphClient`
- `services/intent_classifier.py` — `MockIntentClassifier` (keywords: "siguiente"→advance, "saltar"→skip, "duda"/"por qué"→query, números+unidad→measurement)

### Application
- `use_cases/voice/handle_webhook.py` — orquesta: valida firma, dispatch por tipo de evento
- `use_cases/voice/execute_tool.py` — router: mapea `tool_name → use case domain`
- `use_cases/voice/classify_and_route.py` — utterance → intent → tool call o respuesta directa
- `use_cases/voice/tool_query_manual.py` — invoca BE-05 RAG
- `use_cases/voice/tool_mark_step_complete.py` — invoca BE-03 transition
- `use_cases/voice/tool_request_photo.py` — emite evento WS `photo.requested` con criterios
- `use_cases/voice/tool_add_finding.py`, `tool_add_measurement.py`
- `dto/webhook.py`, `dto/tool.py`

### Infrastructure
- `infrastructure/realtime/langgraph_client.py` — `MockLangGraphClient` con mini state machine:
  - mantiene `dict[session_id, GraphState]` (current_step, status, etc.)
  - expone métodos `invoke(tool_call) → result`
- `infrastructure/security/signature.py` — `HmacSignatureValidator` (HMAC SHA256 con `ELEVENLABS_WEBHOOK_SECRET`, ventana timestamp 5 min)
- `factories.py` extendidas

### Interface
- `http/routers/webhooks/elevenlabs.py` — `POST /v1/elevenlabs/webhooks/conversation`
- `http/routers/elevenlabs_tools.py` — `POST /v1/elevenlabs/tools/{tool_name}`
- `http/exception_handlers.py` — añadir `INVALID_SIGNATURE`, `LANGGRAPH_UNAVAILABLE`

## Switch vía .env

```
VOICE=mock|elevenlabs
INTENT_CLASSIFIER=mock|llm
LANGGRAPH=mock|langgraph
ELEVENLABS_WEBHOOK_SECRET=change-me
ELEVENLABS_SIGNATURE_WINDOW_SECONDS=300
```

## Tests que se escriben PRIMERO

### Unit
1. `tests/unit/domain/test_tool_call.py` — shape
2. `tests/unit/application/test_intent_classifier_mock.py` — keywords → intents
3. `tests/unit/application/test_execute_tool_router.py` — mapeo tool_name → use case
4. `tests/unit/application/test_handle_webhook.py` — firma inválida, evento desconocido, orden
5. `tests/unit/infrastructure/test_signature_validator.py` — HMAC OK, firma incorrecta, timestamp viejo

### Integration
6. `tests/integration/test_elevenlabs_webhook.py` — envía webhook firmado, valida respuesta
7. `tests/integration/test_tool_endpoint.py` — POST `/v1/elevenlabs/tools/query_manual` con auth OK, args validados
8. `tests/integration/test_langgraph_mock_state.py` — invoke modifica estado, eventos WS emitidos

### E2E
9. `tests/e2e/test_voice_flow_e2e.py` — login → start session → simular webhook conversation.started → utterance "siguiente" → tool_call mark_step_complete → evento WS step.completed; utterance "¿cuál es el torque?" → tool_call query_manual → evento assistant.answered con citation

## Implementación mínima para verde

- `HmacSignatureValidator`: lee header `X-ElevenLabs-Signature` (formato `t={ts},v1={sig}`), recalcula HMAC, compara con `hmac.compare_digest`.
- `MockLangGraphClient`: thread_id = session_id; estado mínimo `{current_step_index, status, last_action}`; tool calls lo modifican y devuelven dict resultado.
- `MockIntentClassifier`:
  ```python
  KEYWORDS = {
    r"\b(siguiente|avanzar|pr[oó]ximo)\b": "advance",
    r"\b(repetir|otra vez)\b": "repeat",
    r"\b(saltar)\b": "skip",
    r"\b(pausar|alto)\b": "pause",
    r"\b(cu[aá]l|qu[eé]|por qu[eé]|c[oó]mo)\b": "query",
    r"\b(\d+(\.\d+)?)\s*(psi|bar|n\.?m|kg)\b": "measurement",
  }
  ```
- Webhook handler dispatch por `event.type`:
  - `conversation.started` → crear/asociar sesión (si no existe)
  - `utterance.final` → `classify_and_route`
  - `tool.called` → log
  - `conversation.ended` → pausar sesión
- Tool endpoint `/v1/elevenlabs/tools/{name}` valida `session_id` pertenece al técnico autenticado, invoca use case, devuelve shape de respuesta.

## Archivos a crear/modificar

```
backend/src/domain/entities/tool_call.py
backend/src/domain/entities/voice_command.py
backend/src/domain/ports/services.py                       # MODIFY
backend/src/domain/services/intent_classifier.py           # NEW
backend/src/application/use_cases/voice/handle_webhook.py
backend/src/application/use_cases/voice/execute_tool.py
backend/src/application/use_cases/voice/classify_and_route.py
backend/src/application/use_cases/voice/tool_query_manual.py
backend/src/application/use_cases/voice/tool_mark_step_complete.py
backend/src/application/use_cases/voice/tool_request_photo.py
backend/src/application/use_cases/voice/tool_add_finding.py
backend/src/application/use_cases/voice/tool_add_measurement.py
backend/src/application/dto/webhook.py
backend/src/application/dto/tool.py
backend/src/infrastructure/realtime/langgraph_client.py
backend/src/infrastructure/security/signature.py
backend/src/infrastructure/factories.py                                   # MODIFY
backend/src/interface/http/routers/webhooks/elevenlabs.py
backend/src/interface/http/routers/elevenlabs_tools.py
backend/src/interface/http/exception_handlers.py                         # MODIFY
```

## E2E test scenario

```python
import hmac, hashlib, time, json, requests

SECRET = "test-secret"
TS = str(int(time.time()))
PAYLOAD = json.dumps({
  "event": "utterance.final",
  "session_id": SID,
  "text": "¿cuál es el torque de la válvula?"
})
SIG = hmac.new(SECRET.encode(), f"{TS}.{PAYLOAD}".encode(), hashlib.sha256).hexdigest()

r = requests.post(f"{API}/v1/elevenlabs/webhooks/conversation",
                  data=PAYLOAD,
                  headers={
                    "Content-Type": "application/json",
                    "X-ElevenLabs-Signature": f"t={TS},v1={SIG}",
                    "Authorization": f"Bearer {TOKEN}"
                  })
assert r.status_code == 200

# WS debe recibir assistant.answering → tool.called → assistant.answered
events = []
async for msg in ws: events.append(json.loads(msg))
types = [e["type"] for e in events]
assert "assistant.answering" in types
assert "tool.called" in types
answer = next(e for e in events if e["type"]=="assistant.answered")
assert "torque" in answer["payload"]["answer_text"].lower()
assert len(answer["payload"]["citations"]) > 0
```

## Definition of Done

- [ ] `pytest -q` pasa 100 %
- [ ] Webhook rechaza sin firma / firma inválida / timestamp viejo (> 5 min)
- [ ] Webhook procesa `conversation.started`, `utterance.final`, `tool.called`, `conversation.ended`
- [ ] Tool endpoint rechaza si `session_id` no pertenece al técnico autenticado
- [ ] `MockIntentClassifier` clasifica utterances con keywords documentadas
- [ ] `MockLangGraphClient` mantiene estado por sesión, modificable por tool calls
- [ ] Eventos WS emitidos por cada tool call con shape correcto
- [ ] `query_manual` tool invoca BE-05 RAG y devuelve citations
- [ ] `mark_step_complete` tool invoca BE-03 transition con validación de pre-req
- [ ] `request_photo` tool emite evento `photo.requested` con criterios

## Notas

- `MockLangGraphClient` **no** usa la librería `langgraph` real; es una mini-state-machine. El plan que introduzca LangGraph real es BE-08 hardening (si se hace) — y debe mantener la misma interfaz.
- El intent classifier mock por keywords es suficiente para E2E; el basado en LLM es BE-08.