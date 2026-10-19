# RAMPAZO 1v1 — información del juego

Duelo de construcción 1 contra 1 en 3D, para el navegador. Todo el juego está en un solo archivo: `index.html` (unas 3.563 líneas, 236 KB). Usa la librería 3D **Three.js 0.160**, que se carga desde internet al abrir el archivo.

Personajes, nombres, arena y sonidos son originales. Los sonidos se generan con código y no hay imágenes externas.

### Aspecto visual
- **Luz:**
  - Mapeo de tonos de cine.
  - Sol bajo que da sombras largas y suaves.
  - Iluminación ambiental calculada a partir del cielo.
  - Una viñeta suave en los bordes de la pantalla.
- **Materiales físicos:** la tela, la piel, el plástico y el metal de personajes y armas reaccionan a la luz, y el metal refleja el cielo.
- **Piezas:**
  - Madera de tablones con veta, piedra de ladrillos irregulares y metal de chapa ondulada con remaches.
  - Todas llevan marco y tornillos en las esquinas.
  - Ya no tienen bordes negros (se pueden volver a activar en Ajustes → Gráficos).
- **Isla:**
  - Césped con manchas y briznas de varios tonos.
  - Árboles redondos y pinos, rocas y colinas.
  - Una playa y el mar alrededor, con montañas a lo lejos.
  - Cielo con sol, halo y bruma en el horizonte.
- **Personajes:**
  - Proporciones de héroe: piernas más largas, torso en V con pecho marcado y la cabeza más proporcionada respecto al cuerpo.
  - Articulaciones: rodillas y codos que se doblan al andar, saltar, agacharse, deslizarse, bailar y recargar.
  - La cabeza sigue la mirada (sube y baja al apuntar) y el cuerpo respira cuando está quieto.
  - Chaqueta con capucha, cuello, cremallera y hombreras; cinturón; rodilleras, botas y guantes con pulgar; y ojos con brillo.
