# RAMPAZO 1v1 — información del juego

Duelo de construcción 1 contra 1 en 3D, para el navegador. Todo el juego está en un solo archivo: `index.html` (unas 2.730 líneas, 168 KB). Usa la librería 3D **Three.js 0.160**, que se carga desde internet al abrir el archivo.

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
- **Personajes:** chaqueta con cuello, cremallera y hombreras; cinturón; rodilleras, botas y guantes; y ojos con brillo.
- **Armas:** un modelo distinto para cada una, con detalles del color de su rareza.
- **Inventario y menú:** casillas con fondo del color de la rareza, iconos de vida, escudo, materiales y construcción, y un pedestal iluminado en el menú.

---

## Cómo jugar

1. Guarda `index.html` en tu computadora.
2. Ábrelo con Chrome, Edge o Firefox. Necesitas internet para cargar Three.js.
3. Elige modo y dificultad, pasa por la **Taquilla** si quieres cambiar de personaje y pulsa **¡A PELEAR!**
4. Haz clic en la pantalla para capturar el ratón. Con `Esc` pausas.

### Modos
| Modo | Qué es |
|---|---|
| Duelo | Arena abierta. Gana quien llegue primero a 5 rondas |
| Box fight | Cada uno empieza encerrado en una caja de metal |
| Práctica | Materiales infinitos y un maniquí que se mueve de lado a lado |
| Reto de edición | Delante aparece una pieza (muro, suelo o cono) con casillas rojas. Quítalas lo más rápido que puedas: son 10 ediciones contrarreloj y se guarda tu récord. Si quitas casillas de más, la pieza se reinicia |

### Dificultades del rival
| Dificultad | Cómo juega |
|---|---|
| Fácil | Apunta mal y casi no construye |
| Normal | Se cubre con muros cuando le das y se asoma abriendo una ranura en su muro |
| Difícil | Sube en rampa si tienes la altura y se encierra para curarse |
| Pro | Construye sin parar y apunta mejor |

### Combate
- **Disparos:** destello en el cañón, temblor de cámara al disparar (más fuerte con escopeta y francotirador) y al recibir daño, y marcas de bala en las piezas.
- **Indicador de daño:** cuando te disparan, sale un arco rojo alrededor de la mira que apunta hacia el rival.
- **Poca vida:** con menos de 35 de vida, los bordes de la pantalla laten en rojo y se oye un latido.
- **Animaciones:** al cambiar de arma, el arma sube desde abajo; al recargar, se inclina hacia un lado.
- **Escudo roto:** cuando le rompes el escudo al rival suena un aviso y sale el texto "ESCUDO ROTO".
- **Eliminación:** el personaje eliminado gira, sube y se deshace en cubos.
- **Registro de eliminaciones:** arriba a la derecha dice quién eliminó a quién, con qué arma y si fue a la cabeza.
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
- **Piezas:** cada casilla mide 5 × 5 metros. Resistencia: madera 150, piedra 300 y metal 500. Nacen débiles y se refuerzan en un segundo.
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
| Juego | Volumen, distancia de la cámara, hombro izquierdo o derecho, editar al soltar, retraso al construir seguido, recarga automática, números de daño, vida del rival |

Los ajustes y tu personaje se guardan en el navegador (`localStorage`).

## Taquilla
- **Personajes:** 7 originales (Chispa, Glaciar, Musgo, Medianoche, Brasa, Coral y Tuerca).
- **Qué se cambia:** nombre, colores (camiseta, pantalón, piel y detalles), cabeza (pelo, gorra, gorro, casco, cresta, antena, auriculares), espalda (mochila, alas, tanques, nada) y cara (visor u ojos).
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
- **Rondas para ganar:** `const WIN_ROUNDS = 5;`
- **Daño, cargador o cadencia de cada arma:** el objeto `WEAPONS`.
- **Resistencia de los materiales:** el objeto `MATS`.
- **Puntería y comportamiento del rival:** el objeto `DIFF`, donde `err` es el error de puntería, `react` el tiempo de reacción, `build` las ganas de construir y `fire` lo lento que dispara.
- **Materiales al empezar:** la función `loadout`.
- **Nuevo personaje:** añade una línea a `PRESETS`.
