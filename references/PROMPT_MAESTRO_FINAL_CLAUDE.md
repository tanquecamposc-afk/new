# GUÍA DE USO DEL PAQUETE FINAL PARA CLAUDE

**Fecha de investigación:** 10 de noviembre de 2026. **Versión Epic de referencia:** Fortnite v43.00, Treasure Hunters. **Proyecto propuesto:** videojuego original «Nexus Royale». **Público técnico:** Claude Code / Claude.ai, ingeniería de gameplay y arte 3D.

## Lo que contiene esta entrega

1. **Prompt maestro completo:** objetivo, UX, gameplay, armas, movimiento, construcción, Ranked, Recarga, Pillars, pase, tienda, skins, misiones, Creativo, multijugador, gráficos y pruebas.
2. **Dossier de modos actuales:** reglas verificadas de la actualización v43.00, diferencias entre las islas Pillars, fechas, fuentes y restricciones.
3. **Prompts por fases:** mensajes consecutivos para producir y probar un videojuego progresivamente, sin reemplazar código funcional por una maqueta nueva.
4. **Láminas visuales originales:** portada, tablero de 8 interfaces y esquema técnico. Son conceptos creados para definir el estilo de TU juego, no capturas oficiales de Fortnite.
5. **Fuentes públicas verificadas:** enlaces a Epic Games, Fortnite Creative y fichas/versiones de los mapas para contrastar cambios posteriores.

## Lo que Claude debe hacer primero

**Paso 1.** Crear un proyecto de Claude Code (recomendado) o abrir un espacio de trabajo con archivos. Adjuntar el archivo `PROMPT_MAESTRO_FINAL_CLAUDE.md` o el DOCX/PDF de este dossier, junto con las imágenes originales.

**Paso 2.** Enviar el mensaje de inicio que aparece en `PROMPTS_POR_FASE_CLAUDE_FINAL.md`. Pedir primero un MVP jugable 3D en lugar de pretender que la totalidad de Fortnite puede crearse en un solo turno.

**Paso 3.** Tras cada fase, exigir pruebas: control del personaje, disparos, colisiones, resultado de partida, persistencia y navegación sin botones vacíos. Conservar versiones estables.

**Paso 4.** Para publicar online, añadir después un backend con partidas autoritativas, protección de cuentas, moderación, políticas de privacidad y reglas transparentes de compras. No presentar bots como jugadores reales.

## Hechos comprobados que evitan errores de diseño

- **Treasure Hunters:** comenzó el 1/11/2026; Crossbones Isle de 80 jugadores, espíritus nuevos y calendario especial de noviembre. Algunos cambios futuros anunciados aún no han sucedido al 10/11.
- **Nexiph THE PILLARS:** versión 121 registrada el 8/11/2026; 8 participantes y entrega de objeto aleatorio cada 5 segundos; construcción/impulsos y victoria del último jugador vivo. El diseño anterior del pilar central no debe imponerse.
- **Hive PILLARS:** 12 participantes, objeto aleatorio cada 6 segundos; conserva eliminaciones y victorias.
- **Lucky Sprite Pillars:** espíritus, habilidades y bloques aleatorios cada 5 segundos, pero sus detalles no deben fusionarse con Nexiph.
- **Arenas:** sistema de boxfights de 2026 (no el modo Arena de Battle Royale antiguo). El parche 43.00 incorpora indicador de rango en vivo.
- **Modos retirados:** Rocket Racing fue retirado el 1/10/2026; Ballistic y Festival Battle Stage, el 16/4/2026. No mostrarlos como disponibles actualmente.

## Qué es una referencia visual y qué no es

Los paneles del dossier son **arte conceptual original generado para este proyecto**. Su función es comunicar estilo, jerarquía, tipos de pantalla y campos de información. No prueban cómo es exactamente el menú vigente en Fortnite ni conceden licencia sobre sus personajes, logotipos, música, sonidos o assets. Se incluyen URL de referencia al final para consultar directamente material oficial.

## Criterios mínimos para considerar una función «completa»

- El botón o menú ejecuta una acción real verificable y no abre una pantalla vacía.
- Las reglas se aplican durante una partida, no solamente en texto o animaciones.
- Guardar equipo/skin/configuración afecta a lobby y partida después de reiniciar.
- XP, rango y recompensas se calculan por eventos y una concesión idempotente, no por texto estático.
- La UI indica claramente qué es funcional, local con bots, online real o trabajo pendiente.
- El juego usa assets originales o con permiso de uso, sin usar marcas y contenido protegido de terceros como propios.

---

# DOCUMENTACIÓN PRINCIPAL - PROMPT MAESTRO

# PROMPT MAESTRO PARA CLAUDE
## Desarrollo de un videojuego Battle Royale 3D completo inspirado en la profundidad funcional de Fortnite
**Versión de referencia VERIFICADA:** 10 de noviembre de 2026, Fortnite v43.00 / Treasure Hunters y última ficha de Pillars Nexiph v121 (8 nov 2026)  
**Nombre provisional original:** NEXUS ROYALE (nombre, logotipo, personajes y universo pueden cambiarse).  
**Idioma del juego:** interfaz español/inglés. **Idioma de desarrollo:** respuestas y explicaciones en español, nombres del código en inglés.

---

## ORDEN DE AUTORIDAD Y CONTROL DE ACTUALIZACIONES (CRÍTICO)

Esta versión incorpora la investigación en `DOSSIER_ACTUALIZACION_FORTNITE_PILLARS_NOV2026.md` y reemplaza expresamente todas las descripciones viejas de Pillars y listas antiguas de modos.

1. Las mecánicas de cada isla Creativo se identifican por **creador + código + versión**; no existe un único "Pillars" universal. Tomar la ficha pública actual como referencia del estado confirmado y conservar anuncios históricos solo como alternativas opcionales, nunca mezclarlos como verdad actual.
2. La fecha de referencia es **10/11/2026**. Fortnite Treasure Hunters / v43.00 empezó el 1/11/2026. No suponer que futuros eventos (12, 15, 22 nov o 5 dic) ya han sucedido.
3. Diferenciar **CONFIRMADO ACTUAL**, **HISTÓRICO**, **OPCIÓN ORIGINAL DEL PROYECTO**, **PENDIENTE DE VERIFICACIÓN**. Cada configuración indica `sourceDate` y `evidenceStatus`.
4. Rocket Racing (retirado 1 oct 2026), Ballistic y Festival Battle Stage (retirados 16 abr 2026) no se presentan como modos oficiales activos. Se pueden hacer minijuegos originales de carreras/FPS/ritmo como expansión opcional, jamás como réplica actual oficial.
5. Los pases, skins de colaboraciones, nombres de armas y personajes de Epic son **información de referencia**; crear contenido original y no utilizar imágenes, música, personajes o modelos de terceros sin licencia.
6. Si hay contradicción entre una fila antigua y este bloque, prevalece el dossier 10/11/2026.

## INSTRUCCIÓN PRINCIPAL: LEER TODO ANTES DE PROGRAMAR

Actúa como un equipo integrado de **director técnico de videojuegos, gameplay programmer, ingeniero de gráficos 3D, arquitecto multiplayer, diseñador de niveles, diseñador UX/UI, artista técnico, diseñador de economía/progresión, especialista QA y especialista de rendimiento**. Tu misión es construir conmigo un videojuego **JUGABLE**, de alta calidad y tercera persona, que reproduzca la amplitud de funciones y la sensación de uso de un shooter Battle Royale moderno de la categoría de Fortnite, pero con **marca, lore, personajes, imágenes, sonidos, mapas, modelos y demás recursos originales o debidamente licenciados**. No copies assets extraídos de Fortnite ni inventes que tienes las licencias de marcas, franquicias, música o skins de terceros. Las capturas suministradas son SOLO referencias visuales. Evita copiar pixel por pixel el diseño gráfico protegido; crea una identidad igual de pulida y un diseño propio.

**NO quiero una maqueta de botones:** quiero primero un núcleo 3D realmente jugable y, sobre esa base, todos los sistemas listados. Sé que un juego del tamaño de Fortnite requiere múltiples etapas y recursos. Por ello, no afirmes que todo quedó terminado cuando sólo entregaste pantallas. Implementa progresivamente con código real, pruebas y funcionalidad verificable. Nunca inventes servidores conectados, jugadores reales, compras exitosas, cuentas autenticadas o rankings online cuando no existan. Señala diferencias precisas entre *implementado, prototipo funcional, mock visual e infraestructura pendiente*.

**Restricción de ejecución según entorno:**
- Si estás dentro de **Claude.ai/Artifacts**, empieza con un prototipo de navegador autocontenido capaz de renderizar 3D e interactuar: estado persistente local, bots y partida local. Si el editor no admite paquetes externos, adapta la implementación a APIs disponibles y explica limitaciones. No prometas multiplayer real ni un servidor que el entorno no puede ejecutar.
- Si estás en **Claude Code** con acceso a terminal/repositorio, genera una estructura de proyecto real e instala/verifica paquetes compatibles, crea archivos, ejecuta build y pruebas. Prioriza **TypeScript + React + Vite + React Three Fiber / Three.js + @react-three/rapier o motor de física compatible**, Zustand o equivalente, y una capa backend opcional **Node + WebSocket + PostgreSQL**, elegidos tras verificar compatibilidad. Separa lógica del juego y presentación. Para multijugador usar validación y simulación autoritativa en servidor.
- Si elegimos **Unreal Engine 5** para un objetivo final de máxima fidelidad, adapta la misma especificación a UE5 con C++ y Blueprints: deja claro qué acciones requieren trabajo en el editor y contenido artístico. No trates características exclusivas de Unreal (Nanite/Lumen) como si funcionasen mágicamente en Three.js.
- No cambies de stack a mitad del proyecto sin un motivo y una migración explícitos.

**Prioridad absoluta:** (1) que compile, (2) que se pueda jugar y controlar, (3) que cada menú afecte al estado real, (4) calidad artística y UX, (5) nuevas funciones. Trabaja en incrementos que siempre mantengan una versión ejecutable.

---

# A. OBJETIVO Y EXPERIENCIA CENTRAL

Construye un shooter estilizado de acción en tercera persona con aspecto actual y profesional. El jugador abre el juego, entra al lobby, ve un personaje 3D animado, escoge modo, tamaño de equipo, Ranked o no Ranked, skins, armas cosméticas, compañeros y ajustes; pulsa **JUGAR** y entra en una partida con terreno 3D, combate, bots o jugadores reales según el ambiente, una tormenta que reduce el área, botín, HUD, construcción opcional, victoria/derrota, resultados, XP, recompensas, taquilla y regreso al lobby. Cada opción disponible debe funcionar realmente o estar marcada explícitamente como *en desarrollo*; NO mostrar tarjetas habilitadas que terminan en páginas vacías.

**Sensación visual deseada:** shooter 3D moderno con dirección artística estilizada de gama alta, colores vivos pero equilibrados, iluminación cinematográfica, amanecer/atardecer, nubes, sombras suaves, niebla ambiental, agua, superficies con materiales PBR, vegetación animada, partículas de impacto, efectos de energía, siluetas reconocibles, animación fluida, transiciones de interfaz, profundidad visual y diseño legible. Escalabilidad gráfica y modo rendimiento. La versión web no necesita fingir ser Unreal: debe verse lo mejor posible dentro de sus recursos reales.

**Perspectiva:** tercera persona con cámara sobre el hombro, controles mouse+teclado y gamepad cuando sea viable, soporte posterior de touch. FOV y sensibilidad configurables. El arma apunta al retículo con manejo correcto de obstáculos entre cámara y cañón. Un jugador podrá caminar, correr, esprintar, saltar, agacharse, deslizarse, escalar salientes, caer, recoger botín, equiparse, apuntar, disparar, recargar, construir, editar e interactuar.

# B. SISTEMA ACTUAL DE EXPERIENCIAS Y SELECTOR DE MODO — v43.00

**Modela familias jugables, NO una app distinta por cada combinación.** En JUGAR/Descubrir, seleccionar experiencia y luego opciones compatibles: `buildEnabled`, `rankedEnabled`, `teamSize`, `teamFill`, `partyPrivacy`, `mapRotation`, `playlistStatus`. El usuario puede cambiar dichas opciones sobre la misma experiencia; cada combinación obtiene un ID de cola y estadísticas correctamente separadas. Reglas indisponibles se deshabilitan con explicación. La disponibilidad de playlists reales cambia por temporada y región, así que mantén una matriz configurable y nunca declares disponibilidad universal.

### Experiencias actuales a representar como familias con jugabilidad independiente

