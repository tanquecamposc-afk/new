---
paths:
  - "src/server/**"
  - "apps/server/**"
  - "src/network/**"
---
# Red y seguridad
- Nunca confíes en posición, daño, puntuación, moneda o rango proporcionados por el cliente.
- Identifica al jugador por sesión autenticada, no por ID en el payload sin verificar.
- Protocolo versionado; validar longitud, rango, tasas y tipos de cada mensaje.
- Rate limits, desconexiones, reconexiones, timeouts y control de repetición.
- Logs sin claves, tokens ni datos sensibles.
