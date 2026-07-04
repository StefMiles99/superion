# FE-05 — Mobile · WebSocket live updates

**Estado:** ✅
**Depende de:** FE-04
**Desbloquea:** FE-06, FE-07, FE-08
**PRD features:** M4.7, M9.5
**Stack:** frontend mobile · capas: infrastructure + application + ui

## Goal

Cliente WS conecta automáticamente al entrar a `SessionPage`, recibe eventos del backend (step changes, photo events, assistant answers) y actualiza UI sin recargar. Reconexión con catch-up. Indicador visual "Escuchando…" cuando ASR activo.

## Capas afectadas

### Infrastructure (`packages/ws-client`)
- `src/types.ts` — tipos de eventos (mirror de `integration_contracts.md` §3.3)
- `src/in_memory.ts` — extender con `connect(sessionId, token, lastSeq)`, `subscribe(eventType, handler)`, soporte para emitir eventos scripted
- `src/ws.ts` — `RealWsClient` con `WebSocket` API, reconnect exponencial, catch-up vía REST
- `src/factory.ts` — `getWsClient()`

### Application
- `hooks/useSessionStream.ts` — al montar, conecta WS, suscribe a `step.*`, `event.appended`, `photo.*`, `assistant.*`, `report.*`; reconcilia TanStack Query cache

### UI
- `components/VoiceIndicator.tsx` — onda animada + label "Escuchando…"
- `components/ConnectionBanner.tsx` — banner cuando WS desconectado/reconectando

## Tests que se escriben PRIMERO

### Unit
1. `packages/ws-client/tests/in_memory_ws.test.ts` — emit/receive, subscribe/unsubscribe
2. `packages/ws-client/tests/ws_reconnect.test.ts` — desconexión → reconexión con catch-up
3. `apps/mobile/tests/integration/useSessionStream.test.tsx` — evento dispara update de cache

### Integration
4. `apps/mobile/tests/integration/VoiceIndicator.test.tsx` — render cuando active=true

### E2E
5. `apps/mobile/tests/e2e/05-ws-live.spec.ts` — login → sesión → inyectar evento `step.entered` por mock WS → UI refleja nuevo paso sin recargar

## Implementación mínima para verde

- `InMemoryWsClient.connect()` arma un loop que emite eventos predefinidos (scripted) según modo (`happy-path`, `photo-retry`, etc.).
- `RealWsClient` con state machine: `connecting | open | reconnecting | closed`; `last_seq` persistido en `sessionStorage`; al reconectar pasa `?last_seq=X`.
- `useSessionStream` llama `queryClient.setQueryData(['session', id], ...)` al recibir cada evento.
- Indicador visual basado en `conversation.ended` events: si llega `turn.speaker_changed: agent` → mostrar "Hablando…", si llega `user` → "Escuchando…".

## Archivos a crear/modificar

```
frontend/packages/ws-client/src/types.ts
frontend/packages/ws-client/src/in_memory.ts                # MODIFY
frontend/packages/ws-client/src/ws.ts
frontend/packages/ws-client/src/factory.ts                  # MODIFY
frontend/apps/mobile/src/hooks/useSessionStream.ts
frontend/apps/mobile/src/components/VoiceIndicator.tsx
frontend/apps/mobile/src/components/ConnectionBanner.tsx
frontend/apps/mobile/src/pages/SessionPage.tsx              # MODIFY
```

## E2E test scenario

```ts
test('ws live update step', async ({ page }) => {
  await startSession(page, 'OT-1234');
  await expect(page.getByText('Paso 1 de 12')).toBeVisible();
  // simular evento desde el WS mock
  await page.evaluate(() => {
    (window as any).__mockWs.emit({
      type: 'step.entered', seq: 99, session_id: 'sess-1',
      created_at: new Date().toISOString(),
      payload: { index: 1, title: 'Aislar energía', description: 'Cerrar V-12', estimated_minutes: 10, critical: true, requires_photo: false, photo_criteria: null }
    });
  });
  await expect(page.getByText('Paso 2 de 12')).toBeVisible();
  await expect(page.getByText('Aislar energía')).toBeVisible();
  // connection banner
  await page.evaluate(() => (window as any).__mockWs.disconnect());
  await expect(page.getByTestId('connection-banner')).toBeVisible();
});
```

## Definition of Done

- [ ] WS conecta al entrar a SessionPage
- [ ] Eventos `step.*`, `event.appended`, `photo.*`, `assistant.*`, `report.*` actualizan UI
- [ ] Reconexión automática tras pérdida con catch-up
- [ ] Banner de "Reconectando…" durante outage
- [ ] VoiceIndicator cambia entre "Escuchando…" / "Hablando…" según eventos
- [ ] Mock WS permite inyectar eventos para tests E2E
- [ ] Cleanup correcto al salir de SessionPage

## Notas

- El VoiceIndicator real (animación de onda) se hace con CSS/SVG; sin libs pesadas.
- Si el WS real se desconecta > 30 s, mostrar CTA "Reintentar" en banner.