| `experienceId` | Familia | Reglas y opciones fundamentales | Estado de referencia |
|---|---|---|---|
| `battle_royale` | Battle Royale | Battle Bus, isla actual de 80 jugadores en Treasure Hunters, aterrizaje, cofres, tormenta, construcción y Zero Build, toggle Ranked cuando corresponda, Solo/Dúo/Trío/Escuadrón según cola | Actual, Epic v43.00 |
| `reload` | Recarga / Reload | Isla más pequeña y rotación de mapas, partidas rápidas, hasta 40 jugadores según ficha oficial, reboots temporizados si algún compañero sigue vivo, eliminaciones aceleran reboot, respawns se deshabilitan al final, Build/Zero Build y Ranked | Actual, Epic v43.00 |
| `fortnite_og` | Fortnite OG | Recorrido nostálgico de Chapter 1, loot clásico, reglas OG, opción Zero Build, mapa y eventos propios; Starry Suburbs y Greasy Grove retornan en v43.00 | Actual; OG Pass anunciado para terminar 5 dic 2026 |
| `blitz_royale` | Blitz Royale | Partidas cortas, 32 participantes en diseño de referencia, mapa pequeño, armas iniciales/medallón, Blitz Level y boons/poderes, cofres y tormenta veloces | Actual v43.00, loot rotativo |
| `arenas` | Arenas Boxfights | 16 personas Solo (duelos 1v1) u 8 equipos Dúo (2v2), combates sucesivos, objetivos de 20 victorias Solo o 15 Dúo, modo challenge sin rango primero a 7; botín y rastreador de rango actualizables | Actual v43.00, Epic |
| `sprite_garden` | Jardín de Espíritus | Espacio de colección y exhibición de espíritus persistentes separado del combate BR | Actual, Epic 2026 |
| `creative` | Creativo / Descubrir | Creador de islas, dispositivos, partidas personalizadas y búsqueda de experiencias de comunidad; las islas Pillars van aquí como experiencias independientes | Actual |
| `save_the_world` | Salvar el mundo | PvE cooperativo, misiones, defensas, oleadas, héroes, esquemas, progresión y recompensas | Actual v43.00 |
| `lego_odyssey` | Supervivencia/aventura tipo Odyssey | Exploración, construcción y crafteo con universo y estética propios, cooperativo | Actual v43.00 |
| `lego_bricklife` | Vida social estilo Brick Life | Mundo persistente social y actividades interactivas | Actual |
| `festival_main` | Festival Main Stage | Minijuego musical con canciones propias/licenciadas, pistas instrumentales y puntuación de notas | Actual |
| `festival_jam` | Festival Jam Stage | Improvisación musical interactiva con audio propio/licenciado | Actual |
| `respawn_rumble` | Batalla de reaparición | PvP por equipos con respawn continuo y reglas de puntuación distintas a BR | Referencia de playlists, verificar al desplegar |
| `party_royale` | Social Party | Zona social y emotes; verificar la cola antes de anunciar estado en vivo | Referencia de playlists |

**Experiencias retiradas:** no listar `rocket_racing`, `ballistic` ni `festival_battle_stage` como experiencias oficiales activas. Son referencias históricas. Si se implementa un minijuego propio inspirado en carreras o shooter táctico, usar `original_racing` / `original_tactical` bajo categoría **EXTRAS ORIGINALES**, no Fortnite actual.

### Matriz de modos de combate (aplicar SOLO donde las colas existan)

- Battle Royale: Construcción normal, Zero Build; para cada cual opción Ranked cuando habilitada; Solo, Dúos, Tríos y Escuadrones según playlist activa. Para la simulación local puede usarse 8-24 bots primero, con objetivo final de escala profesional bajo servidor.
- Reload: Construcción o Zero Build, Ranked configurable, Solo/Dúos/Escuadrones y posibles Tríos cuando estén habilitados. Solo no puede usar la misma reaparición por compañero que Dúos o Squad: implementar política de reinicio específica del modo/cola y no inventarla.
- OG: Construcción y Zero Build, eventos y rotaciones OG, sin asumir Ranked OG activo.
- Arenas: SOLO y DUOS con combate en salas que se regeneran, 1v1/2v2, progresión y seguimiento de estado; no confundir con el antiguo Arena BR.
- Creativo: `pillars_hive`, `pillars_nexiph`, `pillars_sprite`, `pillars_lucky_sprite`, `pillars_rng`, `pillars_reload_skri`, `pillars_reload_jogo`, además de plantillas originales propias de 1v1, Zone Wars, Boxfight, parkour y minijuegos. Los códigos externos son **referencias para investigar**, no instrucciones de importar su propiedad intelectual.

### Contrato técnico del catálogo

```ts
type EvidenceStatus = 'verified_current'|'historical'|'original_proposal'|'unverified';
type ReleaseStatus = 'playable'|'prototype'|'locked_coming_soon'|'retired_reference';
type PartySize = 1|2|3|4;
interface GameExperience {
  id: string;
  group: 'official_reference'|'community_reference'|'original';
  displayName: string;
  sourceCode?: string; // código de isla externo, solamente para trazabilidad
  creator?: string;
  sourceVersion?: string;
  sourceDate: string;
  evidenceStatus: EvidenceStatus;
  implementationStatus: ReleaseStatus;
  variantConfig: {
    teamSizes: PartySize[];
    supportsBuild: boolean;
    supportsZeroBuild: boolean;
    supportsRanked: boolean;
    maxPlayers: number;
    respawnPolicy: 'none'|'team_reboot'|'limited_tokens'|'immediate'|'round_reset';
    lootIntervalSeconds?: number;
    winCondition: 'last_survivor'|'target_wins'|'score'|'objective';
  };
}
```

Los valores de simulación del juego propio pueden diferir por performance; documentar claramente diferencia **"referencia original" vs "implementado"**. Categorías de tienda, pestañas, botones y recompensas deben derivarse de datos configurables y no estar hardcodeados en múltiples pantallas.

# C. CICLO DE PARTIDA BATTLE ROYALE

Crea una máquina de estados explícita `LOBBY -> MATCHMAKING -> LOADING -> WARMUP -> DROP_SEQUENCE -> ACTIVE_MATCH -> FINAL_CIRCLE -> RESULTS -> RETURN_TO_LOBBY`. La opción `PRACTICE` puede saltar las fases de matchmaking y lanzamiento.

1. **Preparación:** vista de mapa y ruta aérea, tiempo de espera, contador de participantes, opciones de aterrizaje, elección de skin; matchmaking real o relleno por bots según versión.
2. **Bus/vehículo aéreo y salto:** avión/autobús futurista original, ruta parametrizada, salto por tecla, caída libre con gravedad, planeador desplegable, transición de animaciones.
3. **Aterrizaje:** colisión con terreno, reducción de velocidad, recogida de objetos del escenario, cofres, suelo con loot, NPCs y contenedores.
4. **Supervivencia:** 100 puntos de salud de base, escudo adicional configurable, consumibles, daño por disparo/explosión/caída/tormenta, curación, derribo en modos de equipo, reanimación, eliminación, tarjetas de reaparición en BR si se habilitan terminales de reinicio.
5. **Tormenta:** círculos de zona seguros generados por semilla, fases con espera/cierre/pausa, temporizador, daño por segundo, interfaz de aviso, mapa con zona anterior/nueva, minimapa, borde visible del área peligrosa, sincronización con servidor.
6. **Fin:** victoria del último jugador/equipo vivo (o regla alternativa configurada), pantalla de victoria/derrota, estadísticas, eliminaciones, posición, daño, supervivencia, XP, rango y recompensas, botón volver a lobby y volver a jugar.
7. **Espectador y replay:** primero espectar bots/compañeros; luego eventos para repeticiones y cámara libre si el motor permite.

El número de jugadores debe ser configurable. Para una temporada inspirada en noviembre de 2026, podría elegirse 80, pero el desarrollo local debe soportar un número reducido de bots para funcionar fluidamente. Un contador con 80 jugadores NO debe implicar que hay 80 humanos si no están conectados.

# D. SISTEMA DE MOVIMIENTO Y FÍSICA

- `WASD`: movimiento relativo a cámara; mouse: girar cámara; pointer lock liberable con `Esc`.
- `Space`: saltar; `Shift`: sprint con velocidad superior y energía si se usa resistencia; `Ctrl/C`: agacharse o deslizarse según estado.
- Mantling o escalada de bordes, descenso, nado en agua si se implementa, cuerdas/tirolinas, impulsos, rebotes, caída con daño configurable y planeador.
- Colisiones robustas con suelo, árboles, edificios, piezas construidas, objetos y otros personajes; evitar atravesar paredes y caer por debajo del mapa.
- Cámara suave con zoom al apuntar, colisión de cámara contra paredes, opción de hombro, FOV regulable y crosshair dinámico.
- Animaciones de idle, correr, sprint, salto, caída, aterrizaje, apuntar, recargar, disparar, construir, editar, curar, recibir impacto, caer derribado, bailar/emotes y victoria; usar placeholders originales si no hay rig/animaciones adecuados, sin fingir assets definitivos.
- Controles remapeables, controles básicos para mando y esquema de entrada desacoplado de sistemas de juego.

# E. COMBATE, ARMAS E INVENTARIO COMPLETO

Crear un **WeaponData Registry**: `{id, family, rarity, magazineSize, reserveAmmoType, damageBody, damageHead, fireRateRPM, reloadTime, range, spread, recoil, falloff, projectileSpeed?, splashRadius?, equipTime, adsMultiplier, icon, visualModel, audioId}`.

**Familias iniciales y ampliables:** rifles de asalto automáticos y de ráfaga; SMG; escopeta de corredera, táctica y automática; pistolas; revólver; rifle de francotirador; tirador designado; rifle pesado; lanzacohetes; granadas; arcos; cuerpo a cuerpo; picos; armas míticas con habilidades especiales; trampas y utilidades. No copiar modelos, nombres exclusivos o sonidos protegidos de Fortnite.

**Reglas:**
- Rarezas: común, poco común, rara, épica, legendaria, mítica y exótica con colores consistentes.
- Impactos hit-scan para armas adecuadas, proyectiles físicos para explosivos, daño por distancia, multiplicador de cabeza, munición, cadencia, retroceso vertical/horizontal, dispersión dinámica, apuntado ADS, recarga, tiempo entre tiros, trazadoras, muzzle flashes, impactos por superficie, números de daño, feedback sonoro, indicador direccional, kill feed.
- Inventario de **cinco casillas rápidas** más herramientas de recolección / elementos contextuales, arrastrar/soltar cuando sea viable, equipamiento con teclas 1–5, recoger/intercambiar/soltar objetos, stacks, ammo, consumibles, límites y rareza.
- Curación: botiquines, vendas, pociones pequeñas/grandes, consumibles de salud/escudo, proyectiles o zonas de curación. Utilidad: granadas de impulso, gancho, señuelos, sensores, objetos de movilidad, escudos portátiles.
- Botín distribuido por mapas, cofres con probabilidades configurables, cajas de munición, suministros, botín de eliminaciones, armas en suelo, venta mediante NPC sólo donde aplique.
- Balance parametrizable por modo/temporada; establecer estadísticas provisionales originales, cubrirlas con tests y calibrar después.
- Para online, servidor valida daño, posición, tiempo entre disparos, munición, línea de visión, inventario y velocidad. Nunca confiar en datos de combate enviados por el cliente.

# F. CONSTRUCCIÓN Y EDICIÓN

Recrear la **profundidad mecánica** de las construcciones competitivas sin usar assets propietarios:
- Cuatro piezas: `wall`, `floor`, `ramp/stair`, `roof/cone`.
- Materiales: madera, piedra, metal, con distintos puntos de vida, resistencias, tiempos de construcción y apariencia.
- Recolección con herramienta/pico; cosechar materiales de árboles, rocas y estructuras, límite por material, contador en HUD, efectos de golpe, destrucción y drops.
- Preview translúcido válido/inválido, grid snapping, rotación, comprobaciones de colisiones, distancia máxima, coste real y validación.
- Estados de construir, editar, confirmar, resetear, reparar y destruir. Sistema de edición por celdas (3x3 en paredes; esquemas coherentes para suelos y techos), edit preview, configuración de confirmación rápida.
- Propiedad de estructura en partidas, daño a piezas, materiales, y opción de destrucción/cascada estructural cuando una construcción pierde apoyos.
- Keybinds remapeables (por defecto `Q` pared, `E` suelo, `R` rampa, `T` techo durante modo construcción, pero resolver conflicto con recargar/interactuar con contextos explícitos), opción de edición y toggle build.
- Modo Zero Build y Reload Zero Build deshabilitan **lógica y controles de construcción**, no sólo esconden el botón.
- Creativo permite colocar piezas libremente con permisos de edición de isla, mientras que una partida competitiva consume recursos.

# G. MODOS RECARGA / RELOAD

Implementar el núcleo del modo Recarga:
- Mapa compacto y más denso, generación de botín y combates rápidos.
- Equipos pequeños, configurable dúos y escuadrones.
- **Mientras sobreviva al menos un compañero, los eliminados entran a un contador y reaparecen**; el contador depende del modo y de la etapa. Se puede disminuir por acciones del equipo (derribos/eliminaciones/wipes).
- Si todo el equipo es eliminado, queda fuera definitivamente.
- Desactivar reinicios en fase final; avisar en HUD.
- Reaparición en el aire con planeador, loadout básico y protección anti-spawn abuse; todos los temporizadores y estados validados por servidor si online.
- Variantes construcción / Cero construcción / Ranked.
- No fijar como eternos los segundos de una publicación antigua: permitir ajustar tiempos por `seasonConfig` y diferenciar duos/squads.

# G2. SISTEMA PILLARS ACTUALIZADO: ISLAS DISTINTAS (10 NOVIEMBRE 2026)

**La descripción anterior de 12 pilares, respawn por 30 segundos y loot cada 6s NO representa "Pillars" genéricamente.** Implementa una familia `PillarsEngine` reusable y presets independientes, cada uno con parámetros propios. Los mapas y assets que crees deben ser ORIGINALES.

### Presets verificados según las fichas públicas, no mezclar

