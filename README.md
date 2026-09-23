# Proyectos escolares

| Proyecto | Archivo | Curso |
|---|---|---|
| 🛣️ **Vía Expresa Elevada** — maqueta de una carretera elevada para Lima | `maqueta-via-expresa.html` | EPT · 2026 |
| 🌉 **La misma vía en 3D** — modelo para girar, descargar e imprimir | `modelo-3d.html` | EPT · 2026 |
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

Un tramo de 210 m de la vía elevada con **dos rampas de salida** que bajan desde el medio, una por sentido, y desembocan en la avenida de abajo: sin salidas la vía embotella todo al final, porque entra mucho carro y no tiene por dónde irse. Abajo siguen el Metropolitano con su estación, la avenida y la ciclovía. Se gira con el mouse en la misma página, con tres vistas y una lámina descargable.

Las piezas no son cajas apiladas: cada una sale de su **corte transversal extruido**, que es como se dibujan de verdad las obras viales. De ahí salen los pilares que se afinan hacia arriba y rematan en cabezal de martillo, las barreras con el perfil New Jersey y el tablero de viga cajón con voladizos.

| Archivo | Para qué |
|---|---|
| `via-expresa.glb` | **El más fácil.** Un archivo, con colores. Doble clic en Windows. |
| `via-expresa.obj` + `.mtl` | Lo mismo en dos archivos; van juntos en la misma carpeta. |
| `via-expresa.stl` | Para imprimir en 3D. |
| `medidas.md` | La tabla de medidas reales. |
| `lamina-3-vistas.png` | Las tres vistas en una sola imagen, para imprimir. |

### 🧱 Versión para Tinkercad

El mismo modelo con menos detalle: los pilares y las barreras conservan su forma, y se simplifican los redondeos, las ruedas y las copas de los árboles. Queda en la tercera parte de piezas para que Tinkercad no se trabe.

| Archivo | Para qué |
|---|---|
| `via-expresa-tinkercad.obj` + `.mtl` | Multicolor. Los colores van en el `.mtl` y además escritos en cada vértice (`v x y z r g b`), así se ven aunque el programa no lea el `.mtl`. |
| `via-expresa-tinkercad-sincolor.obj` | Sin ninguna referencia de color, que es lo que Tinkercad acepta sin quejarse. |
| `via-expresa-tinkercad.stl` / `.glb` | STL para importar o imprimir, GLB para mirarlo con colores. |
| `piezas-tinkercad/*.obj` | El modelo partido en 6 pedazos por color. |

**Sobre los colores en Tinkercad:** Tinkercad no lee colores de ningún archivo 3D — muestra todo de un solo color y da error si le pasas el `.mtl`. Para tener la maqueta de colores ahí se importan los 6 archivos de `piezas-tinkercad/` uno por uno (calzan solos, comparten coordenadas) y se pinta cada uno con el balde de pintura.

### Cómo se genera

Todo sale de `node tools/genera-modelo.mjs`, que escribe los dos modelos, los seis pedazos, la tabla de medidas y los inyecta en `modelo-3d.html`. Si cambias una medida ahí, se actualiza todo junto y nunca se desfasa.

Dos detalles de implementación que cuestan de encontrar y ahí están resueltos:

- **Caras hacia afuera.** Cada pieza se arma, se le mide el volumen firmado y, si sale negativo, se le da la vuelta a todas sus caras. Con las normales al revés la luz sale mal en el GLB, el STL puede imprimirse invertido y el visor descarta justo las caras que sí se ven.
- **Nada apilado a la misma altura.** El asfalto no es una plancha encima del tablero sino la propia cara superior del tablero, pintada de otro color. Dos superficies a la misma cota se pelean por cuál se dibuja primero y aparecen manchas. Por lo mismo, cada franja del piso va unos centímetros más arriba que la anterior.
- **Ninguna cara pasa de unos 25 m.** Los visores que dibujan por orden de profundidad descartan un triángulo entero si uno de sus vértices queda detrás de la cámara: con una franja de piso de 210 m, al acercarte desaparecía el suelo. Las piezas largas se parten solas.

El visor tampoco usa tarjeta de video: pinta por capas (piso → lo que se para en el piso → tablero → lo que se apoya encima) y dentro de cada capa ordena de atrás hacia adelante.

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
