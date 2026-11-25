# Multijugador — cómo jugar con amigos

Requisitos: Godot 4.4.x en cada computadora (o un build exportado cuando exista)
y la carpeta `velocity-arena/`. Todos deben usar la **misma versión del juego**
(el servidor rechaza clientes con otra versión de protocolo).

## 1. En una sola computadora (desarrollo)

Terminal 1 — servidor dedicado:
```bash
godot --headless --path velocity-arena -- --server --port 7777
```
Terminales 2 y 3 — dos clientes:
```bash
godot --path velocity-arena -- --client --address 127.0.0.1 --port 7777 --name Juan
```
```bash
godot --path velocity-arena -- --client --address 127.0.0.1 --port 7777 --name Ana --fresh
```
(`--fresh` evita reutilizar el token de sesión guardado; hace falta cuando dos
clientes se ejecutan desde la misma cuenta de usuario del sistema.)

## 2. En la misma red (LAN)

- **Anfitrión:** Menú → EN LÍNEA → «Hospedar partida LAN». Arranca un servidor
  dentro del juego y te conecta a él.
- **Resto:** Menú → EN LÍNEA → «Buscar en LAN» (descubrimiento UDP en el puerto
  7778) o escribe la IP local del anfitrión (p. ej. `192.168.1.20`) y «Conectar».
- Si el cortafuegos del anfitrión bloquea UDP 7777/7778, permite esos puertos.

## 3. Por internet (casas distintas)

Hace falta un servidor dedicado con IP pública y el puerto **UDP 7777** abierto.
Ver `SERVER_DEPLOYMENT.md`. Después, cada jugador: EN LÍNEA → servidor =
IP o dominio del servidor → Conectar.

> Estado: el juego por internet **no se ha verificado** entre dos redes reales
> porque esto requiere un servidor público que aún no existe. Solo se ha probado
> en localhost con procesos separados (ver `MULTIPLAYER_TEST_RESULTS.md`).

## 4. Crear una sala privada y unirse

1. Conectado al servidor: «Crear sala privada» → nombre, modo, tamaño de equipo,
   duración, ambiente, contraseña opcional, bots, visibilidad, espectadores → Crear.
2. Aparece el código de sala, p. ej. **VA-7K2M9P** → «Copiar código» y envíalo.
3. El amigo: «Unirse con código» → código + contraseña → Unirse.
4. En el lobby cada uno elige equipo (o espectador) y marca «Listo»;
   el anfitrión pulsa «Iniciar partida». Solo el anfitrión puede cambiar ajustes.

## 5. Durante la partida

| Tecla | Acción |
|---|---|
| 1–8 | Chat rápido («¡Buen tiro!», «¡Es mía!», «¡Necesito turbo!»…) |
| Intro | Chat de texto |
| F4 | Overlay de red: ping, jitter, pérdida, ancho de banda, ticks, error de predicción, reconciliaciones |
| Esc | Menú (la partida sigue): abandonar sala / desconectar |

Si se corta la conexión, el cliente intenta reconectarse solo (hasta 15 intentos)
con su token y vuelve a la misma partida; su plaza se reserva 60 s.

## 6. Opciones de línea de comandos

| Opción | Uso |
|---|---|
| `--server --port N` | servidor dedicado |
| `--region sa` | etiqueta de región mostrada a los jugadores |
| `--server-name "…"` | nombre en el descubrimiento LAN |
| `--snapshot-rate 30..60` | frecuencia de snapshots |
| `--allow-debug` | **solo pruebas**: permite comandos de depuración (mover balón, saltar cuenta atrás) |
| `--client --address A --port N --name X` | cliente que conecta al arrancar |
| `--lag ms --jitter ms --loss %` | simulador de red del cliente (pruebas) |
| `--fresh` | ignora el token de sesión guardado |
