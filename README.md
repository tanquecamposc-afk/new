# NEXO: Tower Defense 🏰

Juego de defensa de torres hecho en **HTML5 + Canvas + JavaScript puro** — un solo archivo, sin dependencias ni assets externos. Interfaz completamente en español.

## ▶ Cómo jugar

Abre `index.html` en cualquier navegador moderno. No necesita servidor ni instalación.

**Objetivo:** sobrevive a las **40 olas** de enemigos y derrota al **Coloso del Vacío**. Si lo logras, se desbloquea el **modo infinito ∞**.

## 🗺 Mapas

| Mapa | Dificultad |
|---|---|
| Pradera Verde | Fácil |
| Desierto Carmesí | Medio (+15% vida enemiga) |
| Glaciar Nocturno | Difícil (+30% vida enemiga) |

El récord de olas de cada mapa se guarda en tu navegador.

## 🗼 Torres (9 tipos, 5 niveles cada una)

| Torre | Costo | Rol |
|---|---|---|
| 🔫 Recluta | $200 | Básica y barata; gana detección al nivel 4 |
| 🌀 Artillero | $550 | Cadencia altísima |
| 🎯 Francotirador | $400 | Enorme alcance y daño; ve ocultos desde nivel 1 |
| ❄️ Congelador | $450 | Pulsos de área que ralentizan |
| 💣 Demoledor | $700 | Daño explosivo en área |
| 🔥 Piromante | $500 | Chorro de fuego que incendia (daño con el tiempo) |
| ⚡ Tesla | $900 | Rayos en cadena; ve ocultos |
| 🌾 Granja | $300 | Genera dinero al final de cada ola |
| 📣 Comandante | $850 | Aura que acelera la cadencia de torres cercanas |

Cada torre puede **mejorarse** (⬆), **venderse** (70% de reembolso) y cambiar su **modo de objetivo**: primero, último, más fuerte o más cercano.

## 👾 Enemigos

- **Normal / Veloz / Blindado** — la carne del enjambre.
- **👻 Sombra** — invisible para torres sin detección 👁.
- **✚ Curandero** — sana a los enemigos cercanos: elimínalo primero.
- **Tanque** — lento pero enorme.
- **☠ DEVORADOR** — jefe cada 10 olas, con barra de vida propia.
- **💀 EL COLOSO DEL VACÍO** — jefe final de la ola 40.

## ⌨ Controles

| Tecla / acción | Efecto |
|---|---|
| `1`–`9` | Seleccionar torre para colocar |
| Clic izquierdo | Colocar / seleccionar torre |
| `Shift` + clic | Colocar varias torres seguidas |
| Clic derecho / `ESC` | Cancelar |
| `Espacio` | Pausa |
| `F` | Velocidad x1 / x2 / x3 |

## 🔊 Sonido

Todos los efectos de sonido se generan en tiempo real con WebAudio (sin archivos de audio). Botón 🔊 para silenciar.

---

# TORMENTA: Battle Royale 🌀

Un **battle royale en 3D** para el navegador, inspirado en el género (saltar de un vehículo, saquear, construir y sobrevivir a la tormenta). Todo es original: nombre, personajes, mapa y lugares. Está en `tormenta/index.html` y usa Three.js desde CDN.

## ▶ Cómo jugar

Abre `tormenta/index.html` en un navegador moderno (con conexión a internet para cargar Three.js). Elige atuendo, pulsa **JUGAR** y haz clic para capturar el ratón.

- **25 jugadores** (tú + 24 bots con IA que saquean, construyen coberturas, se curan y pelean entre ellos).
- **Dirigible**: pulsa `Espacio` para saltar, cae en picado y planea hasta donde quieras aterrizar.
- **Botín** con 5 rarezas (Común → Legendario): pistola, subfusil, rifle de asalto, escopeta y francotirador; vendas, botiquines, mini escudos y pociones de escudo; munición y materiales. Abre **cofres dorados** dentro de las casas.
- **Recolección** con el pico: árboles → madera, rocas → piedra, coches y casas → metal/madera.
- **Construcción** en cuadrícula: muros, suelos y rampas de madera, piedra o metal (cada material tiene distinta resistencia). Las piezas bloquean balas y se pueden destruir.
- **Tormenta** que se cierra en 6 fases, con daño creciente.
- Mapa con 7 zonas: Villa Ladrillo, Puerto Óxido, Granja Girasol, Cima Ventosa, Plaza Central, Bosque Susurro y Lago Sereno.

