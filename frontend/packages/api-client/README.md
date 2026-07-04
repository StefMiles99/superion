# Credenciales mock (InMemoryApiClient)

Contraseña universal para todos los usuarios fixture: `test1234`

| Email | Rol |
|---|---|
| juan@planta.com | technician |
| maria@planta.com | technician |
| pedro@planta.com | technician |
| ana@planta.com | supervisor |
| admin@planta.com | rag_admin |

Los tokens JWT mock tienen claims `sub`, `email`, `role`, `plant_id`, `exp` y firma base64 de `mock-signature`.