1. **`pillars_hive`**, creador `hive`, código `7786-0958-2481`, versión 34 publicada 28–29 octubre 2026. **12 jugadores FFA, objeto aleatorio cada 6 s, rondas rápidas, gana el último en pie; guardar victorias y eliminaciones**. No atribuir mecánicas de reaparición a esta isla sin evidencia.
2. **`pillars_nexiph`**, creador `nexiph`, código `2724-4064-5480`, versión **121 del 8 noviembre 2026**. Ficha actual: **8 jugadores FFA, objeto aleatorio cada 5 s, construcción e impulsos hacia pilares rivales, eliminar empujando/derribando, rounds rápidos, último en pie**. Comunicado del 6 noviembre: **"ORIGINAL PILLARS IS BACK"**, con loot actualizado. El gran mapa central, Dragon Bat, sifón +50 y Rebirth Supreme fueron anunciados en una **actualización HISTÓRICA intermedia de meses anteriores**, pero NO se deben imponer como características actuales tras la vuelta al original. Pueden existir en el proyecto como un preset `pillars_nexiph_legacy` desactivado por defecto.
3. **`pillars_sprite`**, creador `knzi`, código `0673-9062-5656`, versión 93 del 4 noviembre 2026: **12 jugadores FFA, bloque aleatorio cada 5 s, último en pie**. Usar criaturas originales y sus poderes solamente en variantes que los anuncian explícitamente, no asumir que todas las "Sprite Pillars" funcionan igual.
4. **`pillars_lucky_sprite`**, creador `luxy2x`, código `6641-8273-9828`, versión 16 del 14 octubre 2026: **12 jugadores FFA, espíritus personalizados coleccionables, poderes, bloque aleatorio cada 5 s, estadísticas en tiempo real**. Su comunidad anunció *Fused Sprites*, pero no atribuir sin prueba receta/costes específicos de fusiones.
5. **`pillars_rng`**, creador `wzl`, código `6777-5733-5416`, actualización de noviembre 2026: **12 FFA, objetos cada 6 s, espíritu aleatorio por ronda, desbloqueo de espíritus al ganar**.
6. **`pillars_reload_skri`**, creador `skri`, código `1387-6048-1372`, publicado 30 octubre 2026: **12 FFA, objeto cada 5 s, dos reboots en tu propio pilar, tormenta, monedas/skins de pilares, rank y estadísticas persistentes**. Este es un modo distinto a PILLARS de Hive y THE PILLARS de Nexiph.
7. **`pillars_reload_jogo`**, creador `jogo`, código `7473-0088-9373`, versión 15 del 29 octubre 2026: **12 FFA, objeto cada 6 s, una reaparición en primeros 30 segundos de ronda**, último en pie. NO generalizar esta regla de respawn a los demás.
8. **`pillars_custom_modifiers`**, inspirado en la isla de AgentK `4472-3232-2181` (actualización julio 2026): mods opcionales por ronda **Normal, Gravedad Cero, Solo Francotiradores, Zona Aleatoria, Suelo de Lava**. Es variante independiente y opcional.

### Máquina de estados imprescindible

`waiting -> matchmaking_or_bots -> warmup -> spawn_assignment -> countdown -> active_round -> elimination_or_reboot -> final_circle_or_sudden_death -> round_results -> rewards_save -> next_round_or_lobby`.

Funciones reales: spawn simétrico; al comenzar asignar pilar y protección breve opcional configurada; colisión y física real de empujes/impulsos; cálculo de caída al vacío por umbral de altura; destrucción y piezas de construcción habilitables por preset; loot aleatorio servido por servidor e interfaz con cuenta atrás; selección determinista por semilla para tests y variedad ponderada por categorías; armas útiles y objetos de desplazamiento; políticas de inventario/capacidad; cámara espectador tras perder la última vida; ronda/series, tabla de victorias/daño/eliminaciones y anti-camping con tormenta sólo donde aplique.

`limited_tokens` define `initialTokens`, `allowedUntilSeconds`, `rebootDelay`, `spawnPillarId` y `invulnerabilitySeconds`. Hive/Nexiph no tendrán por defecto respawn. Skri: `initialTokens=2` por anuncio. Jogo: `initialTokens=1`, `allowedUntilSeconds=30`. Al perder una vida no reaparecer de forma automática en presets sin respawn. `lastSurvivor` contempla 1 jugador humano + bots de prueba. Una desconexión debe liberar correctamente slot/pilar. Verificar en tests 1, 2, 8 y 12 jugadores.

### Módulos escalables a implementar

`PillarMapGenerator`, `PillarSpawnAllocator`, `RoundRulesEngine`, `RandomLootScheduler`, `RandomBlockEffectResolver`, `SpritePowerComponent`, `KnockbackPhysics`, `VoidKillTrigger`, `RebootTokenSystem`, `StormModifier`, `RankPersistence`, `PillarCosmetics`, `FusedSpriteSystem` (solo prototipo original, receta propia), `RoundLeaderboard`, `RoundSpectatorUI`, `PillarsEventBus`.

### Diseño de UX específico

- Pantalla de entrada mostrando **variante seleccionada, 8/12 players, tiempo entre objetos (5/6s), reglas de vidas, construir sí/no, rango y progreso solo en preset donde aplique**.
- Durante la ronda: cuenta atrás para siguiente item, icono del item recibido, número de reboots, rango/racha donde exista, reloj y contador de jugadores, efecto visual del knockback y cámara de eliminación.
- Resultados: banner ganador, estadísticas persistidas, XP real del proyecto, progreso de recompensas, "Jugar otra ronda" y "Salir".
- Editor Creativo: plantilla propia Pillars con controles para columnas, radios, alturas, cubiertas, zona central opcional, spawn de objetos, tormenta, construcción, modos de velocidad, gravedad y reboots. No atribuir el diseño opcional de gran pilar central a la variante Nexiph actual.

### Ejemplo de presets de lógica (números de fuente confirmada)

```ts
const pillarPresets = {
  hiveClassic: { maxPlayers:12, lootIntervalSeconds:6, respawnPolicy:'none', winCondition:'last_survivor', sourceVersion:'34' },
  nexiphOriginal: { maxPlayers:8, lootIntervalSeconds:5, respawnPolicy:'none', supportsBuild:true, sourceVersion:'121' },
  spriteBlocks: { maxPlayers:12, blockIntervalSeconds:5, respawnPolicy:'none', sourceVersion:'93' },
  luckySprite: { maxPlayers:12, blockIntervalSeconds:5, collectiblePowers:true, sourceVersion:'16' },
  skriReload: { maxPlayers:12, lootIntervalSeconds:5, respawnPolicy:'limited_tokens', initialTokens:2 },
  jogoReload: { maxPlayers:12, lootIntervalSeconds:6, respawnPolicy:'limited_tokens', initialTokens:1, allowedUntilSeconds:30 }
};
```

Fuente de verdad: consultar el dossier y sus enlaces antes de diseñar pantallas. No inventar fórmulas de rangos, recompensas premium, tasas de drop ni poderes exactos en mapas ajenos si no hay evidencias públicas; definir equivalentes originales y etiquetarlos como decisiones propias.

# H. CLASIFICATORIAS / RANKED

Rangos originales estructurados de forma equivalente en complejidad: Bronce I/II/III, Plata I/II/III, Oro I/II/III, Platino I/II/III, Diamante I/II/III, Élite, Campeón y rango máximo tipo Leyenda. Se pueden usar estos nombres genéricos, pero iconografía original. **Guardar progresión por familia, como mínimo BR, Zero Build y Reload, sin mezclar rangos.** Fuente Epic para rangos: Bronce I-III, Plata I-III, Oro I-III, Platino I-III, Diamante I-III, Élite, Campeón, Unreal. La fórmula exacta es interna de Epic: la versión del proyecto usará una fórmula propia claramente descrita y no declarará equivalencia oficial. Un jugador nuevo necesita completar Outlast 500 players antes de activar Ranked en Fortnite real; en este juego, el tutorial competitivo puede utilizar un desbloqueo propio. En v43.00 Arenas muestra un indicador en vivo de ganancia/pérdida porcentual durante partidas Ranked.**

- Puntuación de clasificación a partir de colocación final, eliminaciones (mayor peso al final), daño, habilidad del rival, fase de tormenta alcanzada, victorias y penalidades de abandono.
- Mostrar barra de progreso antes/después, variación positiva/negativa explicable, rango nuevo, escudo de pérdida de la primera partida si se configura, recompensas de temporada, tabla de clasificación y temporadas competitivas.
- Matchmaking por habilidad/MMR cuando haya servidores y población real; en versión local etiquetar claramente clasificación de práctica, no ranking online real.
- Selección Ranked toggle en lobby; colas y restricciones, verificaciones de cuenta básicas y antitrampas.
- Sección **Competir** con torneos como sistema futuro, requisitos de acceso, calendario, reglas, clasificación y recompensas. No simular premios reales.

# I. ESPÍRITUS / SPRITES / COMPAÑEROS Y PODERES

Incluir un sistema original de **pequeños compañeros mágicos coleccionables** (llamarlos `wisps` o un nombre propio, no usar diseños oficiales). Algunos existen como coleccionables con poderes, otros como compañeros meramente cosméticos.

- Registro `CompanionDefinition` con rareza, familia, nivel, habilidad, cooldown, condición de obtención, icono, modelo y animación.
- Habilidades de ejemplo: escudo temporal, regeneración de escudo, invisibilidad breve, aumento de movilidad, radar de cofres, salto extra, daño extra limitado, revelado de amenazas, curación pasiva balanceada.
- Aparecen en botín/eventos de mapa y se pueden **extraer** en terminales o al finalizar condiciones de partida para añadirlos a la colección persistente; personalización/variantes cosméticas y niveles.
- Máximo de compañeros/poderes equipados configurable; límites competitivos y compatibilidad Ranked por reglas.
- Menú Colección con cartas, progreso, desbloqueo, asignación de poder, efectos VFX y seguimiento de nuevos descubrimientos.
- Registrar todo en eventos de XP y misiones.

# J. MAPAS, MUNDO, ZONAS Y EVENTOS

- Isla principal grande (escala ajustable), 6 biomas: bosques, ciudad, montañas, costa, desierto y nieve; vegetación, agua, carreteras, senderos, pueblos, puentes, puertos y puntos de interés con nombres originales.
- Isla compacta de Recarga y mapa OG separados, además de isla de entrenamiento y plantillas de Creativo.
- Generación de terreno coherente, texturas/materiales de suelo, normales, piedras y árboles instanciados, edificios con interiores y loot, señales y carteles únicos, minimapa 2D y mapa a pantalla completa con zoom y pings.
- Interacciones: puertas, cofres, contenedores, cofres de tesoro, NPCs, máquinas o terminales sólo donde exista gameplay; tirolinas/cañones de desplazamiento, vehículos con controles básicos.
- Fenómenos atmosféricos y hora de día; partículas de polvo/lluvia opcionales; sonido ambiental 3D.
- Eventos configurables por calendario: desafíos de fin de semana, rotación de botín, mini-boss, recompensas, POIs temporales, cambios de mapa y eventos de temporada.
- Sistema data-driven `SeasonManifest`, sin reescribir toda la aplicación para cambiar una temporada.
- Bots con percepción, navegación, cover, saqueo, cambio de arma, combate, huida de tormenta, rotación por zonas, disparos con error humano configurable y decisiones por dificultad. Si se usa pathfinding, confirmar que no atraviesen obstáculos.

# J2. TEMPORADA REAL DE REFERENCIA Y SEPARACIÓN DE FECHAS (v43.00)

**VERIFICADO AL 10 NOV 2026**: *Treasure Hunters* comenzó el **1 de noviembre**. Mapa de referencia `Crossbones Isle` para **80** jugadores; cañones como movilidad, tesoros/cofres especiales, nuevas zonas, poderes del evento, encuentro y zonas de capitanes. Eventos `Captain's Day`: 1 y 8 de noviembre ya transcurridos; 12, 15 y 22 noviembre aún **futuros**. `Mastery Mondays` y `Treasure Hours Saturdays` son eventos configurados con calendario, sin suponer detalles ni horarios no publicados. Evento de cierre de Chapter 7 anunciado para **5 dic** (futuro al corte). 

**Contenido con licencia usado SOLO como referente**: personajes y poderes basados en One Piece, artistas musicales, anime, etc. El videojuego original inventa capitanes, archipiélago, armas especiales, tesoros y poderes propios con mecánicas análogas. No usar sprites, voces, canciones, marcas ni nombres licenciados ajenos sin autorización. Aun si se prototipan menús, dejar los espacios de arte como material original o placeholers bien identificados.

**Pases y progresión multi-experiencia**: Battle Pass / OG Pass / Music Pass / LEGO Pass, tienda, moneda, Club, misiones y temporadas; la XP de cualquier experiencia puede progresar los pases activos según sus tablas independientes. Separar pase de juego (progresión) de pases exclusivos de islas comunitarias (cosméticos/locales). Novedades oficiales del **4 nov** anuncian cambios del Club y final del OG Pass **a partir del 5 de diciembre**, NO vigentes el 10 nov. Soporte de cosméticos acompañantes, estilos, vistas previas, progreso simultáneo, reglas free/premium y regalo **sólo simulado o real si hay backend/autorización**.

**Misión técnica v43.00 para modo Creativo**: soporte opcional de colocación procedural, generación de vegetación/prefabs, herramientas de diagnóstico de rendimiento, progresión de misiones persistentes y pruebas. Epic añadió PCG y amplió herramientas MCP en UEFN; si el proyecto usa Three.js, recrear ideas equivalentes y no atribuirle APIs exclusivas de UEFN. 

# K. LOBBY Y NAVEGACIÓN PRINCIPAL (PRIORIDAD VISUAL MUY ALTA)

El juego debe abrir directamente un lobby de calidad con **personaje 3D al centro**, iluminación, animación idle, fondo de isla/estación futurista original, partículas sutiles, banda sonora original o libre, y barra superior:

`JUGAR | TAQUILLA | TIENDA | PASES | MISIONES | COMPETIR | CARRERA | MONEDA`.

**JUGAR:**
- Tarjeta del modo actual, botón grande `JUGAR` / `CANCELAR` / `LISTO`, selector modo, Ranked on/off donde corresponda, tamaño equipo, llenar grupo o no, mapa si aplica, región, privacidad, nombre de temporada, amigos conectados si hay backend.
- Carrusel de modos (`Battle Royale`, `Cero construcción`, `Recarga`, `Ranked Recarga`, `Ranked BR`, `OG`, `Creativo`, `Entrenamiento`), buscador, secciones *para ti*, *favoritos*, *más jugados*, *mis islas*, *recientes*.
- Panel derecho de equipo/party hasta 4 jugadores, estado ready, invitaciones y friend list, en local mostrar compañeros simulados claramente como bots si se incluyen.
- Indicadores de nivel/XP, desafíos, monedas, noticias y promociones de temporada.

