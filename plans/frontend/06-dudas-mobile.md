# FE-06 — Mobile · Dudas (consultas)

**Estado:** ⏳
**Depende de:** FE-05
**Desbloquea:** —
**PRD features:** M4.8, M5.2
**Stack:** frontend mobile · capas: application + ui

## Goal

Técnico puede abrir modal "¿Tengo una duda?", escribir (o dictar después por voz real), ver respuesta con cita al manual (clickeable → abre PDF). Historial de dudas en la sesión.

## Capas afectadas

### Domain
- `entities/assistant.ts` — `AssistantQuery`, `AssistantAnswer`, `Citation`
- `ports/IApiClient.ts` — extender con `askAssistant(sessionId, question)`

### Application
- `hooks/useAskAssistant.ts` — mutation
- `hooks/useAssistantHistory.ts` — TanStack Query con `session_events` filtrados

### Infrastructure
- `InMemoryApiClient` — `askAssistant` devuelve respuesta fija con 1-2 citations simuladas

### UI
- `components/AskAssistantModal.tsx` — modal fullscreen con input
- `components/AssistantAnswerCard.tsx` — respuesta + chips de citas
- `components/CitationChip.tsx` — chip clickeable: abre modal con vista del manual (placeholder)
- `components/AssistantHistoryList.tsx` — lista en panel lateral

## Tests que se escriben PRIMERO

### Unit
1. `packages/domain/tests/assistant.test.ts` — shape `AssistantAnswer`, `Citation`
2. `packages/api-client/tests/in_memory_assistant.test.ts` — devuelve respuesta con citations

### Integration
3. `apps/mobile/tests/integration/AskAssistantModal.test.tsx` — abrir, escribir, enviar, ver respuesta
4. `apps/mobile/tests/integration/CitationChip.test.tsx` — click abre vista del manual

### E2E
5. `apps/mobile/tests/e2e/06-dudas.spec.ts` — login → sesión → abrir modal → preguntar → ver respuesta con cita

## Implementación mínima para verde

- Modal abre con animación slide-up desde bottom.
- Input grande (≥ 56 dp), autofocus, botón enviar.
- Mientras carga: skeleton + label "Buscando en el manual…".
- Respuesta con formato:
  ```
  El torque de apriete es 85 N·m ± 5%.
  
  📄 p. 42, sección 4.3 Válvulas
  📄 p. 45, sección 4.5 Mantenimiento
  ```
- Citation chip → modal con iframe al PDF (placeholder en dev: `https://example.com/manual.pdf#page=42`).
- Historial persiste en TanStack Query cache con key `['assistant-history', sessionId]`.

## Archivos a crear/modificar

```
frontend/packages/domain/src/entities/assistant.ts
frontend/packages/domain/src/ports/IApiClient.ts            # MODIFY
frontend/packages/api-client/src/in_memory.ts               # MODIFY
frontend/apps/mobile/src/hooks/useAskAssistant.ts
frontend/apps/mobile/src/hooks/useAssistantHistory.ts
frontend/apps/mobile/src/components/AskAssistantModal.tsx
frontend/apps/mobile/src/components/AssistantAnswerCard.tsx
frontend/apps/mobile/src/components/CitationChip.tsx
frontend/apps/mobile/src/components/AssistantHistoryList.tsx
frontend/apps/mobile/src/pages/SessionPage.tsx              # MODIFY (entry point)
```

## E2E test scenario

```ts
test('ask assistant with citation', async ({ page }) => {
  await startSession(page, 'OT-1234');
  await page.getByRole('button', { name: /tengo una duda/i }).click();
  await page.fill('[name=question]', '¿cuál es el torque?');
  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(page.getByText(/torque/i)).toBeVisible();
  await expect(page.getByText(/p\. 42/)).toBeVisible();
  // history
  await page.getByRole('button', { name: 'Cerrar' }).click();
  await page.getByRole('button', { name: /ver historial/i }).click();
  await expect(page.getByText('¿cuál es el torque?')).toBeVisible();
});
```

## Definition of Done

- [ ] Modal abre y se cierra
- [ ] Pregunta enviada → respuesta con al menos 1 citation
- [ ] Citation clickeable abre vista del manual
- [ ] Historial muestra preguntas previas
- [ ] Loading + error states
- [ ] Mock funciona sin backend
- [ ] E2E Playwright pasa

## Notas

- La integración con ElevenLabs para dictar la duda llega en un plan futuro (no es crítico para demo de RAG). El botón "🎤" en el modal es placeholder por ahora.