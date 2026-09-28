# LOOP 13

Juego 3D de misterio y terror psicológico para navegador, hecho con **React + TypeScript + Three.js + React Three Fiber + Drei + postprocessing**.
Sin assets externos: la geometría, las texturas PBR, los personajes, las animaciones, el audio, la música y la voz se generan de forma procedural.

Despiertas en **ORPHEUS**, una instalación de investigación temporal abandonada. Son las **12:47**. A las **13:00** todo se reinicia… y tú recuerdas.

## ▶ Cómo jugar

```bash
cd loop13
npm install
npm run dev        # http://localhost:5173
# o bien
npm run build && npm run preview
```

Se recomiendan auriculares y una GPU dedicada. En **SETTINGS** puedes bajar la calidad gráfica, las sombras, las partículas y el postprocesado.

| Tecla | Acción |
|---|---|
| `W A S D` | Moverse |
| `SHIFT` | Correr (mantener para esprintar, gasta aguante) |
| `CTRL` o `C` | Agacharse |
| `SPACE` | Saltar |
| `E` | Interactuar (mantener en generadores / puertas atascadas) |
| `F` | Linterna (gasta batería) |
| `TAB` | MEMORY / inventario / mapa |
| `ESC` | Pausa |
| Ratón / rueda | Cámara / zoom |

`?debug` en la URL muestra un panel de depuración (F6 +30 s, F7 +5 s, F8 salta al reset).

## 🕰 El loop

- El reloj interno es real: **13 minutos** de 12:47 a 13:00 y controla todos los eventos.
- En cada **reset** se reinicia todo lo físico: jugador, NPCs, puertas, luces, objetos, puzzles, cajas, IA, eventos.
- Se conserva todo el **conocimiento**: pistas, documentos, códigos, secretos, logros, finales, zonas del mapa, estadísticas y ajustes.
- Morir también reinicia el loop (**YOU DIED → RESETTING…**) sin perder lo aprendido.
- Puedes tumbarte en tu cama de Medical para **esperar** (el tiempo avanza rápido).

### Línea temporal

| Hora | Evento |
|---|---|
| 12:47 | Despiertas. A-13: *"Good morning."* |
| 12:48 | Dr. Kane entra al laboratorio |
| 12:50 | Se abren los Archivos · ventana del relé A |
| 12:51 | Kane va a Seguridad |
| 12:52 | Fallo eléctrico |
| 12:52:30 | Suena el teléfono del Hub (a partir del loop 2) |
| 12:54 | Todas las pantallas muestran un mensaje · Kane va a Archivos · relé B |
| 12:55 | Algo aparece en los Archivos… solo en cámara |
| 12:57 | Alarma · Kane desaparece |
| 12:58 | Ventana del relé C |
| 12:59 | Sobrecarga del reactor · puertas bloqueadas · radiación · The Observer puede cazarte |
| 13:00 | RESET |

## 🧩 Sistemas

- **Puzzles**: código de seguridad, 3 generadores, patrón de símbolos, secuencia vista en cámaras, relés temporales en su ventana exacta del mismo loop y las anclas del Núcleo.
- **NPCs con IA** (rutas con A* sobre una malla de navegación, horarios, diálogos que cambian por loop y conocimiento): Dr. Kane y Dr. Maya. **A-13** controla puertas, luces y alarmas… y miente.
- **The Observer**: estados DORMANT / WATCHING / FOLLOWING / HUNTING / DISAPPEARING / MANIPULATING, con progresión: solo cámaras → a lo lejos → te sigue cuando no miras → persecuciones → contacto directo.
- **Anomalías** que cambian entre loops, cámaras de seguridad funcionales (algunas cosas solo se ven por ellas), terror psicológico con luz y silencio.
- **4 finales** (Escape, Sacrificio, Observer y **LOOP BROKEN**), **New Game+**, 19 logros, 48 pistas, 22 documentos, 12 secretos.
- **Guardado automático** en `localStorage` con checksum, validación y copia de seguridad.

## 🗂 Arquitectura

```
src/game/core       estado global (zustand), mundo mutable por loop, input, tiempo, cámara compartida
src/game/data       mapa, pistas, documentos, objetos, diálogos, logros, finales
src/game/physics    colisiones AABB, controlador de personaje, cajas empujables, raycast
src/game/ai         navegación A*, NPCs, The Observer
src/game/systems    Loop, Time/Events, Interaction, Inventory, Memory, Puzzle, Save, Lighting,
                    Doors, Anomalies, Dialogue, Cutscenes, Endings, Terminals
src/game/audio      motor de audio procedural, ambientes por zona, música dinámica
src/world           nivel, props, puertas, luces (pool de luces reasignadas), partículas, pantallas
src/entities        personaje humano procedural con animaciones mezcladas, NPCs, Observer
src/camera          cámara en tercera persona cinematográfica
src/fx              postprocesado
src/ui              HUD, menús, MEMORY, paneles
src/tests           tests (vitest): navegación, alcanzabilidad, loop completo, guardado
```

```bash
npm test          # simula loops completos sin gráficos
npm run typecheck
```