**Estilo UI:** fondo azul oscuro/gradientes suaves de alto contraste, tarjetas grandes con imágenes 16:9, etiquetas destacadas, botones redondeados, transiciones de 150–300 ms, motion cuidado, microanimaciones, sombras sutiles, tipografía display fuerte y tipografía de texto legible, accesibilidad, escalabilidad responsive. Diseña una identidad propia; no calques logos de Fortnite, ni uses screenshots reales como backgrounds distribuidos.

# L. TAQUILLA, SKINS, COSMÉTICOS, EMOTES

Crear `CosmeticCatalog`, inventario persistente y pantalla de detalle con **previsualizador del personaje 3D giratorio**, zoom, iluminación de estudio, filtros (favoritos, rareza, adquiridos, conjunto, recientes), buscador, equipar/guardar presets, aleatorizar, previsualización de emotes.

**Categorías:** skins/outfits originales, estilos alternos, mochilas, picos/herramientas, planeadores, estelas, wraps de armas, emotes/bailes, sprays, emoticonos, pantallas de carga, banners, pistas de audio originales, calzado, vehículos y acabados, compañeros/mascotas, accesorios, poses/animaciones, perfiles y títulos. Mostrar rareza y compatibilidad por modo.

**Biblioteca inicial creada por el equipo:** al menos 12 conceptos de skins originales estilizados (héroes sci-fi, exploradores, aventureros, personajes urbanos, cyborgs, criaturas cartoon), cada una con nombre, color, rareza, descripción, variantes y miniatura original. Si faltan modelos glTF, representar los conceptos mediante avatares paramétricos 3D diferentes y declarar qué recursos faltan para la calidad final. **Ninguna skin reconocible de Marvel, One Piece, Disney, Fortnite u otros titulares sin licencia.**

# M. TIENDA, MONEDA Y CUENTAS

- Tienda con varias secciones reales: destacados, diarios, packs, sets, objetos individuales, compañeros, estilos y ofertas de temporada; navegación tipo catálogo, búsqueda y filtros.
- Tarjetas con render 3D/miniatura, rareza, precio, descuento simulado coherente, vista previa, emotes, confirmación de compra con moneda **ficticia original** (`Nexus Coins`), saldo y carrito si hace sentido.
- Un monedero persistente offline para prototipo (sin pagos reales). API backend con saldos y transacciones atómicas para online. Nunca permitir saldo negativo ni duplicación de compras; mostrar errores claros.
- Rotación de tienda por fecha y cronología basada en configuración, vitrina personalizable, historial de adquisiciones, regalos a amigos **sólo cuando haya autenticación/servidor**, devolución controlada, pedidos y recibos simulados claramente marcados como demo.
- Passes y suscripción premium como productos de **demostración**, no cobrar dinero real sin integración legal/comercial aprobada.

# N. PASE DE BATALLA Y RECOMPENSAS

- Sistema completo y configurable de temporada con 50/100 niveles según tamaño, progreso de XP, track gratuito, track premium, páginas de recompensas, requisitos de nivel, vista 3D de cada ítem, estado bloqueado/disponible/reclamado.
- Tipos de recompensa: skins, estilos, gestos, picos, mochila, planeador, moneda virtual ficticia, insignias, banners, iconos, compañeros, estelas, efectos, música original.
- `XPService` otorgando XP por supervivencia, eliminaciones, objetivos, misiones, exploración, desafíos, victorias y descubrimiento de islas; evitar farming infinito con cooldowns y topes.
- Botón reclamar, animación de desbloqueo, notificaciones, persistencia, prevención de doble claim, cálculo de niveles según una tabla XP definida, recompensas bonus y recompensas de eventos.
- Mostrar temporada actual, fecha fin, retos destacados, arte de temporada original y página de progreso.
- Dejar una base para varios tipos de pases (principal, música y otros minijuegos), sin fingir que todos están disponibles.

# O. MISIONES, DESAFÍOS, LOGROS Y CARRERA

- `QuestDefinition` con id, grupo, objetivo, progreso, meta, recompensa XP/item, condiciones, fecha inicio/fin, repetición y modo válido.
- Grupos: **diarias**, **semanales**, **hitos/milestones**, **historia/temporada**, **entrenamiento**, **Recarga**, **Ranked**, **Creativo**, **evento** y **progresión de colección**.
- Ejemplos: abrir 3 cofres, hacer 500 de daño, sobrevivir 5 círculos, eliminar 3 enemigos con escopeta, recolectar 250 materiales, editar 10 piezas, completar 2 partidas de Recarga, llegar al top 10, encontrar un espíritu.
- El progreso cambia en respuesta a **eventos reales del juego** (`ChestOpened`, `DamageDealt`, `MatchEnded`, `BuildPlaced`, etc.) y persiste. No usar barras falsas que suben al hacer clic en la misión.
- Pin de misiones en partida, HUD resumido, UI de 3 misiones fijadas, notificación de progreso, recompensa reclamada y comprobación para evitar duplicados.
- **CARRERA:** perfil, victorias, top 10, eliminaciones, K/D si aplica, partidas, daño, tiempo, mejores resultados por modo, historial, medallas, logros, replay disponible si existe y ranking competitivo real/local rotulado.

# P. CREATIVO: EDITOR DE ISLAS

Implementa un editor dentro del juego, no sólo una página de tutorial:
- Crear nueva isla desde plantillas (vacía, bosque, ciudad, combate de cajas, parkour), nombre y descripción, guardar/cargar desde IndexedDB/localStorage al principio; servidor+DB después.
- Modo Crear vs Modo Jugar separados, inventario de contenido por categorías (estructuras, prefabs, galerías, props, armas, pickups, NPCs y dispositivos).
- Herramientas: seleccionar, colocar, mover, rotar, escalar cuando sea apropiado, duplicar, eliminar, múltiples selecciones, grid snap, undo/redo, categorías y buscador.
- Dispositivos configurables: spawn, checkpoint, temporizador, trigger, contador, botón, teletransportador, marcador de puntaje, zona de daño, objetivo, barrera, dispensador de armas, bot spawner, zona de captura, win condition.
- Variables y eventos sencillos: `OnEnter -> AddScore`, `OnButtonPressed -> OpenDoor`, `OnTimerEnd -> EndRound` con sistema de eventos reutilizable; UI de opciones por dispositivo.
- Configurar reglas de isla: máximo jugadores, equipos, construcción sí/no, inventario inicial, tiempo de partida, respawn, daño, gravedad, salud/escudo, bots, victoria por puntuación o eliminación.
- Probar al instante y volver a editar; compartir por código **local demo** primero, publicar online sólo con backend de almacenamiento y permisos implementados.
- Crear experiencias base: 1v1 build fights, box fights, zone wars, parkour con checkpoints y galería libre.

# Q. SOCIAL, CUENTAS Y MULTIJUGADOR

**Fase local:** perfiles ficticios guardados localmente, bots claramente identificados, sin afirmar que se invita a personas reales.

**Fase online con servidor:** registro/inicio de sesión seguros, sesiones, personajes y cosméticos de cuenta, amigos, solicitudes, presencia, party hasta 4 personas, invitación/aceptar/rechazar, ready check, regiones, cola matchmaking, emparejamiento, salas, equipos, mensajes y chat con moderación básica y privacidad.

Arquitectura multiplayer:
- **Servidor autoritativo** para movimiento crítico, daño, inventario, tormenta, resultados y recompensas; snapshot/tick configurable, interpolación de personajes, predicción local y reconciliación para movimiento.
- Control de lag/latencia, desconexión/reconexión, ping, pérdidas de paquetes, estados de sala, spawn seguro y separación entre lobby server y match server.
- Bot service para rellenar matches sin fingir humanos; configuración escalable por server budget.
- Antiabuso: validación de velocidad, fire rate, colisiones, posiciones, acciones, economía y XP; rate limits y registros de error. Nunca poner secretos de backend en el navegador.
- Privacidad: controles de amistades, invitaciones, bloqueo y reportes, opciones de chat, y respeto de datos personales. No crear pagos reales ni sorteos de dinero sin requisitos legales.

# R. CONFIGURACIÓN COMPLETA Y ACCESIBILIDAD

Pantalla **CONFIGURACIÓN** con secciones y valores con efecto real; persistir por usuario:
1. **Pantalla/Vídeo:** fullscreen/windowed cuando browser lo permita, resolución interna, render scale, FPS cap, VSync si el entorno lo admite, modo Rendimiento/Equilibrado/Alta calidad, mostrar FPS/ping, motion blur opcional.
2. **Gráficos:** presets bajo/medio/alto/épico si soportados, sombras, resolución de sombras, antialiasing, distancia de dibujo, LOD, follaje, calidad de texturas, partículas, niebla, agua, reflejos, bloom, exposición, oclusión ambiental, color grading, postproceso, iluminación y optimización dinámica. No mostrar opciones incompatibles como si funcionaran.
3. **Audio:** volumen master, música, efectos, voz, UI, chat, salida de sonido, silencio en segundo plano, indicadores visuales de sonido.
4. **Juego:** idioma, interacción y saqueo, correr automáticamente, sprint por toggle, apuntar toggle/hold, autoabrir puertas si se implementa, vibración, región, tutorial.
5. **Interfaz/HUD:** tamaño, escala, minimapa, brújula, retículo, números de daño, kill feed, indicador de red, mostrar FPS, subtítulos, opacidad y zona segura.
6. **Mouse y teclado:** sensibilidad horizontal/vertical, ADS, invert Y, atajos, keybindings totalmente reasignables, conflictos resueltos, restaurar ajustes.
7. **Mando:** sensibilidad, curvas/deadzone si se implementan, vibración, botones, presets y giroscopio sólo en hardware compatible.
8. **Accesibilidad:** subtítulos, alto contraste, opciones para daltonismo, indicador radial de sonido, reducir flashes y animaciones, tamaños de letra, remapeo de teclas, compatibilidad con teclado.
9. **Cuenta y privacidad:** estado, invitaciones, chats, permisos, visibilidad, controles de menores preparados para fase online.

Incluir `Aplicar`, `Cancelar`, `Restablecer`, confirmación para cambios de visualización si procede y persistencia. **Una opción no implementada debe aparecer deshabilitada con explicación, no fingir que cambia el motor.**

# S. HUD DE PARTIDA Y FEEDBACK

HUD elegante, limpio, anclado a zonas habituales:
- Superior central: brújula y dirección; superior derecha: minimapa, área segura, número vivos, eliminaciones, temporizador/fase de tormenta.
- Inferior izquierda: vida, escudo, energía de sprint, nombre, nivel, equipo y estados de compañeros.
- Inferior derecha: slots 1–5, munición actual/reserva, arma activa y rareza, inventario rápido, materiales y piezas de construcción o utilidad.
- Centro: retículo que reacciona al disparo/ADS/objetivo, indicador de interactuar, números de daño, marcas de impacto y notificaciones.
- Lateral: misiones fijadas, kill feed, pings y avisos breves.
- Menú de inventario con arrastre, mapas grande/pequeño, ping/waypoints, pausa, reanudar, ajustes, abandonar partida con confirmación.
- Estados especiales: pantalla de derribo, reanimar compañero, respawn en Recarga, espectador, pantalla de resultados, subida de nivel, premio desbloqueado.

# T. ESTILO ARTÍSTICO, ASSETS Y ANIMACIONES

Definir **guía visual propia**: universo sci-fi/aventura fantástico, energía cian y violeta como acentos, terrenos naturales vibrantes, metal/piedra/madera legibles, personajes estilizados de proporciones heroicas, siluetas variadas, sombras de contacto, VFX exagerados pero no invasivos, sonido distintivo.

Primero usar geometría 3D generada programáticamente, modelos glTF/GLB originales o con licencia abierta adecuada, texturas PBR libres verificadas, mapas de normal, rigs compatibles y animaciones con permisos. **No descargar ni extraer archivos internos de Fortnite**. Crear manifest de assets con `id, source, license, attribution, path, lod, fallback` y fallback si alguna textura/modelo no carga.

Métricas aspiracionales (no garantías universales): objetivo 60 FPS en desktop razonable, tiempos de carga moderados, escena optimizada por instancing, culling, niveles LOD, grupos de colisión y texturas comprimidas. Para web elegir calidad adaptable; para UE5 final considerar recursos avanzados del motor de forma realista. FPS depende del dispositivo.

# U. ARQUITECTURA DE SOFTWARE Y DATOS

Usar **monorepo** si el entorno lo permite:

```text
nexus-royale/
  README.md
  package.json
  apps/
    client/
      src/
        app/                   # routes, screen flow, boot
        game/
          core/                # states, update loop, events, time
          scene/               # world, terrain, lighting, objects
          character/           # controller, camera, animation
          combat/              # projectiles, weapons, damage
          building/            # structures, editing, resources
          items/               # loot, inventory, consumables
          ai/                  # bot decision making/navigation
          match/               # storm, teams, victory, modes
          creative/            # island editor, devices, persistence
          audio/               # sfx, music, 3D sources
          effects/             # particles, shaders, postfx
        ui/
          lobby/ locker/ shop/ passes/ quests/
          discover/ compete/ career/ settings/ hud/
        data/
          modes.ts weapons.ts skins.ts quests.ts passes.ts
          maps.ts seasons.ts ranks.ts shop.ts companions.ts
        state/ services/ types/ assets/ styles/ tests/
    server/
      src/
        auth/ social/ matchmaking/ sessions/
        simulation/ anticheat/ inventory/ progression/
        rewards/ purchases/ ranked/ persistence/
      tests/
  packages/
    shared/                    # shared types, schemas, game rules
    content/                   # mode/season/item manifests
  docs/
    GDD.md ARCHITECTURE.md ROADMAP.md ASSETS.md QA.md
```

