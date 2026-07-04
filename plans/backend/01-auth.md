# BE-01 — Auth

**Estado:** ⏳
**Depende de:** BE-00
**Desbloquea:** BE-02..08
**PRD features:** F1.1, F1.2, F1.3, F1.4, F1.5, F1.6
**Stack:** backend · capas: domain + application + infrastructure + interface

## Goal

Login con email/password, emisión de JWT firmado (HS256 con secreto en env), refresh, `me` con claims custom (`plant_id`, `role`), middleware `get_current_user`, y roles gate. Todo con `IUserRepository` in-memory; stub `SupabaseUserRepository` con `NotImplementedError`.

## Capas afectadas

### Domain
- `entities/user.py` — `User(id, email, password_hash, full_name, role, plant_id)`
- `value_objects/role.py` — `Role` enum (`TECHNICIAN|SUPERVISOR|RAG_ADMIN`)
- `value_objects/auth.py` — `AccessToken`, `RefreshToken` (value objects con `exp`)
- `ports/repositories.py` — `IUserRepository`
- `ports/services.py` — `IPasswordHasher`, `ITokenService`, `IClock`
- `services/password_hasher.py` — `BcryptPasswordHasher`
- `services/token_service.py` — `JwtTokenService(secret, algo=HS256, ttl_seconds)`
- `services/system_clock.py` — `SystemClock`

### Application
- `use_cases/auth/login.py` — valida credenciales, emite tokens
- `use_cases/auth/refresh.py` — rota refresh token, emite nuevo access
- `use_cases/auth/logout.py` — revoca refresh token (blacklist in-memory)
- `use_cases/auth/get_me.py` — devuelve user por id
- `dto/auth.py` — `LoginInput`, `LoginOutput`, `MeOutput`

### Infrastructure
- `persistence/in_memory/user_repository.py` — `InMemoryUserRepository` con fixtures (3 técnicos, 1 supervisor, 1 admin)
- `persistence/in_memory/token_blacklist.py` — `InMemoryTokenBlacklist`
- `persistence/supabase/user_repository.py` — stub `raise NotImplementedError`
- `factories.py` — `get_user_repository()`, `get_token_service()`, `get_password_hasher()`, `get_clock()`

### Interface
- `http/routers/auth.py` — `POST /v1/auth/login`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`, `GET /v1/auth/me`
- `http/deps/auth.py` — `get_current_user`, `require_role(...)`
- `http/exception_handlers.py` — añadir `UNAUTHORIZED`, `INVALID_CREDENTIALS`, `TOKEN_EXPIRED`

## Switch vía .env

```
AUTH=memory|supabase_auth
JWT_SECRET=change-me-32-bytes-min
JWT_ALGORITHM=HS256
ACCESS_TOKEN_TTL_SECONDS=3600
REFRESH_TOKEN_TTL_SECONDS=2592000
PASSWORD_BCRYPT_ROUNDS=10
```

## Tests que se escriben PRIMERO

### Unit
1. `tests/unit/domain/test_user_entity.py` — invariantes, role
2. `tests/unit/domain/test_password_hasher.py` — hash + verify
3. `tests/unit/domain/test_token_service.py` — emite + decodifica + expira
4. `tests/unit/application/test_login_use_case.py` — credenciales OK, inválidas, usuario no existe, usuario bloqueado
5. `tests/unit/application/test_refresh_use_case.py` — token válido, expirado, revocado
6. `tests/unit/application/test_get_me_use_case.py` — devuelve datos correctos

### Integration
7. `tests/integration/test_auth_router.py` — 200/401/403 según contrato
8. `tests/integration/test_get_current_user_dep.py` — extrae user de JWT válido, rechaza sin token, rechaza token expirado

### E2E
9. `tests/e2e/test_auth_e2e.py` — login → me → logout → 401

## Implementación mínima para verde

- `BcryptPasswordHasher` con `passlib[bcrypt]`.
- `JwtTokenService` con `pyjwt`; incluye `sub`, `email`, `role`, `plant_id`, `iat`, `exp`, `jti`.
- `InMemoryUserRepository` con `AsyncLock` y 5 fixtures con hashes precomputados.
- Login hashea password input y compara; si OK, emite access + refresh.
- Refresh valida `jti` contra blacklist.
- `get_current_user` decodifica token, busca user por `sub`, lo inyecta.
- `require_role("supervisor")` dependency verifica role.

## Archivos a crear/modificar

```
backend/src/domain/entities/user.py            # NEW
backend/src/domain/value_objects/role.py       # NEW
backend/src/domain/value_objects/auth.py       # NEW
backend/src/domain/ports/repositories.py       # NEW (IUserRepository)
backend/src/domain/ports/services.py           # NEW (IPasswordHasher, ITokenService, IClock)
backend/src/domain/services/password_hasher.py # NEW
backend/src/domain/services/token_service.py   # NEW
backend/src/domain/services/system_clock.py    # NEW
backend/src/application/use_cases/auth/login.py    # NEW
backend/src/application/use_cases/auth/refresh.py  # NEW
backend/src/application/use_cases/auth/logout.py   # NEW
backend/src/application/use_cases/auth/get_me.py   # NEW
backend/src/application/dto/auth.py                # NEW
backend/src/infrastructure/persistence/in_memory/user_repository.py      # NEW
backend/src/infrastructure/persistence/in_memory/token_blacklist.py      # NEW
backend/src/infrastructure/persistence/supabase/user_repository.py       # NEW (stub)
backend/src/infrastructure/factories.py                                   # MODIFY
backend/src/interface/http/routers/auth.py                                # NEW
backend/src/interface/http/deps/auth.py                                   # NEW
backend/src/interface/http/exception_handlers.py                          # MODIFY
backend/src/infrastructure/errors.py                                      # MODIFY (add codes)
backend/src/infrastructure/config.py                                      # MODIFY
```

## E2E test scenario

```bash
# 1. login OK
curl -X POST http://localhost:8000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"juan@planta.com","password":"test1234"}'
# esperado: 200 + {access_token, refresh_token, expires_in, user:{role:"technician",plant_id}}

