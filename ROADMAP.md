# ROADMAP — NEXUS ROYALE

Estado por fase. `DONE` significa jugable y verificado con los comandos de
[`docs/PROGRESO.md`](docs/PROGRESO.md); nada se marca hecho por tener solo pantalla o botón.

| Fase | Contenido | Estado | Depende de |
|---|---|---|---|
| 0 | Repositorio, build, tipos estrictos, pruebas, documentación del kit | DONE | — |
| 1 | Motor 3D, personaje, cámara, movimiento y colisiones; lobby mínimo, HUD, ajustes básicos, controles táctiles | DONE | 0 |
| 2 | Armas hitscan, daño, escudo, munición y recarga, inventario de 5 casillas, bots con percepción | PLANNED (siguiente) | 1 |
| 3 | Partida Royale: despliegue, botín, zona por fases, construcción y Sin Construcción, victoria y resultados | PLANNED | 2 |
| 4 | Recarga (reaparición por equipo), Pilares (presets separados) y rango de práctica | PLANNED | 3 |
| 5 | Lobby completo, taquilla con skins, tienda con moneda ficticia, pase, misiones y carrera | PLANNED | 2-3 (eventos reales de partida) |
| 6 | Estudio Creativo, multijugador con servidor autoritativo, optimización y gráficos avanzados | PLANNED | 3-5 |

## Qué entra en la fase 2 (siguiente)
- `WeaponRegistry` con los valores de `docs/03` (`starter_ar`, `starter_pistol`, `starter_shotgun`,
  `starter_smg`, `starter_sniper`) y estados de arma `ready → firing → cooldown → reloading`.
- Disparo por raycast desde la cámara validado por la simulación; dispersión reproducible por
  semilla; caída de daño por distancia; multiplicador de cabeza; perdigones de escopeta.
- Vida 100 + escudo, usando `src/core/combat.ts`; consumibles; daño por caída desde 8 m.
- Inventario de 5 casillas con cambio de arma y recogida.
- Bots: `PATROL → INVESTIGATE → CHASE → ATTACK → RETREAT → SEARCH`, visión por cono y línea de
  visión, sin atravesar ni ver a través de muros.
- HUD de vida, escudo, munición y marcador de impacto confirmado por la simulación.
- Criterios T03, T04, T05 y T06.

## Bloqueos y riesgos
- **Rendimiento en hardware real sin medir** (aquí solo hay render por CPU). No bloquea, pero el
  objetivo de 60 FPS no puede darse por cumplido.
- **Multijugador real** (fase 6) necesita un servidor accesible; en local se puede verificar con
  dos navegadores contra un servidor Node en la misma máquina.
- **Arte**: todo es geometría procedural original. Modelos con rig y animaciones de autor quedan
  como mejora futura y deben registrarse en `assets/LICENSES.md`.

## Fuera de alcance por decisión
- Réplica de otro juego: nombre, personajes, mapas, interfaz, moneda o música de terceros.
- Compras con dinero real, sorteos o presentar bots como jugadores humanos.
