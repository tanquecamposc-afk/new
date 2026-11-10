---
name: auditar-modo
description: Audita Battle Royale, Recarga, Ranked, Pillars u otro modo mediante reglas, pruebas de casos límite y trazabilidad.
---
# Auditoría de un modo
1. Identifica `modeId`, fuente, fecha, versión y estado: confirmado/histórico/propuesta.
2. Lee el preset y sus reglas; compara UI, lógica, persistencia, servidor y resultados.
3. Genera pruebas de: inicio, final, muerte, empate, desconexión, respawn, tormenta, límite de jugadores.
4. Inspecciona los eventos, repeticiones, doble recompensa, colisiones, abuso de red.
5. Ejecuta las pruebas y redacta lista de fallos por severidad y ruta exacta.
6. Nunca confundir distintas islas Pillars ni aplicar sus valores cruzados.
