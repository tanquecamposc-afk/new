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
