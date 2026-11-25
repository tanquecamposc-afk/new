# Despliegue del servidor dedicado

## Local, sin Docker
```bash
VA_PORT=7777 VA_REGION=local velocity-arena/server/start_server.sh
```
```bash
VA_PORT=7777 velocity-arena/server/stop_server.sh
```
El servidor escribe un latido en `/tmp/va_heartbeat` cada 5 s y un resumen de
estadísticas (peers, salas, partidas, mensajes rechazados, KB enviados) cada 30 s.

## Docker / VPS
```bash
cd velocity-arena
cp .env.example .env      # edita región y nombre
docker compose up -d --build
docker compose logs -f
```
- La imagen descarga Godot 4.4.1 oficial y verifica su **SHA-512** antes de usarlo.
- Expone **UDP 7777** (juego) y **UDP 7778** (descubrimiento LAN, opcional en internet).
- El *healthcheck* comprueba que el latido tenga menos de 20 s.
- Se ejecuta como usuario sin privilegios (`va`, uid 10001).

> **Sin verificar:** en el entorno de desarrollo no había daemon de Docker, así
> que el `Dockerfile` y `docker-compose.yml` **no se han construido ni ejecutado**.
> El script `server/start_server.sh` sí se ha probado: arranca y escribe el latido.

## Requisitos de red en un VPS
1. Proveedor que permita **tráfico UDP entrante** (Hetzner, DigitalOcean, Oracle
   Cloud, etc.). Abre UDP 7777 en el cortafuegos del proveedor **y** en el del sistema
   (`ufw allow 7777/udp`).
2. 1 vCPU sostiene varias salas 1v1/2v2 (medido: ~0,6–1 ms por tick con 8 coches
   en GDScript); el ancho de banda es ≈ 25 KB/s de bajada por jugador a 60 Hz.
3. Región: para jugadores en Perú y países cercanos conviene un servidor en
   Sudamérica (p. ej. São Paulo o Santiago). **Mide el ping real** desde vuestras casas
   antes de elegir: no hay ninguna región desplegada todavía.

## Qué falta para producción
- Servicios HTTPS de cuentas, perfiles y emparejamiento global con PostgreSQL y Redis.
  Hoy el lobby y la cola viven dentro de cada servidor de juego y las cuentas son de invitado.
- Asignación automática de servidores por región (p. ej. con Agones o un orquestador propio).
- Copias de seguridad y migraciones de base de datos, que llegarán cuando exista la base de datos.
- Ninguna de estas piezas se ha contratado ni desplegado: hace falta tu autorización
  y una cuenta en un proveedor.