## ⌨ Controles

| Tecla | Acción |
|---|---|
| `W A S D` · `Espacio` · `Shift` | Moverse · saltar · correr |
| Ratón · clic izq. · clic der. | Apuntar · disparar/construir · mira (zoom) |
| `1`–`6` / rueda | Cambiar de objeto (1 = pico) |
| `Z` / `X` / `C` | Construir muro / suelo / rampa (10 de material) |
| `Q` · `G` | Entrar/salir del modo construcción · cambiar material |
| `E` · `R` | Abrir cofre / recoger · recargar |

---

# RAMPAZO 1v1 🧱

Duelo de construcción **1 contra 1** contra un rival robótico, en 3D y en el navegador. Está en `rampazo/index.html` (Three.js desde CDN).

- **Modos:** Duelo (arena abierta, gana quien llegue a 5 rondas), Box fight (empiezas encerrado en una caja de metal) y Práctica (materiales infinitos y un maniquí).
- **Rival con 4 dificultades** (Fácil, Normal, Difícil, Pro): se cubre con muros y rampas cuando le das, sube en rampa si tienes la altura, se encierra para beber escudo y rompe tus construcciones a balazos.
- **Equipo fijo por ronda:** escopeta, rifle de asalto, subfusil, francotirador y 4 mini escudos. 100 de vida + 100 de escudo y 500/300/200 de madera, piedra y metal.
- **Construcción completa:** muro, suelo, rampa y cono. Las piezas nacen débiles y se refuerzan en un segundo. Los muros propios se **editan** con `E` (muro → puerta → ventana).
- **Pico** para romper construcciones, **agacharse** con `X` (más precisión) y menú de **pausa** con `Esc`.
- **Ajustes:** sensibilidad, campo de visión, calidad gráfica (Baja/Media/Alta), bordes de construcción y contador de FPS. Se guardan en tu navegador.
- **Gráficos:** cielo con degradado, nubes, destello al disparar, piezas que tiemblan al recibir daño y vida de la pieza a la que apuntas.
- **Ajustes completos:** todas las teclas se pueden reasignar; sensibilidad general, al apuntar y con mira telescópica; invertir eje; mira personalizable (estilo, color, tamaño, separación, grosor, borde); calidad, campo de visión, editar al soltar, retraso de construcción, recarga automática y más.
- **Construcción por mira:** muros, suelos y conos aparecen donde apuntas.
- **Edición por casillas:** muros de 3×3 y suelos de 2×2 (clic y arrastrar para marcar), rampas que giran, restablecer con `T` o clic derecho.
- **Taquilla:** 7 personajes originales, colores, cabeza, espalda y cara a elegir, con vista 3D que se gira arrastrando. Baile con `B`.
- **Controles por defecto:** `WASD` moverse, `Espacio` saltar, `Shift` correr, `X` agacharse, `1`–`6` pico/armas/escudo, `Q` muro, `Z` suelo, `C` rampa, `V` cono, `E` editar, `T` restablecer edición, `F` modo construcción, `G` material, `R` recargar, `B` bailar, `Esc` pausa.

---

# Lupa 🔍

Página de resultados de búsqueda propia (`lupa/index.html`) que muestra los juegos de este repositorio con ficha, galería de capturas reales, resultados enlazados y panel "Acerca de". Busca solo entre NEXO, Tormenta y Rampazo 1v1, y tiene pestañas de Imágenes y Novedades (sacadas de los commits).

---

# Ficha de Tormenta 🌀

Página de presentación del juego Tormenta en `ficha/index.html`, con las capturas en `ficha/img/`. Tiene galería con visor, tarjeta de novedades, datos del juego, botón para jugar, enlaces y panel "Acerca de" desplegable.