Si sólo funciona un proyecto React sencillo, crear una versión condensada preservando módulos separados. Evitar componentes monolíticos de miles de líneas, estado disperso o lógica de físicas dentro del menú.

**Modelos de datos principales:** `PlayerProfile`, `Account`, `CharacterLoadout`, `CosmeticDefinition`, `InventoryItem`, `WeaponDefinition`, `PlayerState`, `MatchState`, `Team`, `StormPhase`, `BuildPiece`, `GameMode`, `QuestDefinition`, `QuestProgress`, `Reward`, `Season`, `BattlePass`, `PassClaim`, `ShopOffer`, `WalletTransaction`, `RankedRating`, `SpriteCollection`, `CreativeIsland`, `CreativeDevice`, `Party`, `Friendship`, `Report`, `Statistics`.

**Flujo de eventos único:** `MATCH_STARTED`, `ITEM_PICKED`, `CHEST_OPENED`, `SHOT_FIRED`, `DAMAGE_DEALT`, `OPPONENT_DOWNED`, `OPPONENT_ELIMINATED`, `BUILD_PLACED`, `BUILD_EDITED`, `ZONE_SURVIVED`, `SPRITE_EXTRACTED`, `MATCH_ENDED`, `XP_GRANTED`, `LEVEL_UP`, `QUEST_COMPLETED`, `REWARD_CLAIMED`. Todo con IDs, timestamps y validación. Nunca otorgar XP/moneda dos veces por reintentos.

**Requisitos técnicos:** TypeScript estricto, componentes desacoplados, Zustand/context donde convenga, loaders con fallback, errores visibles, semilla determinística para terreno/loot/bots donde sea útil, configuración serializable, validación de inputs, pruebas unitarias de economía, tormenta, rank, loot, respawns y pasadas de build. Documentar cómo ejecutar y cómo verificar cada función. Actualizar changelog.

# V. PLAN DE DESARROLLO OBLIGATORIO: NO INTENTES TODO DE UNA VEZ

**Fase 0 · Fundamentos (entregable verificable):** preparar stack, carpetas, diseño de identidad, motor render, pantalla inicial, state machine, rutas y test inicial. Si editor permite sólo archivo único, hacerlo ordenado y modularizable.

**Fase 1 · VERTICAL SLICE JUGABLE (PRIMERA ENTREGA IMPRESCINDIBLE):** lobby con personaje 3D; botón Jugar; mapa 3D pequeño con terrenos, árboles y un edificio; cámara tercera persona; WASD/correr/saltar; puntería y disparo; una pistola y un rifle funcionales; un enemigo bot que persigue/dispara; daño, vida y escudo; muerte, victoria/derrota; loot y consumible; HUD y pausa; ajustes básicos; reiniciar/volver al lobby. Todo funcional. Que un usuario pueda jugar de inicio a fin en 3–5 minutos. **NO crear veinte pantallas vacías en vez de esta partida.**

**Fase 2 · Battle Royale:** isla más grande, bus/salto/glider, storm circles, loot avanzado, bots variados, cofres, ciclo completo, misión básica, XP persistente.

**Fase 3 · Construcción y Zero Build:** pico y recursos, cuatro piezas, colisión, edición, materiales y Zero Build que desactiva la construcción y activa regla defensiva.

**Fase 4 · Recarga, Ranked local, Arenas y Pillars:** implementar reglas reales del equipo/respawns (reboot no es igual para Solo), varias colas con Build/Zero Build, Arena 1v1/2v2 de rondas, rangos de práctica y `PillarsEngine` con **Hive 12 / Nexiph 8 / Skri 2 reboots / Jogo 1 reboot 30 s** como presets separados. Nada de una reaparición predeterminada para todos.

**Fase 5 · Meta-sistemas:** taquilla 3D con 12 skins propias, tienda con moneda demo y compra real en estado de juego (sin pago real), pase, misiones, recompensas, perfil, ajustes completos y colección de espíritus.

**Fase 6 · Creativo:** crear isla, colocar props y dispositivos, editar reglas, persistir, probar mapa, minijuegos 1v1/box fight y plantilla editable de Pillars.

**Fase 7 · Online real:** cuentas, backend, WebSocket, amigos, salas, simulación autoritativa, validación, persistencia, matchmaking, pruebas de carga; en esta fase sustituir los mocks por servicios reales.

**Fase 8 · Calidad alta:** más biomas, físicas y animaciones mejores, audio 3D, partículas, control de mando, mapas grandes, vehículos, bots mejores, anticheat básico, pruebas de rendimiento.

**Fase 9 · Experiencias adicionales:** minijuego de carreras ORIGINAL (Rocket Racing ya fue retirado de Fortnite en oct 2026), ritmo tipo Main/Jam con música propia, supervivencia estilo Odyssey, ciudad social, táctico 5v5 ORIGINAL (Ballistic retirado abr 2026) y defensa PvE. Cada experiencia debe tener gameplay propio y nunca aparecer falsamente como modo oficial vigente.

**Fase 10 · Live ops:** administración de temporadas/eventos, moderación, telemetría respetuosa de privacidad, despliegue, actualizaciones sin pérdida de perfiles, monitoreo, copias de seguridad y versión beta pública.

Para cada fase entregar:
1. Lista de funcionalidades REALMENTE implementadas.
2. Archivos añadidos o modificados y código íntegro cuando sea necesario.
3. Instrucciones exactas de ejecución.
4. Checklist de pruebas manuales y unitarias.
5. Bugs/limitaciones reales conocidos y próximo paso.
6. Captura o vista previa generada por el propio proyecto si la plataforma lo permite (no capturas falsas).

# W. CRITERIOS DE ACEPTACIÓN Y PRUEBAS DE CALIDAD

Realizar verificaciones automatizadas/manuales, mínimo:
- El juego arranca sin pantalla en blanco y sin errores en consola.
- El botón JUGAR entra a un mapa interactivo (no a una imagen estática).
- WASD mueve avatar con colisiones; cámara gira con mouse y `Esc` libera input.
- Disparar reduce munición; los impactos válidos dañan al bot y la recarga repone desde reserva.
- El bot recibe daño, persigue/ataca y puede ser eliminado. Jugador puede perder y reintentar.
- Recoger una escopeta reemplaza/equipa un item real; usar botiquín cambia salud según reglas.
- El círculo de tormenta se reduce de forma visible y aplica daño fuera de zona.
- En construcción, colocar pared consume materiales, tiene colisión y puede dañarse; en Zero Build la acción está deshabilitada realmente.
- En Recarga, eliminar a un miembro del equipo inicia contador, reaparece si queda compañero; no reaparece si se eliminó todo el equipo o acaba la fase de reinicios.
- Una partida Ranked local actualiza el rango de práctica basado en hechos del match, no valores aleatorios ocultos.
- Completar una misión aumenta progreso por evento, otorga XP una sola vez y persiste tras recarga de página.
- Comprar un cosmético con monedas demo descuenta saldo una sola vez y permite equiparlo. Si no hay saldo, se bloquea.
- Un cambio de sensibilidad/FOV/audio/gráficos **se refleja en el juego** cuando es implementable.
- Guardar una isla y volver a cargar recupera los props colocados.
- Perfil, progresión y ajustes no se pierden tras refrescar el navegador.
- Si online, servidor rechaza tiros imposibles, gastos fraudulentos y recompensas duplicadas.
- Controles, FPS, accesibilidad y menús mantienen legibilidad en 1080p y resoluciones menores.

# X. REGLAS DE COLABORACIÓN Y FORMATO DE RESPUESTA

1. Primero inspecciona el entorno y di exactamente qué se puede ejecutar. **No hagas preguntas de estilo si puedes utilizar estos valores por defecto**; resuelve ambigüedades con decisiones razonables.
2. Mantén un archivo `ROADMAP.md` con estado: `DONE / IN PROGRESS / PLANNED / BLOCKED` y dependencias.
3. Comienza IMPLEMENTANDO FASE 1 inmediatamente después de un plan de 10–15 líneas. No te limites a proponer una estructura.
4. Si no puedes ejecutar código, entrega archivos completos con nombres, dependencias y pasos realistas; no afirmes haber compilado.
5. Si existe herramienta de vista previa, úsala para detectar errores de render, controles, posición de cámara, clipping, lag y botones.
6. Cuando pida `CONTINÚA`, trabaja en la siguiente funcionalidad pendiente de mayor prioridad, sin rehacer desde cero lo que ya funciona.
7. No elimines sistemas funcionales por dar una respuesta más corta; conserva API, rutas, IDs y progreso. Evita código incompleto con `TODO` en funciones esenciales.
8. No descargues recursos protegidos sin permiso; usa placeholders originales y anota sustituciones.
9. Si una función necesita servidor, base de datos o recursos artísticos, indica claramente cuál y cómo conectarlos.
10. Nunca digas que recreaste "Fortnite completo" cuando sólo has hecho una aproximación; reporta alcance real con honestidad.

## INSTRUCCIÓN FINAL PARA ACTUAR AHORA

**Inicia con la Fase 1 y entrega una versión jugable en este mismo entorno**, con una estética 3D estilizada muy cuidada. Orden de trabajo: (a) detección de entorno, (b) arquitectura mínima, (c) escena jugable con avatar y cámara, (d) movimiento y combate, (e) bot y daño, (f) inventario/HUD, (g) lobby y flujo de partida, (h) pruebas y correcciones. Después de lograr que funcione, muéstrame el estado real del proyecto y prepara la Fase 2.

---

## REFERENCIAS OFICIALES PARA INVESTIGAR FUNCIONES (NO COPIAR ASSETS)

- Fortnite Treasure Hunters, actualización oficial 30 oct 2026: https://www.fortnite.com/news/fortnite-treasure-hunters-the-greatest-adventure-of-all-time
- Guía de Ranked oficial: https://www.fortnite.com/competitive/discover-competitive/fortnite-ranked-play-explained
- Funcionamiento de Recarga, nota oficial: https://www.fortnite.com/news/squad-up-for-fortnite-reload
- Creativo, documentación Epic: https://dev.epicgames.com/documentation/fortnite/fortnite-creative
- Crear y probar islas, Epic: https://dev.epicgames.com/documentation/fortnite/create-mode
- Dispositivos en Creativo, Epic: https://dev.epicgames.com/documentation/fortnite/getting-started-with-devices-in-fortnite
- Configuraciones y menú, Epic: https://dev.epicgames.com/documentation/fortnite/exploring-the-sidebar-and-game-menu-in-fortnite-creative
- **PILLARS Hive v34**, 12 FFA, 6 s: https://www.fortnite.com/@hive/7786-0958-2481
- **THE PILLARS Nexiph v121**, 8 FFA, 5 s, original regresa 6 nov: https://www.fortnite.com/@nexiph/2724-4064-5480
- Nexiph anuncia actualización HISTÓRICA (no asumir vigente): https://communities.epicgames.com/thread/new-pillars-update/xzRk/undefined
- **Sprite Pillars knzi** 12 FFA, 5 s: https://www.fortnite.com/@knzi/0673-9062-5656
- **Lucky Sprite Pillars luxy2x**: https://www.fortnite.com/@luxy2x/6641-8273-9828
- **Skri Reload Pillars** 2 reboots: https://www.fortniterenders.com/es-419/maps/1387-6048-1372
- **Jogo Pillars Reload** una reaparición temprana: https://fortnite.gg/island/7473-0088-9373
- **Arenas 43.00**: https://communities.epicgames.com/thread/fortnite-arenas-43-00-update-notes/AP5k
- **Retiradas oficiales de modos**: https://www.epicgames.com/help/c-37330187/c-35433838/a21633055
- **UEFN v43.00 PCG / Progression API / MCP**: https://dev.epicgames.com/documentation/fortnite/43-00-fortnite-ecosystem-updates-and-release-notes
- **Crew cambios FUTUROS 5 dic 2026**: https://www.fortnite.com/news/big-changes-to-fortnite-crew-launching-december-5
- Espíritus y colección en 2026, Epic: https://www.fortnite.com/news/extract-and-collect-sprites-on-a-new-map-in-fortnite-runners
- Opciones avanzadas UE5, Epic: https://www.fortnite.com/news/drop-into-the-next-generation-of-fortnite-battle-royale-powered-by-unreal-engine-5-1

**Importante:** estas páginas describen distintas versiones y temporadas. Toma de ellas los *conceptos mecánicos*, no supongas que cada objeto/arma/regla sigue activo hoy. Los datos del juego que construyas deberán vivir en ficheros propios de configuración actualizables.


# INVESTIGACIÓN Y REGLAS VERIFICADAS

# DOSSIER DE INVESTIGACIÓN Y DISEÑO PARA CLAUDE
## Fortnite v43.00 + Pillars, actualización comprobada al 10 de noviembre de 2026

**Objetivo:** especificación de mecánicas y estructura para crear **un juego 3D propio inspirado en Fortnite**, no una copia que redistribuya contenido protegido. Acompaña a `MASTER_PROMPT_CLAUDE_FORTNITE_ACTUALIZADO_2026-11-10.md` y `PROMPTS_POR_FASE_CLAUDE_ACTUALIZADOS_2026-11-10.md`.

**Convenciones:** `[VERIFICADO]` aparece explícitamente en Epic Games, Fortnite Communities de sus creadores o notas de publicación verificables. `[HISTÓRICO]` se publicó pero podría no seguir funcionando en el mapa más reciente. `[PROPUESTO]` es una solución original para el videojuego que estamos desarrollando. `[A CONFIRMAR]` no hay evidencia suficiente y no se debe presentar como hecho. Los códigos de isla indican **qué experiencia** se investiga, no permiso para copiar assets.

# 1. ¡OJO! Fortnite v43.00 es el punto de partida, NO lo que había en octubre