# 2. me con token
curl http://localhost:8000/v1/auth/me \
  -H "Authorization: Bearer <access>"
# esperado: 200 + datos del user

# 3. login inválido
curl -X POST http://localhost:8000/v1/auth/login \
  -d '{"email":"juan@planta.com","password":"WRONG"}'
# esperado: 401 + {error:{code:"INVALID_CREDENTIALS"}}

# 4. me sin token
curl http://localhost:8000/v1/auth/me
# esperado: 401 + {error:{code:"UNAUTHORIZED"}}

# 5. refresh
curl -X POST http://localhost:8000/v1/auth/refresh \
  -d '{"refresh_token":"..."}'
# esperado: 200 + nuevo access_token

# 6. logout
curl -X POST http://localhost:8000/v1/auth/logout \
  -H "Authorization: Bearer <access>" \
  -d '{"refresh_token":"..."}'
# esperado: 204

# 7. refresh tras logout
curl -X POST http://localhost:8000/v1/auth/refresh \
  -d '{"refresh_token":"..."}'
# esperado: 401 (revocado)
```

## Definition of Done

- [ ] `pytest -q` pasa 100 %
- [ ] Contrato de `/v1/auth/*` cumple `integration_contracts.md` §2.1
- [ ] Bcrypt con rounds configurables
- [ ] JWT firmado HS256 con claims custom
- [ ] Middleware rechaza sin token / token inválido / token expirado
- [ ] Blacklist de refresh tokens funciona
- [ ] Roles gate funcional (`require_role`)
- [ ] Stub `SupabaseUserRepository` con `NotImplementedError` claro
- [ ] Sin claves externas requeridas (todo memory)

## Variables de entorno nuevas

```
AUTH=memory|supabase_auth
JWT_SECRET=<min 32 bytes>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_TTL_SECONDS=3600
REFRESH_TOKEN_TTL_SECONDS=2592000
PASSWORD_BCRYPT_ROUNDS=10
```

## Notas

- No implementes aún refresh rotation con reuse detection (lo hará BE-08 hardening si se requiere).
- Passwords de fixtures: `test1234` (documentado en `tests/conftest.py`).
- Claims custom en JWT: `role`, `plant_id` — usados por BE-02 en adelante para filtrar.