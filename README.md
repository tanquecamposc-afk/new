# Proyectos escolares

| Proyecto | Archivo | Curso |
|---|---|---|
| 🛣️ **Vía Expresa Elevada** — maqueta virtual interactiva de una carretera elevada adaptada al Perú | `maqueta-via-expresa.html` | EPT · 2026 |
| 🌉 **Intercambio vial en 3D** — visor 3D giratorio + modelo descargable en formato OBJ | `modelo-3d.html` | EPT · 2026 |
| 🏰 **NEXO: Tower Defense** — juego en HTML5 Canvas | `index.html` | — |

Cada proyecto es un solo archivo HTML sin dependencias: descárgalo y ábrelo en cualquier navegador.

## 🛣️ Vía Expresa Elevada (EPT 2026)

Maqueta virtual de un **viaducto elevado sobre la Vía Expresa de Lima**, hecha para el curso de Educación para el Trabajo. Incluye:

- **Maqueta isométrica interactiva**: modo día/noche, despiece por capas, tráfico animado (Metropolitano con parada en estación, congestión abajo, flujo rápido arriba) y 8 puntos clicables que explican cada parte.
- **Corte transversal técnico** estilo plano, con cotas y leyenda.
- **Adaptaciones al Perú**: aisladores sísmicos (E.030), cimentación en la grava del Rímac, drenaje para El Niño, gálibo para el Metropolitano y ciclovía.
- **Guía de la maqueta física**: escala 1:100, medidas, materiales con presupuesto en soles (≈ S/ 90), paso a paso y cronograma de 4 semanas.

### 🌉 Intercambio vial en 3D (`modelo-3d.html`)

Versión **intercambio a desnivel** inspirada en los grandes cruces de autopista: viaducto principal, avenida transversal en puente, **dos rampas curvas**, lagunas y áreas verdes.

- **Visor 3D integrado** (sin dependencias ni internet): arrastra para girar, rueda para acercar, vistas aérea / rasante / superior y rotación automática.
- **Modelo 3D real** en `modelo-3d/via-expresa-elevada.obj` + `.mtl` (1 unidad = 1 metro), descargable desde la misma página. Ábrelo en Blender, el Visor 3D de Windows, SketchUp o imprímelo en 3D (a escala 1:1000 mide 26 × 17 cm).
- El modelo se genera con `node tools/genera-modelo-3d.mjs`: cambia una medida en el script, ejecútalo y el OBJ y el visor se actualizan.

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