- **1/11/2026**: comenzó la temporada **Treasure Hunters** (Capítulo 7); el material promocional oficial tiene fecha **30/10/2026**. El mapa de referencia se llama **Crossbones Isle** y contiene **80 jugadores**, no asumir siempre 100 en BR. Hay cañones, tesoros, capitanes/POIs rotativos y poderes especiales inspirados en colaboraciones que NO están libres de licencia. Actualizaciones **Captain's Days** anunciadas: 1, 8, 12, 15, 22 de noviembre. En la fecha de este documento, **12/15/22 aún son FUTURAS**. Evento de fin de capítulo anunciado para **5/12/2026**, también FUTURO. Fuente [1].
- **4/11/2026**: Epic anunció cambios del **Fortnite Crew que entran en vigor 5/12/2026**, no confundir anuncio con fecha de aplicación. Están previstos nuevos niveles de moneda mensual por permanencia, bonus de XP y final del OG Pass el 5/12, próximo periodo OG a fines de 2027. El pase de noviembre y las recompensas de Crew no se pueden extrapolar sin comprobar las reglas vigentes. Fuente [2].
- **Modo retirado**: Ballistic retirado 16/04/2026; Festival Battle Stage retirado 16/04/2026; Rocket Racing retirado 1/10/2026. **No dibujar tarjetas como si estuvieran disponibles actualmente**. Si el proyecto quiere FPS táctico o carreras, convertir en experiencias *originales opcionales*, con estado de desarrollo honesto. Fuente [3].
- **UEFN 43.00** introdujo PCG (generación procedural), amplió flujos MCP para performance, animación, audio, cinematics y sacó de experimental la API de progresión de islas con misiones personalizadas. Referencias de arquitectura para nuestra capa de Creativo; no afirmar que APIs de UEFN son compatibles con Three.js. Fuente [4].

# 2. Cómo debe funcionar la navegación principal (sin duplicar 20 motores)

**Lobby / Jugar:** barra Jugar, Descubrir, Taquilla, Tienda, Pases, Misiones, Competir, Carrera/Perfil, opciones y Social. En Jugar se muestra personaje 3D original, entorno de temporada, tarjeta de experiencia, equipo y botones de Listo/Jugar/Cancelar. Primero se selecciona **familia** (`battle_royale`, `reload`, `og`, `blitz`, `arenas`, `creative`); después se eligen **opciones** que la familia permita (`ranked`, `build`, `teamSize`, `fill`, `mapRotation`, `privacy`). Las opciones que no existan o no estén implementadas se deshabilitan y explican.

**Descubrir:** secciones "de nuestro estudio", "Battle Royale", "Combate rápido", "Pillars", "Crear", "Social y música", "Favoritos", "Jugados recientemente" y "Buscar por nombre/ID". Diferenciar *jugable*, *prototipo*, *próximamente* y *referencia histórica*. Ordenamiento y favoritos basados en estado real del proyecto, no métricas inventadas de Fortnite.

**Partida:** loading, emparejamiento local o real rotulado, calentamiento, despliegue, jugabilidad con HUD, final, XP/rango y recompensa. Botones nunca vacíos. Toda partida emite eventos (`RoundStarted`, `LootGranted`, `DamageDealt`, `KnockbackApplied`, `EliminationConfirmed`, `RoundWon`, `MatchEnded`, `XpEarned`, `QuestProgressed`, `RewardClaimed`). Eventos guardados y verificados en servidor cuando online.

# 3. Modos de combate actuales: reglas confirmadas + modelos de implementación

## 3.1 Battle Royale / Zero Build / Ranked

[VERIFICADO] El BR de Treasure Hunters se juega en Crossbones Isle con diseño para 80 participantes. Cañones para desplazamiento, áreas de interés asociadas a capitanes, tesoros y poderes especiales; eventos semanales modifican contenido. No usar modelo real de personajes/licencias One Piece/otros artistas. Fuente [1].

[PROPUESTO] Sistema `BattleRoyaleRuleset` con llegada aérea, drop/glider, 8-12 POIs propios, loot distribuido por categoría/raridad, cofres, curaciones, escudos, recursos de construcción, tormenta con fases y daño, vehículos/movilidad, victoria individual/equipo. Zero Build deshabilita **toda** construcción y puede usar sobreescudo para compensar. Ranked usa progreso por familia y matchmaking de habilidad cuando exista backend. En local, probar con bots de 8/16/24 jugadores y optimizar antes de escalar. 

**Rangos [VERIFICADO]:** Bronce I/II/III, Plata I/II/III, Oro I/II/III, Platino I/II/III, Diamante I/II/III, Élite, Campeón, Unreal. Epic distingue progreso de BR, Zero Build y Reload; el desbloqueo oficial de Ranked requiere una misión de sobrevivir a 500 jugadores. **No fingir conocer la fórmula exacta de Epic**. Fuentes [5] y [6].

## 3.2 Reload / Recarga v43.00, incluido Ranked y Zero Build

[VERIFICADO] Ficha Epic: 40 participantes, isla pequeña y rotación; mientras un compañero está vivo se puede reingresar tras eliminación; eliminaciones propias/equipo aceleran el regreso; al final se cierran los reboots y la derrota del equipo completo es definitiva. El modo incluye opciones de Build/Zero Build y clasificación. Fuentes [7] y [8].

**Notas específicas de 43.00 [VERIFICADO]**:

- Rotación actual: **Surf City, Nitemare Island y Squid Grounds**. Está anunciado que **12/11** (FUTURO al 10 nov) sale Nitemare Island y regresa **Springfield**; no presentar dicho cambio como ocurrido ya.
- **Las barras de oro se eliminaron del modo**; objetos de máquinas expendedoras y Pocket-O-Matic ahora son gratis.
- Nuevos tipos de referencia: herramienta melee de 3 espadas y dash, slingshot con proyectiles, rifle repetidor automático, escopeta potente de un solo disparo, bola explosiva no competitiva, consumible que cura y ayuda al movimiento por agua. Crear variantes originales por mecánica. La tabla de loot real cambia por mapa y Ranked.
- En el loot regresaron categorías de rifles de asalto, escopetas, SMG, pistolas, rifle de caza y lanzacohetes, algunos consumibles/útiles de movilidad; se archivaron algunas curaciones, lanzadores y armas. Mantener **tablas versionadas** y filtros por `competitiveAllowed` y `mapId`.
- Se corrigieron la visualización del objetivo de la cacería, el slot Pocket Item en layouts personalizados y algunos avisos de bonus Ranked.
- Fuente detallada [9].

[PROPUESTO] `RebootManager` con `rebootAllowedUntilPhase`, `timeRemaining`, `aliveTeammateCount`, `rebootReductionOnElim`, `respawnEquipment`, `gliderDeploy`, `finalRebootLock`; usar política diferente si se ofrece un modo Solo. Tests para escuadrón parcialmente vivo, wipe total, reducción por eliminación y último círculo.

## 3.3 OG v43.00

[VERIFICADO] La actualización devolvió **Starry Suburbs** y **Greasy Grove**. En Starry Suburbs caen estrellas que al abrirlas sueltan loot; reaparece un SMG legendario. En Greasy Grove hay consumibles que restauran vida y aceleran velocidad, y una secuencia musical impide disparar o construir por un rato. Fuente [10].

[PROPUESTO] isla propia estilo clásico, eventos ambientales equivalentes (meteoritos recompensables, comida con buff, evento de silencio/cese de combate), armas más simples. `worldEventSystem` debe modificar input/daño mientras el evento está activo, no solo mostrar VFX. OG Zero Build como opción cuando esté disponible; no prometer Ranked OG actual.

## 3.4 Blitz Royale v43.00

[VERIFICADO] El diseño base Blitz implica partidas rápidas de aprox. 5 min, 32 jugadores en su presentación, mapa reducido, subida de nivel Blitz por supervivencia/eliminaciones y bendiciones. En v43.00 hay nuevo loot y habilidades de frutas especiales, con **una de cada clase por partida**, drops de cofres dorados y suministros. Las **barras de oro y un medallón previo** salen de Blitz; el balance/raridad cambia según fuente de drop. Fuentes [11], [12].

[PROPUESTO] `BlitzLevel` en tiempo real, `boons` originales, igual loadout inicial por condición del servidor, oro/loots por rareza según tabla propia, tormenta muy rápida, límite 5 min configurable. Diseñar mapa compacto distinto de BR.

## 3.5 Arenas Boxfights v43.00

[VERIFICADO] Epic describe 16 participantes en Solo (1v1 sucesivos) u 8 equipos Dúo (2v2). La victoria de la serie llega con **20 enfrentamientos ganados Solo o 15 Dúo**; 1v1 desafío privado sin rango primero a 7. Fuente [13]. En v43.00 se añade **tracker de estado de Ranked en vivo**, mostrando aumento/disminución de porcentaje conforme cambia colocación, y se actualizan pools de rifles, escopetas, pistolas, SMG y consumibles; la tormenta cúbica se ajustó. Fuente [14].

[PROPUESTO] cada combate genera arena/room independiente, spawns simétricos, misma carga para ambos, timer de round, eliminación/tie, reasignación al siguiente rival, scoreboard, tracker competitivo de práctica y recálculo de puntos. No confundir con Arena BR antiguo.

# 4. Pillars: LA CORRECCIÓN CENTRAL

**Nunca llames a todos los presets "Pillars Reload".** Son islas separadas de comunidad, cada una con dueño, código, límites, tiempos y recompensas distintos. El juego propio puede ofrecer una categoría "Pillars" con variantes originales que toman referencias mecánicas distintas. 

| Preset del proyecto | Referente / creador / código | Última versión y fecha encontrada | Valores CONFIRMADOS | No asumir |
|---|---|---|---|---|
| `pillars_hive` | **PILLARS**, Hive, `7786-0958-2481` | **v34**, 28/29 oct | **12 FFA**, ítem cada **6 s**, ronda rápida, gana último, se guardan victorias/eliminaciones | No atribuir reboots ni espíritus |
| `pillars_nexiph` | **THE PILLARS**, Nexiph, `2724-4064-5480` | **v121**, **8 nov 2026** | **8 FFA**, ítem cada **5 s**, construir e impulsarse, tirar rivales, ronda rápida, último vivo | NO asumir el enorme pilar central de la actualización pasada |
| `pillars_sprite` | **Sprite Pillars**, knzi, `0673-9062-5656` | **v93**, 4 nov | **12 FFA**, bloque aleatorio **5 s**, sobrevivir y ganar | No atribuir recetas de fusión de otra isla |
| `pillars_lucky_sprite` | **Lucky Sprite Pillars**, luxy2x, `6641-8273-9828` | **v16**, 14 oct | **12 FFA**, sprites coleccionables y poderes, bloque cada **5 s**, stats | Fused Sprites sí anunciado, proceso detallado no confirmado |
| `pillars_rng` | **Pillars RNG**, wzl, `6777-5733-5416` | v13, 1 nov | **12 FFA**, loot **6 s**, sprite aleatorio por ronda, sprites por victorias | No asumir los poderes exactos de cada tipo |
| `pillars_reload_skri` | **RELOAD PILLARS**, skri, `1387-6048-1372` | 30 oct | **12 FFA**, loot **5 s**, **2 reboots**, reaparecer en pilar propio, tormenta, cash/rangos/skins | No aplicar su política a Hive/Nexiph |
| `pillars_reload_jogo` | **PILLARS RELOAD**, jogo, `7473-0088-9373` | v15, 29 oct | **12 FFA**, loot **6 s**, **1 respawn en primeros 30 s** | No decir que todos Pillars son iguales |
| `pillars_modifiers` | **Pillars Modes**, AgentK, `4472-3232-2181` | v9, 17 jul | 12 FFA, 5 s, Normal / Zero Gravity / Snipers Only / Random Zone / Floor is Lava | Vieja variante, sin afirmar que es última |

**Fuentes por fila:** Hive [15], Nexiph [16], Sprite [17], Lucky [18], RNG [19], Skri [20], Jogo [21], AgentK [22].

### Cambio de Nexiph que el prompt original omitía

- **Meses antes**, el creador de `THE PILLARS` anunció un mapa con **8 pilares exteriores rediseñados y un pilar central**, nuevas coberturas, **Dragon Bat único por ronda**, desbloqueo **Rebirth en rango Supreme** que devolvía a Bronce con aura roja, **+50 HP por eliminación**, monetización interna para cosméticos/objetos y cooldown 7→6 segundos. Todo eso fue real como **NOTA HISTÓRICA**. Fuente [23].
- **6 de noviembre de 2026**, el mismo creador anunció **"ORIGINAL PILLARS IS BACK!"**, con loot renovado; el listado actual indica **8 jugadores, objetos cada 5 s y estilo original**, con la ficha en v121 (8 nov). Estas son las reglas **ACTUALES** a priorizar. Fuentes [16], [24].
- Por tanto, diseñar `pillars_nexiph` (original actual) y, si se desea, `pillars_nexiph_legacy` (grande+Dragon Bat+Rebirth) como **preset histórico separado**, con UI de "variante inspirada en versión anterior". No mezclar características sin una confirmación pública más nueva.

### PillarsEngine propuesto para Claude

