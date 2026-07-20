# NEXO: Tower Defense 🏰

Juego de defensa de torres hecho en **HTML5 + Canvas + JavaScript puro** — un solo archivo, sin dependencias ni assets externos. Interfaz completamente en español.

## ▶ Cómo jugar

Abre `index.html` en cualquier navegador moderno. No necesita servidor ni instalación.

**Objetivo:** sobrevive a todas las olas de enemigos y derrota al **Coloso del Vacío**. Si lo logras, se desbloquea el **modo infinito ∞**.

## ⚔ Modos de dificultad

| Modo | Olas | Vidas | Particularidad |
|---|---|---|---|
| Normal | 40 | 150 | La experiencia clásica |
| Fundido | 40 | 125 | +45% vida enemiga; **jefes de fuego** inmunes a quemaduras y resistentes al hielo |
| Caído | 50 | 100 | +110% vida enemiga; oleada final con doble jefe, tanques y gigantes |

Cada combinación de mapa y modo guarda su propio récord. Los modos **Fundido** y **Caído** requieren nivel de jugador 3 y 7 respectivamente.

## ⭐ Nivel de jugador y XP

Ganas XP por cada ola superada (más en los modos difíciles, +250 por victoria). Subir de nivel desbloquea los modos avanzados. Tu progreso se guarda en el navegador.

## ☠ Modificadores

Opcionales y combinables desde el menú; endurecen la partida a cambio de multiplicar la XP ganada:

| Modificador | Efecto | XP |
|---|---|---|
| 👥 Horda | +40% de enemigos por ola | ×1.35 |
| 💨 Veloz | Enemigos un 25% más rápidos | ×1.30 |
| 🛡 Espartano | -40% dinero inicial y bonos de ola reducidos | ×1.40 |

## ✨ Skins doradas

Cada **victoria** desbloquea la skin dorada de una unidad aleatoria de tu escuadrón. Son puramente cosméticas (uniforme dorado y destellos) y se activan o desactivan con el botón ✨ de cada carta del escuadrón.

## 🎲 Desafío del día

Cada día se genera un reto fijo a partir de la fecha: mapa, modo, modificadores y **escuadrón obligatorio de 5 unidades** iguales para todos. Otorga **XP ×1.5**, guarda tu mejor ola del día y marca ✔ si lo superas. No requiere nivel: es la vía rápida para probar los modos avanzados.

## 🎖 Escuadrón (loadout)

Antes de jugar eliges **hasta 5 unidades** de entre las 13 disponibles. Tu escuadrón se guarda en el navegador y se controla en partida con las teclas **1–5**.

## 🗺 Mapas

| Mapa | Dificultad |
|---|---|
| Pradera Verde | Fácil |
| Desierto Carmesí | Medio (+15% vida enemiga) |
| Glaciar Nocturno | Difícil (+30% vida enemiga) |
| Cráter Volcánico | Extremo (+45% vida enemiga) |
| Abismo Gemelo | Pesadilla (+60% vida enemiga, **dos rutas de invasión simultáneas**) |

En los mapas de varias rutas los enemigos se reparten entre los caminos, y el Cuartel y el Trampero operan sobre la ruta que tengan más cerca.

El récord de olas de cada mapa se guarda en tu navegador, junto a tus **estadísticas históricas** (partidas, victorias, bajas y olas superadas), visibles en el menú principal.

## 🗼 Torres (9 tipos, 5 niveles cada una)

| Torre | Costo | Rol |
|---|---|---|
| 🔫 Recluta | $200 | Básica y barata; gana detección al nivel 4 |
| 🌀 Artillero | $600 | Cadencia altísima; el cañón tarda ~2 s en acelerar |
| 🎯 Francotirador | $400 | Enorme alcance y daño; ve ocultos desde nivel 1 |
| ❄️ Congelador | $450 | Pulsos de área que ralentizan |
| 💣 Demoledor | $700 | Daño explosivo en área |
| 🔥 Piromante | $500 | Chorro de fuego que incendia (daño con el tiempo) |
| ⚡ Tesla | $900 | Rayos en cadena; ve ocultos |
| 🌾 Granja | $300 | Genera dinero al final de cada ola |
| 📣 Comandante | $850 | Aura que acelera la cadencia; habilidad activa **¡A la carga!** (+30% extra durante 8 s, recarga 45 s) |
| 🎧 DJ | $750 | Aura que abarata las mejoras y amplía el alcance de torres cercanas |
| 🪤 Trampero | $650 | Siembra trampas de pinchos en el camino: dañan, frenan y pillan a los ocultos |

(La tabla omite Escopetero, Demoledor, Cohetero y Cuartel — 14 unidades en total.)

Cada torre puede **mejorarse** (⬆, con descuento si hay un DJ cerca), **venderse** (70% de reembolso) y cambiar su **modo de objetivo**: primero, último, más fuerte, más débil o más cercano.

## 👾 Enemigos

- **Normal / Veloz / Blindado** — la carne del enjambre.
- **👻 Sombra** — invisible para torres sin detección 👁.
- **✚ Curandero** — sana a los enemigos cercanos: elimínalo primero.
- **🐦 Fénix** — volador que renace de sus cenizas una vez: mátalo dos veces.
- **🔧 Saboteador** — aturde periódicamente a la torre que tenga más cerca.
- **Tanque** — lento pero enorme.
- **☠ DEVORADOR** — jefe cada 10 olas, con barra de vida propia.
- **💀 EL COLOSO DEL VACÍO** — jefe final de la ola 40.

## ⌨ Controles

| Tecla / acción | Efecto |
|---|---|
| `1`–`5` | Seleccionar unidad del escuadrón para colocar |
| Clic izquierdo | Colocar / seleccionar torre |
| `Shift` + clic | Colocar varias torres seguidas |
| Clic derecho / `ESC` | Cancelar |
| `Espacio` | Pausa |
| `F` | Velocidad x1 / x2 / x3 |

## 🔊 Sonido

Todos los efectos de sonido se generan en tiempo real con WebAudio (sin archivos de audio). Botón 🔊 para silenciar los efectos.

El botón de música alterna entre **dos pistas originales** compuestas por código: 🎵 **Épica** (arpegios en La menor) y 🎧 **Ritmo urbano** (groove estilo dembow con bajo sincopado y gancho pentatónico), además del modo silencio.

Con el botón **📂** puedes cargar **tu propia canción** (MP3/audio) desde tu dispositivo: se reproduce en bucle como música de fondo (🎶 en el ciclo del botón de música). El archivo no se sube a ningún servidor: suena solo en tu navegador.
