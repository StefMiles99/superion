# FE-01 — Auth (mobile + desktop)

**Estado:** ⏳
**Depende de:** FE-00
**Desbloquea:** FE-02, FE-09
**PRD features:** M1.1, M1.2, M1.3, M1.4, D1.1, D1.2
**Stack:** frontend · capas: domain + application + infrastructure + ui

## Goal

Login con email/password en ambas apps, persistencia de sesión, auto-refresh transparente, guard de rutas que redirige a `/login` si no autenticado. Mock auth que emite JWT falso con claims correctos.

## Capas afectadas

### Domain (`packages/domain`)
- `entities/auth.ts` — `AuthSession { accessToken, refreshToken, expiresAt, user }`
- `entities/user.ts` — `User { id, email, fullName, role, plantId }`
- `ports/IApiClient.ts` — extender con `login(input)`, `refresh(token)`, `logout()`, `me()`

### Application (`packages/domain/hooks` o `packages/auth/`)
- `useAuth()` — hook con Zustand store
- `useLogin()` — mutation
- `useLogout()` — mutation
- Guard `<RequireAuth>` component

### Infrastructure
- `packages/api-client/src/in_memory.ts` — extender `InMemoryApiClient` con `login/refresh/logout/me` que validan contra fixtures (5 usuarios: 3 técnicos, 1 supervisor, 1 admin; password universal `test1234`)
- `packages/api-client/src/http.ts` — implementar contra backend (asume `BE-01` listo)

### UI
- `apps/mobile/src/pages/LoginPage.tsx` — formulario
- `apps/desktop/src/pages/LoginPage.tsx` — formulario
- `packages/ui/src/Input.tsx`, `Label.tsx`, `Form.tsx`
- Layout `<AppShell>` minimal con header

## Switch vía .env

Sin nuevas vars; usa `VITE_API_MODE`.

## Tests que se escriben PRIMERO

### Unit
1. `packages/domain/tests/auth.test.ts` — `AuthSession` invariantes
2. `packages/api-client/tests/in_memory_auth.test.ts` — login OK, credenciales inválidas, refresh, logout
3. `packages/auth/tests/useAuth.test.ts` — store transitions (login → logged in; logout → logged out)

### Integration
4. `apps/mobile/tests/integration/LoginPage.test.tsx` — submit → navega a `/work-orders`
5. `apps/desktop/tests/integration/LoginPage.test.tsx` — submit → navega a `/dashboard`

### E2E
6. `apps/mobile/tests/e2e/01-auth.spec.ts` — Playwright: fill form → land en lista OT (placeholder si FE-02 no listo)
7. `apps/desktop/tests/e2e/01-auth.spec.ts` — Playwright: fill form → land en dashboard

## Implementación mínima para verde

- Mock emite JWT con header.payload.signature donde signature = base64 de `mock-signature`; payload incluye `sub`, `email`, `role`, `plant_id`, `exp`.
- `useAuth` persiste `AuthSession` en `localStorage` con clave `superion.auth`.
- Interceptor HTTP en `HttpApiClient` añade `Authorization: Bearer <token>` y auto-refresh en 401 (una vez).
- `<RequireAuth>` lee `useAuth` y redirige a `/login` si no hay sesión.

## Archivos a crear/modificar

```
frontend/packages/domain/src/entities/auth.ts
frontend/packages/domain/src/entities/user.ts
frontend/packages/domain/src/ports/IApiClient.ts            # MODIFY
frontend/packages/auth/src/useAuth.ts
frontend/packages/auth/src/RequireAuth.tsx
frontend/packages/auth/src/index.ts
frontend/packages/api-client/src/in_memory.ts               # MODIFY
frontend/packages/api-client/src/http.ts                    # MODIFY
frontend/packages/ui/src/Input.tsx
frontend/packages/ui/src/Label.tsx
frontend/packages/ui/src/Form.tsx
frontend/apps/mobile/src/pages/LoginPage.tsx
frontend/apps/mobile/src/routes.tsx                          # MODIFY
frontend/apps/desktop/src/pages/LoginPage.tsx
frontend/apps/desktop/src/routes.tsx                          # MODIFY
```

## E2E test scenario

```ts
// apps/mobile/tests/e2e/01-auth.spec.ts
test('login flow mobile', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.fill('[name=email]', 'juan@planta.com');
  await page.fill('[name=password]', 'test1234');
  await page.click('button[type=submit]');
  await page.waitForURL('**/work-orders'); // placeholder por ahora
  // assert localStorage has superion.auth
  const session = await page.evaluate(() => localStorage.getItem('superion.auth'));
  expect(session).toContain('accessToken');
});
```

## Definition of Done

- [ ] Login funciona en mobile + desktop con mocks y con backend real
- [ ] Persistencia en localStorage funciona
- [ ] Auto-refresh transparente (un solo retry en 401)
- [ ] Guard redirige a login si no hay sesión
- [ ] Logout limpia storage y navega a `/login`
- [ ] Tokens falsos de mock tienen claims correctos
- [ ] Tests E2E Playwright pasan en ambos apps

## Notas

- `password universal` para fixtures mock: `test1234`. Documentado en `packages/api-client/README.md`.
- Roles diferentes visibles tras login: técnico → `/work-orders`, supervisor → `/dashboard`, admin → `/manuals` (placeholder si FE-11/12 no listos).