1. **Inicio:** crear sala de 2–12 participantes (presets Hive 12, Nexiph 8), llenar con bots solo cuando el entorno sea local; asegurar pilar seguro para cada spawn. Salas públicas/privadas sólo con backend.
2. **Mapa:** columnas con suelo y colisiones, alturas y materiales parametrizables, plataformas con bordes, vacío bajo umbral mortal, distancias que permitan construir/impulsarse según perfil. Pilar central no obligatorio, se activa únicamente en presets que lo lleven.
3. **Loot:** scheduler de servidor genera un objeto cada `5` o `6` segundos según preset, con distribución por tipo (arma, knockback, movilidad, curación, defensa, azar). Bloques aleatorios se resuelven con efectos y VFX, no son sólo un icono. En variante sprites, algunos bloques pueden dar poder/compañero.
4. **Física:** empujar/salir despedido con knockback, impulsos y caídas que dependan de colisiones físicas, no de un random de "eliminado". Medidor de caída y muerte al vacío, kill attribution del último atacante en ventana configurable.
5. **Regla de vidas:** `none` para Hive/Nexiph; `limited_tokens(2)` Skri; `limited_tokens(1, allowedUntil=30s)` Jogo. Verificador de reloj en servidor. Espectador, resultados y siguiente ronda cuando ya no queden vidas.
6. **Ganador:** último vivo (incluyendo si otros se desconectan), scoreboard por ronda, rachas, wins, eliminaciones y recompensas guardadas sin duplicados. Rondas cortas y transición rápida.
7. **Rank, cosméticos, sprites:** solo si esa variante los contempla, usar progreso propio y explícito, no el Ranked oficial de BR. Personalización original de pilares, auras, efectos de victoria, compañeros y aspectos; `PillarPass` interno opcional, sin reclamar que existe en todos los mapas de Fortnite.
8. **Variantes extra:** gravedad cero, solo snipers, suelo de lava, random zone como preset de mapas creativos separado. La opción de reaparición no se impone por defecto.

### Modelo de datos recomendado

```ts
interface PillarsPreset {
  id: string;
  title: string;
  reference: { creator:string; islandCode:string; version:string; verifiedAt:string };
  maxPlayers: 8|12|16;
  lootIntervalSeconds?: 5|6;
  blockIntervalSeconds?: 5;
  buildEnabled: boolean;
  enableKnockback: boolean;
  initialRebootTokens: number;
  rebootsExpireAtSecond: number|null;
  stormEnabled: boolean;
  collectibleSprites: boolean;
  victoryRule: 'last_player'|'last_team';
  teamSize?: 1|2;
  lootTableId: string;
  levelId: string;
  rankProfileId?: string;
  evidenceStatus: 'verified_current'|'historical'|'original_proposal';
}
interface PillarsRound {
  id:string; phase:'warmup'|'countdown'|'active'|'end'|'results';
  startedAt:number; roundSeed:number; alivePlayerIds:string[];
  livesRemaining:Record<string,number>; lootGrantCount:Record<string,number>;
  killFeed: {attackerId?:string; victimId:string; cause:string; time:number}[];
  winnerId?:string;
}
```

### Pruebas mínimas, no negociables

- `nexiph_8_players_spawn_unique_pillars` y `hive_12_players_spawn_unique_pillars`.
- `hive_loot_every_6s_not_5s` y `nexiph_loot_every_5s_not_6s` con reloj simulado.
- `skri_allows_exactly_two_reboots` y `jogo_one_reboot_only_before_30s`.
- `hive_and_nexiph_no_default_reboot`.
- `void_fall_triggers_elimination_and_attribution` y `physics_impulse_affects_position`.
- `last_survivor_wins_once`, `ties_disconnects_and_bot_mix`, `leaderboard_persisted_once`.
- `sprite_collection_persists_and_powers_have_cooldowns`, `random_loot_seed_repeatable`.
- `no_fake_purchase_no_real_currency_claim`, `unimplemented_mode_disabled`.

# 5. Tienda, skins, misiones, pases y eventos: integración correcta

- **Taquilla**: skin/avatar, picos, mochilas, planeadores, estelas, gestos, estilos, envoltorios, instrumentos y compañeros con modelos originales. Filtros, favoritos, vistas previas 3D y equipamiento persistente reflejado en lobby y partida.
- **Tienda**: ofertas por fecha, imagen del objeto, moneda ficticia del juego, previsualización, detalles de lote, validación de saldo, compra/equipar y recibo local. Compras reales son proyecto de backend separado con requisitos legales y comerciales. Jamás usar V-Bucks como si fueran canjeables reales. Rotación programada, sin artículos externos licenciados.
- **Pases**: pase de batalla, OG-like (hasta fecha anunciada), Music-like y LEGO-like con XP progresiva desde cualquier experiencia, cada pass con `xpTable`, `seasonStart`, `seasonEnd`, track free/premium, claim único y regalos opcionales sólo reales tras backend. El Pase de Pillars de una isla comunitaria no es el Battle Pass oficial.
- **Misiones**: Diarias, Semanales, hito, temporada, modo, racha, evento y Map Mastery. Evento fuente siempre sea jugable: daño, eliminación, visitar POI, abrir cofres, terminar partida, jugar ronda Pillars, completar duelo de Arenas, recoger sprite.
- **Ranked**: progreso competitivo independiente de BR, Zero Build y Reload. Objetivos de ranking originales; extraer cifras de un modelo de puntos propio explicable. Recompensas cosméticas por tiers. Arenas también puede tener progreso propio. No adjudicar rangos oficiales Epic al usuario.
- **Suscripción tipo Club**: funcionalidad opcional original, con manejo de pagos SOLO si existe infraestructura, términos y permisos; cambios anunciados de Epic para diciembre son inspiración, no una obligación para el juego original.
- **Contenido por temporada**: datos separados de la lógica, JSON/TS por `seasonId`, `patchVersion`, `goLiveAt`, `expireAt`, `activeMaps`, `lootTables`, `specialEvents`, `passDefinitions`. Nada del futuro aparece activo antes de su fecha.

# 6. Gráficos, partículas, nivel AAA y límites reales

**Objetivo visual:** entorno 3D auténtico, no página estática. Mundo con cielo, movimiento de nubes, vegetación, agua, materiales PBR, iluminación principal y de relleno, sombras configurables, postprocesado dosificado (bloom, tone mapping, SSAO sólo si rendimiento lo permite), LOD, culling, instancing, texturas con mipmaps y animación IK/rig cuando haya modelos compatibles.

**Avatar:** idle, caminar, sprint, saltar, caer, aterrizar, agacharse, apuntar, disparar, recargar, construir, editar, levantar objeto, impulsar, ser empujado, eliminarse, victoria, gestos. Cámara tercera persona con anti-clipping, sensibilidad configurada, apuntado hombro, ADS y offset. Armas con recoil, spread, hitscan/proyectil, velocidad, caída, sonido y partículas. Vida/escudo/overshield, daño de caída, construcción y daño por tormenta reales. HUD legible en PC y adaptable a resoluciones/touch.

**Settings que cambien variables reales**: resolución/escala interna, preset Low-Medium-High-Epic original, sombras, distancia de dibujado, calidad de efectos, V-Sync cuando lo permita renderer, motion blur, FOV, sensibilidad, keybindings, audio por bus, daltonismo, subtítulos y UI scale. No hacer botones que solo cambian colores del panel de ajustes.

**Stack recomendado:** Claude Code + Vite + React + TypeScript + React Three Fiber + Three.js + física + store + tests; backend server-authoritative separado para jugadores reales. Para visual de mayor calidad con assets complejos, proyecto Unreal Engine 5 requiere contenido 3D, editor, Blueprints/C++ y servidores. Una vista Claude.ai/Artifacts no equivale a un juego multiplayer AAA, aunque sí puede alojar un prototipo web local funcional.

# 7. Estructura de archivos deseada para desarrollo

```
src/
  app/                 # bootstrap, routing y estados de sesión
  ui/lobby/            # Jugar/Descubrir/parties/status de cola
  ui/locker/           # avatar y cosmetics
  ui/shop/             # tienda, previsualización, saldo
  ui/passes/           # XP / reclamaciones
  ui/quests/           # registros/objetivos
  ui/match/            # HUD por familia de modo
  engine/renderer/     # escena, cámara, iluminación, assets
  engine/physics/      # movimiento y colisiones
  engine/combat/       # disparos, daños, inventario
  engine/build/        # piezas y edición
  engine/ai/           # bots / navegación
  game/modes/          # registro de experiencias
  game/br/             # BR/Zero Build
  game/reload/         # reboot manager
  game/arenas/         # rondas 1v1/2v2
  game/pillars/        # presets, scheduler, knockback, void, rounds
  game/sprites/        # colección/poderes
  game/seasons/        # calendario de contenido
  creative/editor/     # prefabs, dispositivos y guardado
  data/presets/        # json de modos/versiones
  tests/               # unitarias, integración y e2e
server/                # online opcional, authoritative match state
public/assets-originales/ # licencias y autoría documentadas
ROADMAP.md
VERIFIED_REFERENCES.md
IMPLEMENTATION_STATUS.md
```

# 8. Prompt de control de calidad para Claude (usar al cerrar cada fase)

> Audita todos los sistemas realmente implementados y compara contra este dossier. No confundas fuente pública con propuesta propia. Devuélveme tabla de `feature / referenced rules / implemented / tested / sourceVersion / limitation`. Por cada modo declarado jugable ejecuta un ciclo completo de juego y muestra pruebas de spawn, daño, loot, derrota, victoria, guardado, volver a lobby. En Pillars valida Hive 12/6 segundos, Nexiph 8/5 segundos/v121, Skri 2 reboots, Jogo 1 respawn antes de segundo 30. Verifica build y tests. Si algo falla, arréglalo antes de añadir menús o efectos. Ningún botón vacío. Los modos retirados nunca se presentan como actuales. Si no tienes backend, anuncia la versión como local con bots y no inventes usuarios conectados.

# 9. Referencias y fechas de consulta (links para verificar en Claude)

[1] Epic Treasure Hunters: https://www.fortnite.com/news/fortnite-treasure-hunters-the-greatest-adventure-of-all-time

[2] Epic Crew 4 nov, efectos 5 dic: https://www.fortnite.com/news/big-changes-to-fortnite-crew-launching-december-5

[3] Epic modos retirados: https://www.epicgames.com/help/c-37330187/c-35433838/a21633055

[4] Epic Developer UEFN v43.00: https://dev.epicgames.com/documentation/fortnite/43-00-fortnite-ecosystem-updates-and-release-notes

[5] Epic Ranked Support: https://www.epicgames.com/help/c-34254770/c-33726977/a24421350

[6] Epic Ranked explicativo: https://www.fortnite.com/competitive/discover-competitive/fortnite-ranked-play-explained

[7] Epic Reload ficha: https://www.fortnite.com/@epic/reload

[8] Epic Reload mapa y reboot: https://store.epicgames.com/news/the-new-reload-elite-stronghold-map-what-s-changed-and-how-to-adapt

[9] Epic Reload 43.00: https://communities.epicgames.com/thread/fortnite-reload-43-00-update-notes/oxqw

[10] Epic OG 43.00: https://communities.epicgames.com/thread/fortnite-og-v43-00-update-notes/7lgb

[11] Epic Blitz definición: https://www.fortnite.com/news/fortnite-blitz-royale-full-throttle-phone-ready

[12] Epic Blitz 43.00: https://communities.epicgames.com/thread/v43-00-blitz-royale-update-notes/RnOd

[13] Epic Arenas estreno: https://www.fortnite.com/news/chase-greatness-in-fortnite-arenas

[14] Epic Arenas 43.00: https://communities.epicgames.com/thread/fortnite-arenas-43-00-update-notes/AP5k

[15] Hive PILLARS: https://www.fortnite.com/@hive/7786-0958-2481 ; historial: https://fortnite.gg/island/7786-0958-2481/history

[16] Nexiph THE PILLARS: https://www.fortnite.com/@nexiph/2724-4064-5480 ; historial: https://fortnite.gg/island/2724-4064-5480/history

[17] Sprite Pillars knzi: https://www.fortnite.com/@knzi/0673-9062-5656 ; cambios: https://fn360.gg/map/0673-9062-5656

[18] Lucky Sprite Pillars luxy2x: https://www.fortnite.com/@luxy2x/6641-8273-9828

[19] Pillars RNG: https://fn360.gg/map/6777-5733-5416

[20] Reload Pillars skri: https://www.fortniterenders.com/es-419/maps/1387-6048-1372

[21] Pillars Reload jogo: https://fortnite.gg/island/7473-0088-9373

[22] Pillars Modes agentk: https://fortnite.gg/island/4472-3232-2181

[23] Nexiph actualización intermedia HISTÓRICA: https://communities.epicgames.com/thread/new-pillars-update/xzRk/undefined

[24] Nexiph comunicado nuevo original Nov6 (visible en ficha comunidad): https://www.fortnite.com/@nexiph/2724-4064-5480

[25] Epic Festival 43.00 (incluye orientación vertical mobile y mini season): https://communities.epicgames.com/thread/fortnite-festival-v43-00-update-notes/wz8z

[26] Epic XP pases simultánea: https://www.fortnite.com/news/coming-soon-progress-your-fortnite-passes-by-playing-any-experience

**Advertencia:** enlaces y fichas reflejan estados al corte. Si después cambian, comparar versiones antes de cambiar código. No descargar ni redistribuir assets de Epic/creadores automáticamente.


## ANEXO VIGENTE: dos variantes adicionales de Pillars (fichas oficiales)

**Duos Pillars (luxy2x, isla 3015-5159-1728):** la ficha oficial indica hasta **8 equipos de 2 (16 participantes)**, objetos aleatorios cada **5 s**, elección de compañero por ronda, construcción y victoria del último equipo. Incluye un rango personalizado del mapa, distinto al Ranked oficial. Para implementarlo, añadir `teamSize=2`, `maxPlayers=16`, `winCondition=last_team` y un gestor de equipos que impida fuego amigo según el preset. Fuente: https://www.fortnite.com/@luxy2x/3015-5159-1728

**Lucky Sprite Pillars (giovanni, isla 1027-9126-4083):** esta es OTRA isla del mismo género. Publica **12 jugadores**, botín cada **5 s**, una bala inicial por arma, objetos de movilidad, tormenta que se cierra, espíritus persistentes al ganar, índice de colección, lucky blocks, clover diario, monedas por victorias/eliminaciones y personalización de pilares. No mezclar estas reglas con la isla Lucky Sprite de luxy2x ni atribuirlas a Nexiph. Fuente: https://www.fortnite.com/@giovanni/1027-9126-4083