- **Armas:** un modelo distinto para cada una, con detalles del color de su rareza.
- **Inventario y menú:** casillas con fondo del color de la rareza, iconos de vida, escudo, materiales y construcción, y un pedestal iluminado en el menú.
- **Menú principal:** barra de arriba con Jugar, Pase, Clasificatoria, Taquilla y Ajustes, y una tarjeta con tu nivel, título y rango. Los modos se eligen en tarjetas con icono, categoría y descripción.
- **Minimapa:** arriba a la derecha. Muestra las piezas por material, tu flecha, el rival cuando lo ves y el anillo de la zona. Debajo hay una fila con el tiempo de la ronda (o el de la zona), los jugadores vivos y tus eliminaciones.
- **Pantalla de carga:** logo, barra animada y un consejo al azar.
- **Avisos de eliminación:** al eliminar al rival sale en grande "ELIMINASTE A …" con el arma y tu cuenta de eliminaciones; si te eliminan, "TE ELIMINÓ …".
- **Pantalla final:** puesto (#1 o #2). Si ganas sale "¡REY DEL RAMPAZO!" con rayos que giran y confeti.
- **Vestíbulo:** las misiones de hoy aparecen junto al botón de jugar.
- **Tormenta:** la pared de la zona es una cortina morada con franjas y nubes que se mueven.
- **Polvo:** al caer desde un salto alto se levanta polvo.

---

## Cómo jugar

1. Guarda `index.html` en tu computadora.
2. Ábrelo con Chrome, Edge o Firefox. Necesitas internet para cargar Three.js.
3. Elige modo y dificultad, pasa por la **Taquilla** si quieres cambiar de personaje y pulsa **¡A PELEAR!**
4. Haz clic en la pantalla para capturar el ratón. Con `Esc` pausas.

### Modos
| Modo | Categoría | Qué es |
|---|---|---|
| Duelo | Clásico | Arena abierta. Gana quien llegue primero a 5 rondas |
| Clasificatoria | Competitivo | Al mejor de 5 rondas (gana quien llegue a 3). Ganas o pierdes puntos de rango y el rival se ajusta a tu rango (ver abajo) |
| Box fight | Clásico | Cada uno empieza encerrado en una caja de metal. Primero a 5 |
| Zona que cierra | Arcade | Un anillo de energía morado empieza a cerrarse a los 8 s y tarda 40 s en quedar pequeño. Fuera del anillo pierdes vida cada medio segundo (más cuanto más cerrado está). El rival también vuelve al anillo. Primero a 3 |
| Reaparición | Arcade | Cuando te eliminan, reapareces a los 3 s cayendo desde el cielo en un sitio lejos del rival, y las construcciones se quedan. Gana quien llegue antes a 7 eliminaciones |
| Sin construir | Arcade | No se puede construir. El mapa trae muros de piedra y madera repartidos para cubrirse. Primero a 3 |
| Práctica | Entrenamiento | Materiales infinitos y un maniquí que se mueve de lado a lado |
| Reto de edición | Entrenamiento | Delante aparece una pieza (muro, suelo o cono) con casillas rojas. Quítalas lo más rápido que puedas: son 10 ediciones contrarreloj y se guarda tu récord. Si quitas casillas de más, la pieza se reinicia |

### Clasificatoria (rangos)
- **8 rangos:** Bronce, Plata, Oro, Platino y Diamante (cada uno con divisiones I, II y III), y después Élite, Campeón y Leyenda. Cada uno tiene su escudo de color.
- **Puntos de rango (PR):** cada división son 100 PR. Ganar da entre 12 y 40 PR, más si ganas con margen. Perder quita menos si conseguiste alguna ronda. Cuanto más alto el rango, menos se gana y más se pierde.
- **Protección de rango:** puedes perder puntos, pero nunca bajas del rango que ya alcanzaste.
- **Rival según tu rango:** Bronce juega en Fácil, Plata y Oro en Normal, Platino y Diamante en Difícil, y de Élite en adelante en Pro.
- **Pestaña Clasificatoria:** tu escudo, la barra hasta la siguiente división, la escalera de rangos y tu carrera (partidas, victorias, % de victorias, eliminaciones, racha, mejor rango y récord de edición).
- Al terminar una clasificatoria se ve cuántos PR ganaste o perdiste, y si ascendiste.

### Pase de temporada
- **30 niveles** con una recompensa en cada uno. Todas son gratis.
- **Recompensas:** personajes nuevos (Brasa, Coral, Tuerca, Neón, Obsidiana, Aurora, Lava y Dorado), cabezas (cresta, auriculares, antena, orejas, cuernos, halo y corona), espaldas (tanques, alas, capa y propulsor), caras (gafas de sol y pañuelo) y títulos que se muestran en tu tarjeta (Constructor, Editor veloz, Rey de la rampa…).
- Lo que aún no tienes sale bloqueado en la Taquilla con el nivel que lo desbloquea.
- **Cómo se gana experiencia (XP):**
  - Eliminación: 100 (+25 si es a la cabeza).
  - Ronda ganada: 75.
  - Partida terminada: 200, y la victoria +300.
  - Primera victoria del día: +400.
  - Racha de victorias: hasta +250.
  - Construir, editar y hacer daño también suman al final de la partida.
  - Reto de edición completado: 200 (+100 si es récord).
- **Misiones diarias:** cada día salen 3 misiones (por ejemplo "Construye 80 piezas" o "Elimina 3 veces con la escopeta"). Cada una da 500 XP.
- Al subir de nivel sale un aviso con lo desbloqueado. Al final de cada partida se ve el desglose de XP y la barra de nivel.
- Tu nivel, experiencia, rango y estadísticas se guardan en este navegador.

### Dificultades del rival
| Dificultad | Cómo juega |
|---|---|
| Fácil | Apunta mal y casi no construye |
| Normal | Se cubre con muros cuando le das y se asoma abriendo una ranura en su muro |
| Difícil | Sube en rampa si tienes la altura y se encierra para curarse |
| Pro | Construye sin parar y apunta mejor |

### Movimiento
- **Trepar:** si mantienes `Espacio` frente a un obstáculo de entre 0,6 y 3,6 m (un muro bajo, una rampa, una caja), el personaje se agarra al borde y sube encima.
- **Deslizarse:** corriendo, pulsa agacharse.

### Combate
- **Disparos:** destello en el cañón, temblor de cámara al disparar (más fuerte con escopeta y francotirador) y al recibir daño, y marcas de bala en las piezas.
- **Indicador de daño:** cuando te disparan, sale un arco rojo alrededor de la mira que apunta hacia el rival.
- **Poca vida:** con menos de 35 de vida, los bordes de la pantalla laten en rojo y se oye un latido.
- **Animaciones:** al cambiar de arma, el arma sube desde abajo; al recargar, se inclina hacia un lado.
- **Escudo roto:** cuando le rompes el escudo al rival suena un aviso y sale el texto "ESCUDO ROTO".
- **Eliminación:** el personaje eliminado gira, sube y se deshace en cubos.
- **Registro de eliminaciones:** arriba a la derecha dice quién eliminó a quién, con qué arma y si fue a la cabeza.
- **Espectador:** cuando te eliminan, la cámara sigue al rival y gira a su alrededor; abajo se lee "Espectando a …" y cuánto falta para volver.
- **Escudo:** el daño de la tormenta y el de las caídas no pasa por el escudo, va directo a la vida (como en el género).
- **Baile de victoria:** al ganar una ronda tu personaje baila.
- **Rival listo:** desde Normal, si está detrás de un muro suyo, abre una ranura para asomarse, dispara y la vuelve a cerrar. Lo hace sobre todo en Box fight.

### Sonido
- **Dirección:** los disparos, las construcciones y los pasos del rival se oyen por el lado de donde vienen.
- **Pasos:** cambian según si pisas césped o piezas.
- **Por material:** madera, piedra y metal suenan distinto al construir y al romperse.
- **Volumen:** se cambia en Ajustes → Juego.
- **Ver los sonidos:** opción en Ajustes → Juego. Muestra iconos alrededor de la mira en la dirección de los pasos, disparos y construcciones del rival.

### Equipo de cada ronda
- **Armas:** pico, escopeta (legendaria), rifle de asalto (épico), subfusil (raro) y francotirador (épico), más 4 mini escudos (+25 de escudo cada uno).
- **Vida y escudo:** 100 + 100.
- **Materiales:** 500 de madera, 300 de piedra y 200 de metal. Cada pieza cuesta 10.
- **Piezas:** cada casilla mide 5 × 5 metros. Resistencia final: madera 150, piedra 300 y metal 500.
- **Tiempo de construcción:** cada pieza nace con poca vida y se va llenando mientras se ve como un plano azul brillante. La madera es la más rápida (nace con 90 y tarda 4 s), la piedra tarda 11,5 s (nace con 100) y el metal 24,5 s (nace con 110). Por eso la madera es buena para construir rápido y el metal aguanta más cuando ya está terminado.
- **Física de las construcciones:**
  - Para colocar una pieza tiene que tocar el suelo o algo ya construido. No se construye flotando, y la vista fantasma se pone roja.
  - Una pieza aguanta si está unida, aunque sea a través de otras, a algo que toca el suelo. Si rompes la base, lo que queda en el aire se cae en cascada: primero lo más cercano a la rotura, y cada pieza cae girando.
  - Las rampas son sólidas por los lados y por debajo, y los suelos hacen de techo: no se atraviesan subiendo por una rampa.
  - Si una pieza aparece encima de ti, no te empuja lejos.

---

## Controles por defecto (todos se cambian en Ajustes → Controles)

| Tecla | Acción |
|---|---|
| `W` `A` `S` `D` | Moverse |
| `Espacio` | Saltar |
| `Shift` | Correr |
| `X` | Agacharse (más precisión). Si vas corriendo, te deslizas por el suelo; puedes saltar en mitad del deslizamiento |
| `1` – `6` / rueda | Pico, escopeta, rifle, subfusil, francotirador, mini escudo |
| Clic izquierdo | Disparar / construir (mantener = construir seguido) |
| Clic derecho | Apuntar (con el francotirador, mira telescópica) |
| `R` | Recargar |
| `Q` / `Z` / `C` / `V` | Muro / suelo / rampa / cono |
| `F` | Entrar o salir del modo construcción |
| `G` | Cambiar material |
| `E` | Editar la pieza a la que apuntas |
| `T` | Restablecer una pieza editada |
| `B` | Bailar |
| `Esc` | Pausa |

### Cómo se edita
1. Apunta a una pieza tuya (muro, suelo, rampa o cono) a **7,5 m o menos** y pulsa `E`. Si está más lejos, el aviso dice "lejos para editar". Las piezas del rival no se editan.
2. Aparece una cuadrícula: **3×3 en muros** y **2×2 en suelos, conos y rampas**. Haz clic o arrastra para marcar las casillas que quieres quitar.
3. Pulsa `E` otra vez para confirmar. Si activas "Editar al soltar", se confirma al soltar `E`.
4. En las **rampas**, arrastra sobre las casillas en la dirección en la que quieres que suba. Un clic sin arrastrar la gira.
5. **Clic derecho** borra la selección. **`T`** devuelve la pieza a su forma original.
6. Si te alejas más de 9 m mientras editas, la edición se cancela.

### Ediciones dobles y triples
- **Editar al soltar** viene activado: mantén `E`, marca y suelta. Se desactiva en Ajustes → Juego.
- Si ya tienes el clic pulsado al pulsar `E`, la casilla de la mira se marca al instante.
- Si apuntas un poco fuera de la cuadrícula, se marca la casilla del borde.
- Si con una edición abierta pulsas una tecla de construir o de arma, la edición se confirma. Así se encadenan editar, construir y volver a editar.
- En el modo **Práctica** se muestra cuánto tardó cada edición, para entrenar.

---

## Ajustes

| Pestaña | Opciones |
|---|---|
| Controles | Reasignar todas las teclas. Si una tecla ya estaba usada, se intercambia |
| Ratón | Sensibilidad general, al apuntar y con mira telescópica; invertir eje vertical |
| Mira | Estilo (cruz, cruz y punto, punto, círculo, en T), color, tamaño, separación, grosor, borde |
| Gráficos | Calidad (automática, baja, media o alta), campo de visión, bordes de piezas y contador de FPS. Si el equipo va lento, la automática baja primero la resolución, luego quita las sombras, después oculta los árboles y por último usa materiales simples. La baja va sin sombras ni árboles y con materiales simples |
| Juego | Volumen, distancia de la cámara, hombro izquierdo o derecho, editar al soltar, retraso al construir seguido, recarga automática, números de daño, vida del rival, ver los sonidos |

Los ajustes, tu personaje y tu progreso (nivel, rango, misiones) se guardan en el navegador (`localStorage`).

## Taquilla
- **Personajes:** 12 originales. Chispa, Glaciar, Musgo y Medianoche vienen desde el principio; Brasa, Coral, Tuerca, Neón, Obsidiana, Aurora, Lava y Dorado se desbloquean con el pase.
- **Qué se cambia:** nombre, colores (camiseta, pantalón, piel y detalles), cabeza (pelo, gorra, gorro, casco, cresta, antena, auriculares, orejas, cuernos, halo, corona), espalda (mochila, alas, tanques, capa, propulsor, nada) y cara (visor, ojos, gafas de sol, pañuelo).
- Las piezas que aún no tienes salen bloqueadas con el nivel del pase que las desbloquea.
- **Vista previa:** el personaje se gira arrastrando, y el botón "Probar baile" muestra el baile.

---

## Cómo está organizado el código (`index.html`)

| Líneas aprox. | Sección | Qué hace |
|---|---|---|
| 1 – 245 | HTML y CSS | Menús, HUD (vida, inventario, materiales, mira), pantallas de pausa, ajustes, taquilla y fin |
| 248 | CONSTANTES | Tamaño de celda (5 m), armas, materiales, personajes, dificultades y modos |
| 302 | ESCENA | Render, cielo, nubes, luces, suelo con cuadrícula y gradas |
| 382 | COLISIONES | Piezas de construcción: crear, edición por casillas, destruir, derrumbe de lo que queda sin apoyo |
| 547 | FÍSICA | Gravedad, rampas y conos, choques con muros, caída |
| 608 | PERSONAJES | Modelo 3D redondeado con ropa y cara detalladas, armas modeladas, accesorios, animaciones y baile |
| 723 | ENTIDADES | Jugador y rival, equipo de cada ronda |
| 758 | EFECTOS Y SONIDO | Chispas, trazadoras, números de daño, sonidos sintetizados |
| 835 | DISPAROS Y DAÑO | Disparos por rayos, disparos a la cabeza, daño a piezas |
| 917 | CONSTRUCCIÓN | Dónde se coloca cada pieza (según la mira), vista fantasma |
| 1011 | IA DEL RIVAL | Apuntar, cubrirse, subir en rampa, encerrarse y curarse |
| 1140 | JUGADOR | Teclas, ratón, ajustes, edición por casillas, movimiento, cámara |
| 1538 | RONDAS | Cuenta atrás, final de ronda y de partida |
| 1610 | HUD | Inventario, barras e información de la pieza apuntada |
| 1668 | BUCLE | Bucle principal y vestíbulo con el personaje |
| 1716 | MENÚ | Taquilla, pantalla de ajustes y botones |

### Cambios fáciles
- **Rondas para ganar:** el campo `rounds` de cada modo en `MODES`.
- **Rangos, pase y misiones:** los objetos `RANKS`, `PASS` y `QUESTS`. La experiencia por nivel está en `xpNeed`.
- **Daño, cargador o cadencia de cada arma:** el objeto `WEAPONS`.
- **Resistencia de los materiales:** el objeto `MATS`.
- **Puntería y comportamiento del rival:** el objeto `DIFF`, donde `err` es el error de puntería, `react` el tiempo de reacción, `build` las ganas de construir y `fire` lo lento que dispara.
- **Materiales al empezar:** la función `loadout`.
- **Nuevo personaje:** añade una línea a `PRESETS`.

---

## Investigación: qué tiene un juego de construcción tipo battle royale y qué tiene Rampazo

| Elemento | Cómo suele funcionar en el género | En Rampazo |
|---|---|---|
| Materiales | Madera rápida y débil, piedra intermedia, metal lento y resistente | Igual: 90→150 en 4 s, 100→300 en 11,5 s, 110→500 en 24,5 s, con plano azul mientras se construye |
| Movimiento | Correr, deslizarse y trepar a bordes | Correr, deslizarse y trepar obstáculos de hasta 3,6 m |
| HUD | Minimapa arriba a la derecha, vida y escudo abajo a la izquierda | Igual |
| Clasificatoria | Rangos Bronce → Diamante con divisiones I–III y tres rangos únicos arriba; puntos por resultado | 8 rangos propios con PR, protección de rango y rival según tu rango |
| Pase de temporada | Niveles con recompensas, experiencia por jugar y misiones diarias | 30 niveles gratis, XP por partida y 3 misiones diarias |
| Menú | Barra superior con Jugar, Pase, Taquilla… | Igual, con tarjeta de nivel y rango y misiones en el vestíbulo |
| Debajo del minimapa | Tiempo de la tormenta, jugadores vivos y eliminaciones | Igual |
| Daño de tormenta y caídas | Ignora el escudo | Igual |
| Modos | Battle royale, sin construir, con reaparición, clasificatoria, creativo | Duelo, Clasificatoria, Box fight, Zona que cierra, Reaparición, Sin construir, Práctica y Reto de edición |
| Estilo visual | Colores vivos y siluetas gruesas para ver bien a los rivales | Colores saturados, personajes redondeados y luz suave |
| Iluminación | Luz global y cielo realista | Mapeo de tonos de cine, luz ambiental del cielo y sombras suaves |

Fuentes consultadas:
- Materiales y tiempos de construcción: [Gfinity](https://www.gfinityesports.com/fortnite/how-to-build-in-fortnite-keybinds-tips-templates/), [PCGamesN](https://www.pcgamesn.com/fortnite/fortnite-building-buffs), [ComicBook](https://comicbook.com/gaming/news/fortnite-building-materials-nerf/?nb=1)
- Movimiento: [GGRecon](https://www.ggrecon.com/guides/fortnite-how-to-tactical-sprint-and-mantle/), [documentación de Epic](https://dev.epicgames.com/documentation/fortnite/player-movements-in-fortnite-creative)
- HUD: [Gfinity](https://www.gfinityesports.com/fortnite/fortnite-beginners-guide-2021-tips-and-tricks-you-need-to-know-when-starting-out-pc-switch-xbox-one-series-s-x-ps4-ps5/)
- Iluminación: [Unreal Engine](https://www.unrealengine.com/en-US/tech-blog/lumen-brings-real-time-global-illumination-to-fortnite-battle-royale-chapter-4)
- Menú: [Dexerto](https://www.dexerto.com/fortnite/fortnite-finally-gets-long-awaited-ui-revamp-2329726)
- Clasificatoria: [esports.gg](https://esports.gg/guides/fortnite/fortnite-ranks/), [esports.net](https://www.esports.net/wiki/guides/fortnite-ranks/), [GGRecon](https://cms.ggrecon.com/guides/fortnite-ranked/)
- Pase de temporada: [esports.gg](https://esports.gg/news/fortnite/how-fortnite-battle-pass-works/)
- Estilo visual: [PSU](https://www.psu.com/news/the-secret-genius-of-fortnites-art-style/), [Kotaku](https://kotaku.com/why-the-gears-of-war-people-decided-to-make-fortnite-le-5940662), [charla GDC en Game Developer](https://gamedeveloper.com/art/video-developing-the-stylized-art-of-i-fortnite-i-)
- HUD y tormenta: [Gfinity](https://www.gfinityesports.com/fortnite/fortnite-beginners-guide-2021-tips-and-tricks-you-need-to-know-when-starting-out-pc-switch-xbox-one-series-s-x-ps4-ps5/), [FortniteHUD](https://github.com/RobMeade/FortniteHUD), [ayuda de Epic](https://www.epicgames.com/help/fortnite-battle-royale-c-202300000001636/gameplay-c-202300000001721/hud-a202300000011110)
- Modos: [Dot Esports](https://dotesports.com/fortnite/news/all-fortnite-game-modes-explained), [WallStreetMojo](https://www.wallstreetmojo.com/fortnite-game-modes-guide)

Todo lo de Rampazo (nombres de rangos, personajes, recompensas, iconos y sonidos) es original; solo se toma la idea general de cómo funcionan estos sistemas.
