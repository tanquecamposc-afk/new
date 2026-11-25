# Resultados de pruebas multijugador

Entorno: contenedor Linux x86_64 (4 vCPU, sin GPU), Godot 4.4.1, fecha 2026-11-25.
**Todas las pruebas se hicieron en localhost** (127.0.0.1), con procesos separados
y sockets UDP reales. La latencia se añade con el simulador de red del cliente
(`--lag/--jitter/--loss`). **No se ha probado entre dos redes distintas.**

## Integración: 3 procesos reales por escenario

```bash
python3 velocity-arena/tests/multiplayer/run_mp_tests.py
```

Cada escenario arranca un servidor dedicado `--headless` y dos clientes
independientes (anfitrión e invitado). Se comprueba:

- conexión y saludo;
- formato del código de sala;
- contraseña incorrecta rechazada; unión con código y contraseña;
- un no anfitrión no puede iniciar la partida;
- inicio de partida y snapshots;
- 2 coches, uno distinto por cliente;
- el coche propio se mueve en el servidor y el movimiento del rival es visible;
- evento de gol y marcador 1-0 sincronizado en ambos;
- desconexión del invitado y reconexión a la misma partida;
- paquetes de entrada malformados ignorados;
- fin de partida, vuelta al lobby y servidor vivo al final.

Resultado literal:

```
## localhost_0ms  (26 s)  servidor vivo al final: sí
  ·  host: rtt 6.9 ms, jitter 0.3 ms, error predicción medio 0.000 m, reconciliaciones 681, snapshots 681, bajada 394 KB, subida 73 KB, marcador final 1-0, motivo 'done'
  ·  guest: rtt 6.9 ms, jitter 0.2 ms, error predicción medio 0.000 m, reconciliaciones 242, snapshots 242, bajada 375 KB, subida 72 KB, marcador final 1-0, motivo 'done'
## sim_60ms_jitter5  (27 s)  servidor vivo al final: sí
  ·  host: rtt 68.2 ms, jitter 3.5 ms, error predicción medio 0.000 m, reconciliaciones 691, snapshots 691, bajada 397 KB, subida 73 KB, marcador final 1-0, motivo 'done'
  ·  guest: rtt 71.1 ms, jitter 5.0 ms, error predicción medio 0.000 m, reconciliaciones 242, snapshots 242, bajada 378 KB, subida 73 KB, marcador final 1-0, motivo 'done'
## sim_150ms_jitter20_loss5  (27 s)  servidor vivo al final: sí
  ·  host: rtt 164.4 ms, jitter 11.4 ms, error predicción medio 0.305 m, reconciliaciones 554, snapshots 554, bajada 387 KB, subida 74 KB, marcador final 1-0, motivo 'done'
  ·  guest: rtt 153.3 ms, jitter 16.6 ms, error predicción medio 0.364 m, reconciliaciones 193, snapshots 193, bajada 363 KB, subida 74 KB, marcador final 1-0, motivo 'done'
RESULTADO GLOBAL: OK
```

Todos los checks individuales pasaron (no se listan los PASS; solo se imprimen
FAIL y métricas). El error de predicción con 0 y 60 ms es 0,000 m porque cliente y
servidor ejecutan el mismo código en la misma máquina; con 150 ms, jitter y 5 %
de pérdida sube a ≈0,3 m de media (corregido visualmente).

## Unitarias (sin sockets)

`tests/test_multiplayer.gd`, dentro de `run_tests.gd`. Cubre:

- protocolo de entradas y de snapshots (ida y vuelta, rechazo de datos malformados);
- códigos de sala y saneado de nombres;
- reglas de lobby: versión, contraseña, código inexistente, permisos de anfitrión, saneado de la configuración;
- entradas aplicadas por el servidor y límite de frecuencia;
- comandos de depuración rechazados sin `--allow-debug`;
- límite de chat;
- reconexión con token y expiración de la plaza;
- cola casual con conteo real y relleno con bots etiquetados;
- predicción a 100 ms simulados en proceso: error medio 0,12 m, 297 reconciliaciones.

## Visual

`tools/online_shot.tscn` conectado a un servidor dedicado real:
`docs/screenshots/online_lobby.png` y `docs/screenshots/online_match.png`.

El ping que aparece en esas capturas (>1 s) es un artefacto del renderizado por
software a muy pocos FPS. El ping real medido en las pruebas sin gráficos es de 7–9 ms.

## Pendiente de verificar
- Dos clientes en redes distintas contra un servidor público.
- 4v4 con 8 humanos (probado solo con bots en el servidor).
- Construcción de la imagen Docker (no hay daemon en este entorno).
