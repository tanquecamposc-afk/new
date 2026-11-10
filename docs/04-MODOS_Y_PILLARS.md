# 04. EXPERIENCIAS DE JUEGO: REGLAS SEPARADAS, SISTEMA COMPARTIDO

## 4.1 Regla principal
No crear 10 copias independientes de shooter. Cada modo comparte PlayerController, Combat, Inventory, Collision, UI/HUD, Results y ContentRegistry, con reglas inyectadas de `ModeConfig`. Separar diferencias: mapa, tamaño equipo, storm, builds, respawn, loot, límites y ganador.

## 4.2 Battle Royale
Loop: lobby → espera → transporte aéreo propio → salto → planeador → botín → tormenta por fases → top-1 equipo → resultados. El mapa debe tener mínimo 3 zonas diferenciadas (zona urbana, colinas y bosque), puntos de interés originales, rutas de extracción y líneas de visión que permitan combate táctico. Simulación local primero con 8 bots; escalar después. Dejar explícito si no hay jugadores reales.

## 4.3 Zero Build
Usa todas las mecánicas de BR salvo construir/editar/reparar. Es necesario verificar la restricción desde el dominio/servidor, no solo ocultar piezas del HUD. Puede tener opciones de movilidad y escudo adicional configuradas, pero nunca inventar como dato oficial si no verificaste la versión.

## 4.4 Recarga / Reload
Referencia pública de Epic: 40 participantes, equipo que mantiene oportunidad de reaparición mientras queden compañeros vivos; versiones de construcción y sin construcción, clasificatorias disponibles. <https://www.fortnite.com/@epic/reload>

**Prototipo original:** en duos/squad, jugador eliminado pasa `WAITING_REBOOT`, recuenta temporizador, reaparece desde aire o posición válida cuando sigue vivo al menos 1 aliado y el modo no ha entrado en la fase de bloqueo. Eliminar enemigos puede reducir temporizador si `config.killTimerReduction` existe. Cuando muere todo el equipo y nadie queda en condiciones de reaparición, equipo eliminado definitivamente. Nunca aplicar la mecánica del equipo sin resolver cómo funciona modo solo.

**Casos límite:** último aliado muere el mismo tick que timer llega a cero; desconexión del único aliado; eliminación doble simultánea; respawn cerca de zona sin suelo; mundo en storm final; protección de respawn; inventario conservado/reset según reglas; reconexión tras reinicio; espectadores.

## 4.5 Ranked / Clasificatoria
El rango es **una medición de habilidad**, no un botón decorativo. La UI muestra categoría, progreso, resultado, cambios entre partidas y condiciones para jugar. El rating es controlado por servidor y depende de resultados validados. Usa un algoritmo propio simple para prototipo: `delta=placementPoints+eliminationPoints-opponentFactor`, limitado por regla de nivel, con topes y versiones; nunca afirmar que replica fórmula propietaria de Epic. No dar progresión Rank en partidas locales con bots como si fuese oficial: etiquetar «rango de entrenamiento».

**Antiexplotación:** evitar partidas amañadas, colusión, farm de bots en Ranked online, desconexión intencionada, colas desbalanceadas, divergencia de score y resultado duplicado. Requiere historial trazable y capacidad de corregir rankings inválidos.

## 4.6 Fortnite OG como referencia de modo retro
Solo inspiración general: mapas de aspecto clásico, pools de botín retro, efectos ambientales y rotación. Crear mapa, armas e identidad original; no importar geometrías o localizaciones propiedad de Epic. No asumir que una cola Ranked OG está activa sin verificar.

## 4.7 Blitz / Arenas
- **Blitz:** partidas muy rápidas, círculo inicial reducido, power-ups y loot acelerado. Objetivo original: partidas de 5-8 min, ajustables.
- **Arenas 2026:** combate de espacios reducidos boxfight/duel con rondas, puntuación y feedback de rango durante partida donde corresponda. No confundir con el antiguo modo Arena de Battle Royale de años anteriores.

## 4.8 Pillars: referencias no intercambiables, actualización 10/11/2026
| Referencia de mapa comunitario | Configuración pública anterior reportada | Implementación recomendada |
|---|---|---|
| Nexiph THE PILLARS v121 (8/11/2026) | 8 jugadores, ítem cada 5s, rondas rápidas y último vivo | primer preset jugable |
| Hive PILLARS v34 (octubre 2026) | 12 jugadores, ítem cada 6s y estadísticas | preset alternativo |
| Lucky Sprite Pillars | espíritus y poderes, bloques/objetos cada 5s | variante propia inspirada, poderes originales |
| Sprite Pillars | reglas independientes; revisar ficha exacta | no inventar poderes específicos |
| Reload Pillars | reinicios limitados según isla y creador | preset configurable, no regla universal |

Fuente primaria del estado completo debe provenir de la ficha del creador/código al momento de programar y quedar etiquetada `creator`, `version`, `sourceDate`, `confidence`, `referenceURL`. Estas referencias no autorizan copiar modelos, carteles, marcas ni mapa idéntico.

### Núcleo Pillars configurable
`PillarsRules`: `playerLimit`, `pillarCount`, `pillarGeometry`, `initialLoadout`, `itemIntervalTicks`, `itemPool`, `storm`, `canBuild`, `materialCap`, `respawnPolicy`, `winsToFinish`, `fallVoidY`, `platformEvents`, `rankedPolicy`.

**Prototipo Nexiph-style:** 8 plataformas separadas en anillo, 8 jugadores como máximo, ítem aleatorio por jugador cada 5s, caída al vacío elimina, rachas y rounds, último vivo gana. Después implementar 12-pillar Hive-style de 6s. El resultado de referencia pública no significa que nuestro mundo original sea una copia exacta de las reglas actuales en cada detalle.

**Reloj robusto:** no usar `setInterval` para otorgar ítems; usar `nextDropAtTick` con comparación al tick autoritativo. Si un frame tarda 2 s, generar los drops que corresponden sin duplicar. Cuando ronda terminó, no repartir nuevos objetos. Se recomienda un scheduler por jugador, no un único objeto que aparece fuera de su plataforma.

**Spawn:** cada plataforma con punto de nacimiento; prohibido spawn dentro de otra pieza; comprobación de distancias, cobertura y línea de visión. Antes de iniciar ronda todos deben estar listos; cuando jugador sale a mitad de partida, aplicar política explícita de desconexión.

**Ganador:** último jugador vivo según resolución autoritativa; si dos mueren en el mismo tick, desempate definido (empate / salud / orden determinista). No premiar 2 victorias por colisiones simultáneas.

**UI especializada:** tarjetas de próximo ítem, cooldown, contador vivo, nombre ronda, mapa mini de pilares, puntuación, victoria, reset y botón jugar otra vez. Prohibir que se presente «8 jugadores online» si son bots.

**Tests específicos:** timer exacto 5s y 6s, ítems solo a vivos, 2 muertes simultáneas, final de ronda, plataforma rota, eliminación por caída, construcción invadiendo spawn ajeno, reinicio parcial, XP idempotente, lag y retry.
