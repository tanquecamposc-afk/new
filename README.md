> **Nuevo:** este repositorio también contiene **[VELOCITY ARENA](velocity-arena/README.md)**, un juego 3D original de fútbol con coches en Godot 4 (carpeta `velocity-arena/`).

# NEXO: Tower Defense 🏰

Juego de defensa de torres hecho en **HTML5 + Canvas + JavaScript puro** — un solo archivo, sin dependencias ni assets externos. Interfaz completamente en español, con personajes dibujados a mano por código.

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

## 🗼 Unidades (12 tipos, 5 niveles cada una)

| Unidad | Costo | Rol |
|---|---|---|
| Recluta | $200 | Básico y barato; antiaéreo y detección al nivel 4 |
| Escopetero | $400 | Perdigones que dañan a varios enemigos juntos |
| Artillero | $600 | Cadencia altísima; antiaéreo desde nivel 2 |
| Francotirador | $450 | Enorme alcance y daño; ve ocultos y voladores |
| Congelador | $500 | Pulsos de área que ralentizan |
| Demoledor | $750 | Daño explosivo en área |
| Piromante | $550 | Chorro de fuego que incendia |
| Tesla | $900 | Rayos en cadena; ve ocultos y voladores |
| Cohetero | $1,100 | Misiles de área y largo alcance; antiaéreo |
| Cuartel | $800 | Despliega tropas aliadas que combaten en el camino |
| Granja | $300 | Genera dinero al final de cada ola |
| Comandante | $850 | Aura que acelera la cadencia de torres cercanas |

Cada unidad puede **mejorarse** (su casco cambia con el nivel: gorra → casco → visor → corona), **venderse** (70% de reembolso) y cambiar su **modo de objetivo**: primero, último, más fuerte o más cercano.

## 💥 Habilidades activas

- **Bombardeo aéreo (A):** apunta y arrasa una zona. Recarga de 45 s.
- **Suministros (S):** dinero instantáneo de emergencia. Recarga de 60 s.
- **Golpe manual:** haz clic directamente sobre un enemigo para darle un golpe.

## 👾 Enemigos

- **Zombi / Corredor / Blindado** — la carne del enjambre (los corredores dejan estela).
- **Sombra** — invisible para torres sin detección 👁.
- **Gemelo** — se divide en dos corredores al morir.
- **Curandero** — sana a los enemigos cercanos: elimínalo primero.
- **Volador** — solo lo alcanzan torres antiaéreas ✈.
- **Tanque / Gigante** — lentos pero enormes.
- **DEVORADOR** — jefe cada 10 olas, con barra de vida propia.
- **EL COLOSO DEL VACÍO** — jefe final: sus pisadas sacuden la pantalla y aturden a tus torres.

## ✨ Efectos

Rachas de bajas con bonos, golpes críticos, carteles animados de ola, monedas que vuelan al contador, destellos de pantalla, sacudidas, casquillos, estelas de cohete, nubes a la deriva y música de fondo generada por código (WebAudio, sin archivos de audio).

## ⌨ Controles

| Tecla / acción | Efecto |
|---|---|
| `1`–`9`, `0`, `Q`, `W` | Seleccionar unidad para colocar |
| Clic izquierdo | Colocar / seleccionar / golpear enemigo |
| `Shift` + clic | Colocar varias unidades seguidas |
| Clic derecho / `ESC` | Cancelar |
| `Espacio` | Pausa |
| `F` | Velocidad x1 / x2 / x3 |
| `A` / `S` | Bombardeo aéreo / Suministros |
