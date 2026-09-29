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

Juego de bloques en 3D inspirado en Minecraft, hecho desde cero con **Three.js**. Todas las texturas, iconos y sonidos se generan por código. Tiene dos modos (Supervivencia y Creativo) y la progresión completa: del primer tronco al **Ender Dragon**.

Abre `blockverse/index.html` en un navegador moderno de escritorio (necesita internet para cargar Three.js desde cdnjs). Se juega con teclado y ratón y el mundo se guarda solo en el navegador.

## Qué incluye

- **Mundo:** capas de Y -64 a 127, lecho de roca, pizarra profunda bajo Y 0, cuevas, lagos de lava profundos, océanos, playas y biomas (llanura, bosque, desierto, nevado y montañas).
- **Minerales por capas:** carbón, cobre, hierro, oro, redstone, lapislázuli, diamante (más abundante cerca de Y -59) y esmeralda en montañas, con sus variantes de pizarra profunda.
- **Minado como en Minecraft:** misma fórmula de tiempo por dureza y herramienta, niveles de pico (hierro necesita piedra, diamante necesita hierro, obsidiana necesita diamante) y botín con probabilidades (pedernal de la grava, brotes y manzanas de las hojas, semillas de la hierba…).
- **Iluminación:** luz del cielo y de bloques (antorchas, lava, piedra luminosa), ciclo de día y noche de 20 minutos y lluvia.
- **Líquidos:** agua y lava que fluyen, fuentes infinitas, obsidiana y roca al mezclarse, nadar, ahogarse y quemarse.
- **Supervivencia:** vida, armadura, hambre con saturación, experiencia, efectos (regeneración, veneno, hambre), daño por caída, fuego, cactus y vacío.
- **Fabricación:** inventario 2×2, mesa 3×3, más de 100 recetas; horno con combustibles; cofres; mesa de encantamientos con 14 encantamientos.
- **Herramientas y combate:** madera, piedra, hierro, oro y diamante; armaduras de cuero, oro, hierro y diamante; arco y flechas; golpes críticos y recarga de ataque.
- **Granja:** azada, semillas, trigo que crece, polvo de hueso, árboles que crecen de brotes, caña de azúcar, cría de animales.
- **Criaturas:** cerdo, vaca, oveja, gallina, zombi, esqueleto, creeper, araña, enderman, piglin zombificado, ghast y blaze.
- **Estructuras:** mazmorras con generador y cofres, fortaleza con el portal del End y fortalezas del Nether con generadores de blazes.
- **El Nether:** portal de obsidiana (mínimo 4×5) encendido con mechero, coordenadas ×8, lava, piedra luminosa, cuarzo y arena de almas.
- **El End:** ojos de ender que guían a la fortaleza, 12 marcos, la isla con pilares de obsidiana, cristales que curan al dragón, el **Ender Dragon** y el portal de salida con el huevo.
- **Otros:** dinamita y explosiones, camas (dormir y punto de reaparición; en el Nether y el End explotan), perlas de ender, comandos y modo creativo con vuelo.

## Controles

| Tecla / acción | Efecto |
|---|---|
| `WASD` | Moverse (doble toque de `W` o mantener `R`: correr) |
| `Espacio` | Saltar y nadar (creativo: doble toque para volar) |
| `Shift` | Agacharse (no te caes de los bordes) / bajar volando |
| Clic izquierdo (mantener) | Minar / atacar |
| Clic derecho | Colocar, usar, comer, tensar el arco, abrir mesas, hornos y cofres |
| Clic central | Creativo: copiar el bloque apuntado |
| `1`–`9` o rueda | Elegir objeto |
| `E` | Inventario |
| `Q` / `Shift+Q` | Tirar uno / toda la pila |
| `T` o `/` | Comandos (`/help`, `/gamemode`, `/time`, `/give`, `/tp`, `/locate`…) |
| `F3` | Información de depuración |
| `Esc` | Pausa |

## Cómo llegar al final

1. Tala árboles, fabrica una mesa, herramientas de madera y luego de piedra. Construye un refugio antes de la primera noche.
2. Baja por las cuevas: consigue carbón, hierro (funde en el horno) y diamantes cerca de Y -59.
3. Con pico de diamante mina obsidiana (o créala echando agua sobre lava) y arma un portal de 4×5. Enciéndelo con un mechero.
4. En el Nether busca una fortaleza (`/locate fortress` ayuda) y consigue varas de blaze. Caza endermen para las perlas.
5. Fabrica ojos de ender (polvo de blaze + perla). Lánzalos en la Superficie: te guían a la fortaleza.
6. Llena los 12 marcos del portal del End, entra y destruye los cristales de los pilares con flechas.
7. Derrota al Ender Dragon y entra en el portal de salida.

## Qué no incluye (todavía)

Circuitos de redstone, aldeas y aldeanos, pociones y destilación, yunque, barcos, vagonetas y caballos, puertas, escaleras y losas, más tipos de árboles y biomas, islas exteriores del End, élitros, multijugador y controles táctiles.
