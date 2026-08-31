# Juegos en HTML5 🎮

Dos juegos completos hechos con **HTML5 + Canvas + JavaScript puro**: un archivo cada uno, sin dependencias, sin assets externos y con la interfaz en español.

| Juego | Archivo | Género |
|---|---|---|
| **Choque Real** | [`clash-royale.html`](clash-royale.html) | Estrategia en tiempo real (clon de Clash Royale) |
| **NEXO: Tower Defense** | [`index.html`](index.html) | Defensa de torres |

Se abren haciendo doble clic en el archivo. No hacen falta servidor, instalación ni conexión.

---

# Choque Real ⚔️👑

Clon de Clash Royale: partidas 1 contra 1 de 3 minutos contra una IA, mazo de 8 cartas, elixir, coronas, cofres y subida de nivel de cartas. Todo el progreso se guarda en el navegador.

## ▶ Cómo se juega

Objetivo: **destruir más torres que el rival en 3 minutos**. Cada torre lateral vale una corona 👑 y derribar la **torre del Rey** gana la partida al instante.

- **Elixir**: se rellena solo (1 cada 2,8 s). Cada carta cuesta elixir. En el último minuto se genera **×2** y en la prórroga **×3**.
- **Jugar una carta**: tócala y luego toca el campo, o arrástrala hasta él. Funciona con ratón y con pantalla táctil.
- **Zona de despliegue**: solo tu mitad del campo, hasta que derribes una torre rival y se abra ese carril. Los hechizos y el Minero caen donde quieras.
- **Final**: si hay empate a coronas al acabar el tiempo se juega una **prórroga de 60 s a muerte súbita**; si sigue igualada, gana quien tenga la torre menos dañada.

| Tecla | Acción |
|---|---|
| `1`–`4` | Elegir carta de la mano |
| `Q` | Habilidad legendaria (✨ PODER) |
| `Esc` | Cancelar la selección |

## 🎴 Las 24 cartas

- **Comunes**: Caballero, Arqueras, Esqueletos, Esbirros, Descarga, Cañón
- **Especiales**: Valquiria, Montapuercos, Mosquetera, Mago, Gigante, Flechas, Torre Infierno
- **Épicas**: Bebé Dragón, P.E.K.K.A, Bruja, Bola de Fuego, Minero, Furia
- **Legendarias**: Megacaballero, Chispitas, Princesa, Leñador, Mago Eléctrico

Hay cuatro tipos de carta con comportamientos distintos: **tropas** (algunas voladoras, otras solo atacan edificios), **enjambres**, **hechizos** (daño en área, aturdimiento, furia) y **edificios** defensivos que caducan.

## ✨ Habilidades legendarias

Cuando tienes una carta legendaria en el campo se activa el botón **PODER** (cuesta 1 de elixir, 8 s de recarga):

- **Megacaballero** — salta sobre el enemigo más cercano y aplasta en área.
- **Chispitas** — recarga su cañón al instante.
- **Princesa** — lanza una lluvia de cuatro flechas explosivas.

Además, el **Leñador** suelta Furia al morir, el **Mago Eléctrico** aturde en cada golpe y la **Bruja** invoca esqueletos sin parar.

## 🏆 Progreso

- **Trofeos y arenas**: 9 arenas con escenario propio (césped, río y puentes cambian de color). Ganar da entre 26 y 35 trofeos; perder resta.
- **Cofres**: cada victoria da un cofre (Plata, Oro, Mágico o Legendario) con oro y cartas.
- **Mejora de cartas**: junta copias y oro para subir cartas hasta el nivel 13; cada nivel da +9 % de vida y daño.
- **Mazo**: elige tus 8 cartas en la pestaña *Mazo*, o pulsa 🎲 para un mazo aleatorio.

El rival siempre juega al nivel medio de tu mazo, así que subir cartas nunca rompe el equilibrio; lo que sube con los trofeos es la calidad del mazo de la IA y su velocidad de reacción.

## 🧠 Detalles técnicos

- Un solo archivo de ~2.700 líneas, sin librerías ni imágenes: **personajes, torres y arena están dibujados con formas de Canvas**.
- Tropas con búsqueda de objetivo, separación entre unidades y **camino real por los puentes** (las tropas de tierra no cruzan el río a nado; las voladoras sí).
- IA rival con su propio elixir y ciclo de 8 cartas: defiende lo que cruza, prepara contras y ataca por los puentes.
- Sonido generado en tiempo real con WebAudio (botón 🔊 para silenciarlo).
- El juego sigue funcionando aunque el navegador bloquee `localStorage` o el audio.

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
