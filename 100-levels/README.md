# 100 LEVELS

Juego web 3D con 100 niveles repartidos en 10 mundos. Cada mundo es un género distinto (parkour, puzles, combate, carreras, terror, sigilo, precisión, supervivencia, jefes y caos) y el nivel 100 es un jefe final de 5 fases.

Está hecho con **React + TypeScript + Three.js + Vite**. No usa ningún asset externo: texturas, modelos, música y efectos de sonido se generan por código.

## Cómo ejecutarlo

```bash
cd 100-levels
npm install
npm run dev        # servidor de desarrollo → http://localhost:5173
npm run build      # typecheck + build de producción en dist/
npm run preview    # sirve el build
```

## Controles

| Tecla | Acción |
|---|---|
| W A S D | Moverse |
| Ratón | Girar la cámara (clic en el juego para capturarlo) |
| Espacio | Saltar (en coche: boost) |
| Shift | Correr (en coche: derrape) |
| Ctrl / C | Agacharse · mientras corres: **deslizarse** |
| (automático) | Correr o saltar contra un borde: **saltar la valla / trepar** |
| F | Esquivar (rodar, con invulnerabilidad breve) |
| Clic izq. / clic der. | Ataque (combo) / ataque pesado · con arco o bastón: apuntar |
| Q | Habilidad (cambia según el mundo: air dash, pulso revelador, destello, lanzar piedra, habilidad del arma) |
| E | Interactuar (mantener pulsado cuando lo indica) |
| 1–6 | Cambiar de arma |
| R | Poción |
| Tab | Crafteo (supervivencia) |
| Esc | Pausa |

En tablets se activan controles táctiles (también se pueden forzar en Ajustes).

La cámara se coloca sola detrás del personaje cuando corres sin mover el ratón.

## Rendimiento

- **Resolución dinámica**: si los FPS bajan de ~45, la resolución interna baja automáticamente (hasta 55 %) y vuelve a subir cuando hay margen.
- Calidad LOW / MEDIUM / HIGH en Ajustes (MSAA, sombras, bloom, resolución máxima).
- La geometría estática de cada nivel se fusiona por material para reducir las llamadas de dibujo.

## Mundos

| Niveles | Mundo | Mecánicas |
|---|---|---|
| 1–10 | Parkour | Plataformas móviles, láseres, suelos que desaparecen, zonas de velocidad, torre con viento, prensas, barras giratorias. Jefe: **GUARDIAN** |
| 11–20 | Puzzle | Palancas, luces, cajas sobre placas de presión, códigos de glifos, memoria, puentes invisibles, gravedad, puertas cronometradas, espejos de luz. Jefe: **THE MASTER** (hay que resolver puzles para romper su escudo) |
| 21–30 | Combate | Oleadas en arenas, 6 tipos de enemigos con IA, arco y bastón. Jefe: **THE WARRIOR** (3 fases) |
| 31–40 | Carreras | Coche con aceleración, derrape, boost, rampas, checkpoints, vueltas, rivales con IA, tráfico y eliminación. Final: **ULTIMATE RACE** |
| 41–50 | Terror | Mansiones laberinto, bosque, linterna con batería, acechadores, armarios para esconderse, sustos. Final: **THE WATCHER** (huir) |
| 51–60 | Sigilo | Guardias con cono de visión y estados IDLE/PATROL/SUSPICIOUS/ALERT/CHASE/SEARCH, cámaras, alarmas, hierba alta, distracciones, derribos. Final: **THE FORTRESS** |
| 61–70 | Precisión | Puntería, reacción, memoria, pop-ups, timing, arquería con caída y viento, dianas móviles, sala de torretas. Final: **PERFECT SHOT** |
| 71–80 | Supervivencia | Recolección, hambre, sed y calor, crafteo, ciclo día/noche, lobos, tormenta. **VOLCANO** (75) y **THE APOCALYPSE** (80) |
| 81–90 | Boss Rush | Inferno, Glacius, Voltara, Umbra, Tempest, Gaia, Naga, Elder, Baal, **THE DESTROYER** |
| 91–99 | Caos | Mezclas de todas las mecánicas y el **FINAL TRIAL** |
| 100 | Final | **👑 THE 100TH**: Warrior → Destroyer → Nightmare → Chaos → Final (la arena se derrumba contrarreloj) |

## Progresión

- **Estrellas** (3 por nivel): completarlo, bajar del tiempo par y el desafío del nivel (sin daño, todas las monedas, sin ser detectado, 1.º puesto, precisión…).
- **XP y nivel de jugador**, **monedas**, **tienda** (skins, armas, efectos, objetos, cofres), **cofres** con 5 rarezas, **inventario** con equipamiento visible en el personaje.
- **29 logros**, **reliquias secretas** que desbloquean 5 **niveles secretos** (Classic, Impossible Parkour, Infinite Boss, Speedrun, Tiny).
- Al completar el nivel 100 se desbloquean la dificultad **NIGHTMARE**, las **Level Mutations** y el **modo Speedrun** (por mundo o partida completa, con splits y récords).
- Guardado automático en `localStorage` con esquema versionado y validado. Se puede exportar e importar desde Ajustes.

## Arquitectura

```
src/
  core/        Engine (render, bucle, cámara lenta), Input, GameManager, MenuScene
  gfx/         Texturas procedurales, materiales PBR, partículas, efectos, postprocesado, entorno/cielo
  physics/     Colisiones AABB, controlador de personaje, raycasts, cuerpos dinámicos
  player/      Modelo humanoide, Animator (blending procedural), controlador del jugador, skins
  camera/      Cámara en tercera persona cinematográfica
  combat/      Armas, combate cuerpo a cuerpo y a distancia, proyectiles
  enemies/     IA de enemigos, guardias de sigilo, acechadores, bestias, torretas
  bosses/      Framework de jefes con corrutinas, modelos, ataques y definiciones
  entities/    Plataformas, trampas, recogibles y puzles
  racing/      Pista y física del vehículo
  levels/      Session (ciclo de vida del nivel), registro y builders de cada mundo
  audio/       Mezclador Web Audio, música procedural y efectos sintetizados
  save/        Sistema de guardado
  store/       Estado del juego (zustand) y perfil persistente
  ui/          Menús, HUD, tienda, inventario, cofres, resultados
  data/        Mundos, niveles, ítems, logros, dificultades y mutaciones
```
