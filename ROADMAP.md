# ROADMAP — NEXUS ROYALE

Estado por fase. `DONE` significa jugable y verificado con los comandos de
[`docs/PROGRESO.md`](docs/PROGRESO.md); nada se marca hecho por tener solo pantalla o botón.

| Fase | Contenido | Estado | Depende de |
|---|---|---|---|
| 0 | Repositorio, build, tipos estrictos, pruebas, documentación del kit | DONE | — |
| 1 | Motor 3D, personaje, cámara, movimiento y colisiones; lobby mínimo, HUD, ajustes básicos, controles táctiles | DONE | 0 |
| 2 | Armas hitscan, daño, escudo, munición y recarga, inventario de 5 casillas, consumibles, bots con percepción y navegación; Galería de Tiro y Escaramuza | DONE | 1 |
| 3 | Partida Royale: despliegue, botín, zona por fases, construcción y Sin Construcción, victoria y resultados | PLANNED (siguiente) | 2 |
| 4 | Recarga (reaparición por equipo), Pilares (presets separados) y rango de práctica | PLANNED | 3 |
| 5 | Lobby completo, taquilla con skins, tienda con moneda ficticia, pase, misiones y carrera | PLANNED | 2-3 (eventos reales de partida) |
| 6 | Estudio Creativo, multijugador con servidor autoritativo, optimización y gráficos avanzados | PLANNED | 3-5 |

## Qué entra en la fase 3 (siguiente)
- Mapa de isla más grande con varios puntos de interés (el kit de construcción de mapas de
  `src/core/maps/builder.ts` ya genera edificios con puertas y ventanas).
- Fases de partida completas: espera, calentamiento, despliegue desde el aire, activa, círculo
  final y resultados, sobre la máquina de fases que ya usa la Escaramuza.
- Zona que se cierra con `src/core/storm.ts` (tiempo, radio y daño por tick), con aviso previo y
  bots que la respetan; sustituye al «pulso de cierre» de la Escaramuza.
- Botín por tablas con semilla (cofres y suelo) usando `weightedPick`; rarezas.
- Construcción en rejilla de 4 m (pared, suelo, rampa, cono) con materiales, soporte y coste; y
  variante Sin Construcción que la rechaza en el dominio. La navegación de los bots tendrá que
  actualizarse cuando aparezcan o se destruyan piezas.
- Herramienta cuerpo a cuerpo para recolectar materiales (`starter_melee` de docs/03).
- Criterios T07 a T10.

## Bloqueos y riesgos
- **Rendimiento en hardware real sin medir** (aquí solo hay render por CPU). No bloquea, pero el
  objetivo de 60 FPS no puede darse por cumplido.
- **Multijugador real** (fase 6) necesita un servidor accesible; en local se puede verificar con
  dos navegadores contra un servidor Node en la misma máquina.
- **Bots y construcción**: la navegación se genera una vez por partida a partir del mapa; con
  piezas construidas en tiempo real habrá que regenerarla por zonas o validar los pasos al vuelo.
- **Llamadas de dibujo**: cada corredor son unas 30 mallas; con 8 en pantalla la escena ronda las
  430 llamadas. Suficiente para una GPU, pero habrá que fusionar mallas o usar LOD antes de
  subir a decenas de jugadores.
- **Arte**: todo es geometría procedural original. Modelos con rig y animaciones de autor quedan
  como mejora futura y deben registrarse en `assets/LICENSES.md`.

## Fuera de alcance por decisión
- Réplica de otro juego: nombre, personajes, mapas, interfaz, moneda o música de terceros.
- Compras con dinero real, sorteos o presentar bots como jugadores humanos.