**Tests extras:** `duos_16_players_8_teams`, `last_team_wins`, `teammate_selection_each_round`, `giovanni_one_bullet_per_weapon_start`, `sprite_index_persists`, `daily_reward_once_per_24h` y `no_cross_island_rules`.


# PLAN DE EJECUCIÓN PARA CLAUDE

# Cómo trabajar con Claude sin perder código: prompts por fase

## Preparación única

1. Abre un **Project** o repositorio de Claude y carga el documento `MASTER_PROMPT_CLAUDE_FORTNITE_ACTUALIZADO_2026-11-10.md` y `DOSSIER_ACTUALIZACION_FORTNITE_PILLARS_NOV2026.md` como especificación permanente. Si no puedes adjuntar archivos, copia y pega el texto completo del documento en el chat. No uses screenshots de Fortnite como imágenes distribuidas por tu juego; son inspiración.
2. Usa Claude Code si tienes un entorno con archivos y terminal. Si trabajas con Claude.ai/Artifacts, pide un demo local realista con bots, sabiendo que no puede alojar servidores multiplayer en una única vista.
3. Envía el Prompt 0; cuando la fase realmente funcione, envía el 1 y así sucesivamente. Si Claude responde muy largo, exige entregas por archivos o parches, nunca resúmenes en lugar de código.
4. Guarda el mismo proyecto, usa control de versiones si existe y sigue `ROADMAP.md`.

---

## Prompt 0: Comenzar HOY con una partida jugable

> Lee la especificación maestra adjunta y utilízala como fuente de verdad. Trabaja en **Fase 1**, no intentes hacer todas las fases. Detecta el entorno. Si hay terminal, crea el proyecto, instala dependencias y ejecuta la build; si hay Artifacts, crea lo que pueda funcionar en su preview. Necesito ahora un juego 3D REAL con lobby, personaje original visible, mapa 3D, cámara tercera persona con mouse, movimiento WASD, sprint/salto, 2 armas con disparos/munición/recarga, bot que persigue/dispara y recibe daño, vida/escudo, un cofre, loot, HUD, derrota/victoria, volver a lobby y opciones básicas. Sin botones falsos. Visuales muy cuidados, iluminación, UI profesional. Al finalizar, verifica cada control y dame instrucciones para probarlo. Mantén `ROADMAP.md` y no declares completado lo que no funciona.

## Prompt 1: Battle Royale funcional

> Conserva íntegra la fase anterior y trabaja Fase 2 del documento. Implementa una partida Battle Royale completa con cuenta regresiva, avión/bus aéreo original, salto/planeador, isla con puntos de interés, distribución de cofres/loot, bots con decisiones de navegación, tormenta por fases que aplica daño y cambia el minimapa, supervivencia, victoria y pantalla final, XP y misiones conectadas a eventos. Entrega código real por módulos, revisa controles y funcionamiento tras cada cambio. No rompas el lobby ni el modo entrenamiento.

## Prompt 2: Construcción competitiva y Zero Build

> Implementa las cuatro piezas 3D (`wall`, `floor`, `stair`, `roof`), preview transparente, grid, consumo de madera/piedra/metal cosechadas, colisiones, daño/destrucción, rotación, edición de pared con cuadrícula y reset. En Zero Build se deben deshabilitar estas acciones y activar su regla defensiva. Verifica que los controles de recarga, edición e interacción no tengan conflictos. Añade tests para materiales, colisiones y modo sin construcción.

## Prompt 3: Recarga y cuatro Ranked

> Implementa los modos Recarga con/sin construcción, equipos y mapa compacto. Un eliminado reaparece tras contador cuando su equipo aún tiene alguien con vida; se termina si mueren todos o se cierra la ventana de reinicio. Implementa Ranked BR, Ranked Zero Build, Ranked Recarga y Ranked Recarga Zero Build con progreso separado, tabla de rangos y MMR de práctica claramente rotulado. La puntuación se deriva de eliminaciones, posición, supervivencia, daño y círculo. Conservar partida jugable en todos los modos; demostrar con pruebas.

## Prompt 3B: PillarsEngine, 4 variantes REALES y pruebas de ronda

> Lee íntegramente el dossier del **10/11/2026** y sección G2. Corrige cualquier Pillars anterior. NO uses un solo preset de 12 jugadores con 1 reaparición. Crea `PillarsEngine` reutilizable con cuatro tarjetas separadas: `pillars_hive` (12 FFA, loot cada 6s, sin reaparición afirmada); `pillars_nexiph` (8 FFA, loot cada 5s, construcción, última versión v121 del 8 nov, regreso de OG); `pillars_reload_skri` (12 FFA, loot cada 5s, DOS reboots en pilar propio y tormenta); `pillars_reload_jogo` (12 FFA, loot cada 6s, UN respawn solo en primeros 30 segundos). Cada tarjeta presenta reglas precisas, mapa original específico, spawns asignados, timers, inventario, knocked-off/void-death, espectadores, ganador, resultados y estadísticas persistidas. Implementa automatización de pruebas para 8/12 jugadores, reboots, timers y último superviviente. El Dragon Bat y gran pilar central pertenecen a un anuncio histórico Nexiph, no incluirlos como obligatorios actuales.

## Prompt 3C: Sprites / Lucky Blocks / Arenas v43.00

> Añade `Sprite Pillars` de referencia knzi (12 FFA, bloque aleatorio cada 5s) y `Lucky Sprite Pillars` de referencia luxy2x (12 FFA, poderes y colección de espíritus originales, bloques cada 5s). `Pillars RNG` wzl tiene espíritu aleatorio por ronda, objeto cada 6s y desbloqueos por victorias. Separa claramente esas tres variantes y NO mezcles sus habilidades sin configuración. Implementa sprite/loot roll reproducible por seed, cooldown por poder, contador de bloque, inventario y guardado. Integra un minijuego `Arenas` 1v1 / 2v2 por rondas con 16 en Solo u 8 dúos, meta 20 / 15 wins, junto a HUD de progreso Ranked simulado honesto. Define tests.

## Prompt 4: Lobby, Descubrir y HUD profesional

> Pule el lobby en 3D al nivel visual de un videojuego comercial original. Barra JUGAR/TAQUILLA/TIENDA/PASES/MISIONES/COMPETIR/CARRERA, personaje central 3D animado, carrusel de modos, botón JUGAR/LISTO/CANCELAR, equipo, skins visibles y fondos propios, tarjetas ilustradas. En el juego crea HUD de vida, escudo, munición, slots, minimapa, brújula, zona segura, kill feed, misiones, materiales y accesibilidad. Cada botón debe navegar o alterar datos reales. Si un modo no existe, tarjeta deshabilitada y con etiqueta 'En desarrollo'.

## Prompt 5: Taquilla y skins originales

> Crea 12 avatares originales con vistas de personaje en 3D, variantes, rareza y galerías; taquilla con buscador, filtros y favoritos, mochila, pico, planeador, estela, emotes, wraps y compañeros. Persistir equipamiento y mostrarlo tanto en lobby como durante la partida. No utilizar skins de Fortnite ni IP de terceros. Si faltan modelos, haz siluetas/avatares 3D procedurales de calidad para demostrar la lógica y deja un manifiesto claro de assets.

## Prompt 6: Tienda, pase, misiones y recompensas

> Crea tienda de artículos con moneda ficticia, saldo persistente, vista previa, ofertas rotativas, confirmación, validación y equipamiento; pase de batalla con niveles, dos tracks, páginas de recompensas, XP real por partida y un sistema de reclamación no duplicable; misiones diarias, semanales y de eventos conectadas a eventos REALES del juego. Cada acción debe modificar estado persistente. Sin compras con dinero real ni promesas de V-Bucks legítimos.

## Prompt 6B: Corregir catálogo v43.00 y fechas

> Audita el catálogo del juego como **10 de noviembre de 2026**: Battle Royale y Zero Build dentro de una familia con Ranked toggle, Reload y variantes con Ranked toggle, OG, Blitz, Arenas, Creativo, Sprite Garden, Save the World, Odyssey, Brick Life, Festival Main y Jam. Ballistic, Rocket Racing y Festival Battle Stage fueron retirados: pásalos a referencias históricas, no a modos actuales jugables oficiales. Treasure Hunters empezó 1 nov, el contenido de Captain's Days del 12/15/22 nov es FUTURO, cambios del Club/OG Pass empiezan 5 dic. Agrega `evidenceStatus`, `lastVerifiedAt`, `implementationStatus` y fuentes por modo. No habilitar funciones sin implementación.

## Prompt 7: Espíritus y eventos de temporada

> Agrega pequeños compañeros mágicos originales que pueden encontrarse, equiparse, extraerse y coleccionarse con poderes de escudo, invisibilidad, movilidad y detección de botín. Implementa rareza, cooldowns y condiciones de activación, menú colección, variantes y misiones. Añade manifest de temporada que permita cambiar armas y eventos sin romper partidas. Balancea para que los poderes no dominen el combate.

## Prompt 8: Editor Creativo funcional

> Implementa Creativo: nueva isla, plantillas, añadir árboles/edificios/paredes, mover/rotar, prefabs, seleccionar, duplicar, undo/redo, dispositivos (spawn, botón, trigger, contador, temporizador, teletransporte, victoria, armas), personalizar reglas, guardar/cargar y probar isla en Play mode. Entrega dos islas de ejemplo 1v1 y box fight realmente jugables. Publicación online sólo si existe backend y autenticación.

## Prompt 9: Multijugador real

> Ahora crea el backend autoritativo (si el entorno permite servidores) sin destruir juego local. Cuentas seguras, login, perfiles, sala, amigos, party, ready, matchmaking, WebSocket, movimiento sincronizado, bots, combate validado en servidor, vida, tormenta, inventario, estadísticas, economía y ranking persistentes en PostgreSQL. Documenta despliegue y qué límites reales existen. Prueba con dos navegadores simultáneos y no declares multiplayer completo sin haberlo verificado.

## Prompt 10: Pulido gráfico y escalado

> Optimiza geometría, instancing, culling, LOD, iluminación, sombras, agua, árboles, partículas, VFX, animaciones, HUD y audio 3D, manteniendo modo Rendimiento. Implementa ajustes que cambien valores reales. Prueba que no haya FPS excesivamente bajos ni congelamientos en un dispositivo de referencia y reporta métricas honestas. Incluye nuevas experiencias sólo después de estabilizar el núcleo jugable.

---

## Prompt de corrección cuando Claude genere algo superficial

> Esto sigue siendo un mock visual, no un videojuego funcional. No quiero más páginas decorativas. Haz una auditoría de lo que existe: para cada botón y sistema indica qué acción ejecuta y en qué archivo, demuestra partida completa de lobby a resultados, identifica componentes sin lógica y reemplaza el falso comportamiento por implementación real. Prioriza errores que bloquean juego, movimiento, cámara, armas, colisiones, IA, daño, victoria, persistencia y retorno al lobby. Si falta backend, marca explícitamente offline/simulado. No reescribas todo desde cero.

## Prompt de continuidad para sesiones nuevas

> Continúa este mismo proyecto. Lee `README.md`, `ROADMAP.md`, `ARCHITECTURE.md` y la especificación maestra. Resume en 8 líneas el estado real confirmado, identifica fase y siguiente tarea de mayor prioridad, revisa la build y corrige errores antes de agregar nuevas funciones. No reconstruyas archivos ya completos, no cambies dependencias innecesariamente, aplica parches pequeños y registra pruebas.

## Prompt de auditoría de vigencia antes de cada fase

> Verifica el archivo `DOSSIER_ACTUALIZACION_FORTNITE_PILLARS_NOV2026.md` y contrasta `sourceVersion` por isla de Pillars. Muestra primero una tabla `modo/creador/código/versión/mecánica/estado implementado/evidencia`. Si un dato corresponde a versión anterior, etiquétalo `historical`; si es invento original, `original_proposal`. No reemplaces configuración verdadera por supuestos. Implementa solo el alcance de esta fase, corre tests y actualiza roadmap.

## Recomendación de tecnología

- **Para ver avances jugables directamente en navegador:** React + Three.js / React Three Fiber + física y TypeScript. Los gráficos serán estilizados; multijugador real requiere servicios adicionales.
- **Para una versión 3D de calidad AAA a largo plazo:** Unreal Engine 5, contenidos artísticos originales, rigs y animaciones, C++/Blueprints y backend. Claude puede ayudar a producir código y documentación, pero no sustituye por sí solo todas las herramientas del editor.

La combinación más eficiente suele ser **prototipo web primero para validar gameplay**, después decidir si conviene migrar a Unreal según el objetivo y los recursos.


# MENSAJE DE INICIO LISTO PARA PEGAR EN CLAUDE

> Tengo un dossier técnico y visual completo adjunto. Tu tarea es programar un videojuego 3D original, competitivo y jugable, de cámara tercera persona, con profundidad funcional comparable a un Battle Royale moderno. Lee toda la documentación y toma como fuente de verdad las reglas verificadas al 10/11/2026. No copies marcas, personajes, música ni assets sin licencia. Primero inspecciona el entorno y el proyecto existente, elige un stack viable y desarrolla la Fase 0: lobby interactivo, personaje controlable, disparos, IA enemiga, vida/escudo, HUD, inventario mínimo, resultado de partida y retorno a lobby. Ejecuta build y pruebas reales. Entrega archivos o cambios de código, el estado de implementación, pruebas superadas y el siguiente paso. No hagas botones falsos, no borres trabajo previo, no alegues multiplayer real sin servidores y no intentes construir todos los modos de una vez.

---
