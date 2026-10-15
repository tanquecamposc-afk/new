# RAMPAZO 1v1 — información del juego

Duelo de construcción 1 contra 1 en 3D, para el navegador. Todo el juego está en un solo archivo: `index.html` (unas 1.850 líneas, 111 KB). Usa la librería 3D **Three.js 0.160**, que se carga desde internet al abrir el archivo.

Personajes, nombres, arena y sonidos son originales. Los sonidos se generan con código y no hay imágenes externas.

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

### Dificultades del rival
| Dificultad | Cómo juega |
|---|---|
| Fácil | Apunta mal y casi no construye |
| Normal | Se cubre con muros cuando le das |
| Difícil | Sube en rampa si tienes la altura y se encierra para curarse |
| Pro | Construye sin parar y apunta mejor |

### Equipo de cada ronda
- **Armas:** pico, escopeta (legendaria), rifle de asalto (épico), subfusil (raro) y francotirador (épico), más 4 mini escudos (+25 de escudo cada uno).
- **Vida y escudo:** 100 + 100.
- **Materiales:** 500 de madera, 300 de piedra y 200 de metal. Cada pieza cuesta 10.
- **Piezas:** cada casilla mide 5 × 5 metros. Resistencia: madera 150, piedra 300 y metal 500. Nacen débiles y se refuerzan en un segundo.

---

## Controles por defecto (todos se cambian en Ajustes → Controles)

| Tecla | Acción |
|---|---|
| `W` `A` `S` `D` | Moverse |
| `Espacio` | Saltar |
| `Shift` | Correr |
| `X` | Agacharse (más precisión) |
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
1. Apunta a una pieza tuya (muro, suelo o rampa) y pulsa `E`.
2. Aparece una cuadrícula: **3×3 en muros** y **2×2 en suelos**. Haz clic o arrastra para marcar las casillas que quieres quitar.
3. Pulsa `E` otra vez para confirmar. Si activas "Editar al soltar", se confirma al soltar `E`.
4. En las **rampas**, cada clic las gira hacia otro lado.
5. **Clic derecho** borra la selección. **`T`** devuelve la pieza a su forma original.

---

## Ajustes

| Pestaña | Opciones |
|---|---|
| Controles | Reasignar todas las teclas. Si una tecla ya estaba usada, se intercambia |
| Ratón | Sensibilidad general, al apuntar y con mira telescópica; invertir eje vertical |
| Mira | Estilo (cruz, cruz y punto, punto, círculo, en T), color, tamaño, separación, grosor, borde |
| Gráficos | Calidad (automática, baja, media o alta), campo de visión, bordes de piezas, contador de FPS |
| Juego | Distancia de la cámara, hombro izquierdo o derecho, editar al soltar, retraso al construir seguido, recarga automática, números de daño, vida del rival |

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
| 382 | COLISIONES | Piezas de construcción: crear, edición por casillas, destruir |
| 547 | FÍSICA | Gravedad, rampas y conos, choques con muros, caída |
| 608 | PERSONAJES | Modelo 3D por bloques, accesorios, animaciones y baile |
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
