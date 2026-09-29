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

# Blockverse 🧱

Juego de bloques en 3D (inspirado en juegos como bloxd.io), hecho desde cero con **Three.js**. Tiene dos modos:

- **Supervivencia:** vida, hambre, daño por caída, minado con tiempo según la herramienta, fabricación, horno, cofres, animales, zombis nocturnos y muerte con reaparición.
- **Creativo:** bloques infinitos, rotura instantánea y vuelo.

Abre `blockverse/index.html` en un navegador moderno (necesita internet para cargar Three.js desde cdnjs). Se juega con teclado y ratón; el mundo se guarda solo en el navegador.

## Controles

| Tecla / acción | Efecto |
|---|---|
| `WASD` | Moverse |
| `Espacio` | Saltar (creativo: doble toque para volar) |
| `Shift` | Correr / bajar volando |
| Clic izquierdo (mantener) | Minar / atacar |
| Clic derecho | Colocar bloque, comer (mantener) o abrir mesa, horno y cofre |
| `1`–`9` o rueda | Elegir objeto |
| `E` | Inventario y fabricación 2×2 (creativo: paleta de objetos) |
| `Q` | Tirar el objeto de la mano |
| `Esc` | Pausa |

En el inventario: clic toma o suelta una pila, clic derecho toma la mitad o deja uno, y Shift+clic mueve rápido.

## Cómo empezar a sobrevivir

1. Rompe troncos con la mano y conviértelos en **tablones** (1 tronco → 4 tablones).
2. Con 4 tablones haz una **mesa de trabajo**, colócala y ábrela con clic derecho.
3. Fabrica **palos** (2 tablones en vertical) y un **pico de madera** (3 tablones arriba, 2 palos en el centro).
4. Mina piedra para conseguir **roca** y haz herramientas de piedra y un **horno** (8 de roca en anillo).
5. Baja a las cuevas: el **hierro** necesita pico de piedra y el **diamante**, pico de hierro. Funde el hierro en el horno usando carbón o madera como combustible.
6. Come manzanas (caen de las hojas) o carne de cerdos y vacas; en el horno la carne se cocina y alimenta más.
7. De noche salen **zombis**: construye un refugio o hazles frente con una espada. Se queman con el sol.

## Recetas

| Objeto | Receta |
|---|---|
| Tablones ×4 | 1 tronco |
| Palos ×4 | 2 tablones en vertical |
| Mesa de trabajo | 2×2 tablones |
| Cofre | 8 tablones en anillo |
| Horno | 8 de roca en anillo |
| Ladrillo ×4 | 2×2 piedra |
| Pico / hacha / pala / espada | Material (tablones, roca, lingote de hierro o diamante) + palos, con la forma clásica |

**Horno:** hierro en bruto → lingote · roca → piedra · arena → vidrio · tronco → carbón · carne cruda → carne asada.
