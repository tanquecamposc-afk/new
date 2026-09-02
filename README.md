# Proyectos escolares

| Proyecto | Archivo | Curso |
|---|---|---|
| 🛣️ **Vía Expresa Elevada** — maqueta de una carretera elevada para Lima | `maqueta-via-expresa.html` | EPT · 2026 |
| 🌉 **La misma vía en 3D** — el cruce completo, para girarlo y descargarlo | `modelo-3d.html` | EPT · 2026 |
| 🏰 **NEXO: Tower Defense** — juego en HTML5 Canvas | `index.html` | — |

Cada proyecto es un solo archivo HTML: lo descargas, le das doble clic y se abre en el navegador. No necesita internet ni instalar nada.

## 🛣️ Vía Expresa Elevada (EPT 2026)

La idea es construir una pista elevada encima de la Vía Expresa de Lima, para que entre el doble de carros sin quitarle espacio al Metropolitano ni a las casas de los costados.

La página tiene:

- Una **maqueta que se mueve**: botón de día/noche, un control para separar las piezas y ver cómo va armada por dentro, carros en movimiento y 11 partes que se pueden clicar para leer qué son.
- Un **dibujo de corte** con las partes señaladas y las dos medidas principales.
- Por qué **funciona en el Perú**: los aisladores de goma para los temblores, el suelo duro del Rímac, los desagües grandes por si llueve como en el Niño, y la altura de 8 metros para que pase el Metropolitano.
- **Cómo armar la maqueta en cartón**: escala 1:100, medidas, lista de materiales con precios en soles (unos S/ 90) y el paso a paso.

### 🌉 La misma vía en 3D (`modelo-3d.html`)

Un tramo de 96 metros de la vía elevada, con sus tres columnas, y abajo el Metropolitano con su estación, la pista de siempre y la ciclovía. Se **gira con el mouse** en la misma página, con tres vistas y rotación automática.

Los archivos del modelo están en `modelo-3d/` y también se bajan desde los botones de la página. Cada unidad es un metro real:

| Archivo | Para qué |
|---|---|
| `via-expresa-simple.glb` | **El más fácil.** Un solo archivo, ya trae los colores. Doble clic en Windows y se abre. |
| `via-expresa-simple.obj` + `.mtl` | Lo mismo pero en dos archivos; hay que dejarlos juntos en la misma carpeta. |
| `via-expresa-simple-tinkercad.obj` | OBJ sin el archivo de colores, para que Tinkercad no reclame. |
| `via-expresa-simple.stl` | Para Tinkercad e impresión 3D (sin colores). |

El modelo lo arma `node tools/genera-modelo-simple.mjs`: cambia una medida ahí, vuelve a ejecutarlo y se actualizan los cuatro archivos y el visor.

**Nota sobre el dibujo:** el visor no usa tarjeta de video, pinta las caras ordenadas de atrás hacia adelante. Para que nada se asome donde no debe, el modelo va en capas (piso → cosas paradas en el piso → losa de la pista → lo que se apoya sobre ella) y todas las caras miran hacia afuera, así las que dan la espalda a la cámara se descartan.

La versión anterior, que era un cruce grande con rampas y lagunas, quedó en los archivos `via-expresa-elevada.*` de la misma carpeta.

---

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
