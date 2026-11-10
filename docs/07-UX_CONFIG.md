# 07. MAPA COMPLETO DE PANTALLAS, CONFIGURACIÓN Y ACCESIBILIDAD

## 7.1 Navegación principal (rutas sugeridas)
`/home`, `/discover`, `/mode/:id`, `/locker`, `/shop`, `/battle-pass`, `/quests`, `/ranked`, `/career`, `/friends`, `/party`, `/creative`, `/settings`, `/profile`, `/match`, `/results`, `/notifications`. Usar navegación con historial; cerrar modal devuelve a pantalla anterior y no destruye partida.

### Contrato pantalla / dato / acción
| Pantalla | Datos obligatorios | Acción real y observable |
|---|---|---|
| Home/Lobby | usuario, skin, grupo, nivel, modo | seleccionar modo, ready, jugar |
| Discover | catálogo + categorías + versión | filtrar, abrir ficha, seleccionar modo |
| Battle Royale | team size, build toggle, ranked flag | validar combinación e iniciar matchmaking |
| Reload | team size, ranked, builds, mapa | seleccionar cola válida |
| Pillars | variante, reglas,jugadores, rondas | iniciar preset correcto en escena original |
| Locker | owned cosmetics, presets, estilos | equipar y persistir loadout |
| Shop | catálogo, precios, saldo, disponibilidad | comprar con validación y recibo |
| Battle Pass | temporada, XP, nivel, items | inspeccionar/reclamar desbloqueos legítimos |
| Missions | objetivos, progreso, expiración | rastrear actividad, reclamar una vez |
| Ranked | rango, progreso, historial | jugar cola real o demo claramente etiquetada |
| Creative | mis islas, plantillas, editor | crear/abrir/guardar/publicar según permiso |
| Friends | lista, online, invites | aceptar/rechazar, party, bloquear, reportar |
| Career | partidas, eliminaciones, wins | filtrar, estadísticas desde registros |
| Settings | video, audio, input, accessibility | aplicar, restaurar, guardar, reiniciar opciones |
| Results | ganador, placement, eliminaciones, XP | volver al lobby o repetir partida |

## 7.2 Jerarquía de pantalla
En lobby, el botón más importante es **Jugar**; al lado se ve el modo actual y su versión (si procede). Menú superior: inicio, descubrir, pase, tienda, taquilla, misiones, carrera. Panel lateral: grupo/amistades y notificaciones. Evitar 20 botones con el mismo peso visual. En HUD dar prioridad a vida, escudo, munición, armas, minimapa, contador de vivos, temporizador de tormenta y crosshair.

## 7.3 Configuración de vídeo
- Pantalla completa/ventana, resolución/render scale, escala de UI, VSync, límite FPS (30/60/120/ilimitado), preset Low/Medium/High/Epic.
- Shadows low/off/medium/high, texturas, distancia de dibujado, vegetación, efectos/partículas, anti-aliasing, post-proceso, SSAO, bloom, motion blur configurable/off, FOV.
- `Apply` aplica cambios; `Cancel` restaura; tras un cambio peligroso de resolución ofrecer confirmación reversible.
- FPS medidos y razón de GPU/CPU si herramientas disponibles. Mostrar advertencia si navegador no soporta WebGL/WebGPU requeridos.

## 7.4 Configuración de controles
- Keybindings remapeables con conflictos detectados; mouse sensitivity, ADS sensitivity, invertY, toggle/hold crouch, toggle/hold ADS, auto-run, sprint default, builder layout, quickbar, pickaxe, inventory, interact, map, emotes.
- Gamepad: deadzone, response curve, bindings, vibration opcional, aim assist solo si se diseña y balancea; no activar sin ser visible al usuario.
- Usar `InputActions` independientes de teclas para accesibilidad y cross-platform.

## 7.5 Audio y social
- Master, music, game SFX, dialogue, UI, voice chat, mic input y output device (según soporte del navegador y consentimiento).
- Push to talk, mute, voice limits para equipos, chat de texto moderado, report/bloqueo. Si no hay infraestructura de voz/chat, controles deben estar deshabilitados, con estado transparente.

## 7.6 Accesibilidad
Subtítulos, contraste, safe area y UI scale, indicadores direccionales de audio, tamaño retícula, opción no flash, motion-reduction, supresión de camera shake, daltonismo (paletas accesibles, no depender solo del color), modo de controles simplificados, navegación teclado y screen reader para menús. Probar que textos no desaparecen en 720p.

## 7.7 UX para recompensas y pase
Tras partida: resultado real primero, luego XP y misiones completadas, después recompensas disponibles, botón reclamar. Animaciones pueden omitirse (skip), deben no bloquear acceso a resultados. Una recompensa reclamada cambia inventario y se mantiene tras relogin.

## 7.8 Requisitos de localización
Strings en diccionarios `es-PE` y `en`, no texto hardcodeado. Soporte de plurales, formato numérico, fechas, botones largos, control de fuentes y fallbacks. Nombres de assets y IDs siempre independientes de localización.
