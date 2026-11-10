# 06. DIRECCIÓN ARTÍSTICA, GRÁFICOS Y OPTIMIZACIÓN

## 6.1 Definición del estilo propio
Dirección de arte: **aventura futurista estilizada** con siluetas legibles, vegetación expresiva, materiales PBR suavizados, iluminación natural de fantasía, cielos volumétricos, sombras coherentes, partículas brillantes y UI minimalista de alta visibilidad. Crear un universo, nombres, lore y personajes originales. Usar las imágenes del kit anterior como moodboard genérico, no como guía para reproducir el logo ni personajes ajenos.

## 6.2 Checklist del lobby en 3D
- Plataforma original y fondo con profundidad (no una fotografía estática fingiendo ser escena jugable).
- Personaje 3D animado idle, con rotación 360°, sombra, material coherente, nombre, nivel, estado ready.
- Iluminación key/fill/rim, iluminación ambiente, reflection environment, tonemapping, colores configurables.
- Botón jugar con modo y tamaño de equipo seleccionados; panel lateral de amigos/misiones; progreso real.
- Cambio de skin actualiza modelo/mesh del personaje en lobby y partida.
- Movimiento del personaje sutil, cámara de lobby controlada, carga progresiva con placeholders explícitos si faltan assets.

## 6.3 Pipeline de assets
`Concept art → modelado/escultura → retopología → UV → texturas PBR → rig → animaciones → GLB export → compresión → validación → LOD → juego`. Cada asset debe incluir `assetId`, licencia, creador, ruta, dimensiones, número de triángulos, memoria estimada, `lods`, `thumbnail`, animaciones y colisión. Prefiere GLB/GLTF para navegador. No subir imágenes conceptuales a texturas finales sin cuidar UV y licencias.

## 6.4 Presupuesto de partida inicial (objetivos, no garantías)
| Área | Target de arranque | Instrumento |
|---|---|---|
| Desktop medio | 60 FPS a 1080p en nivel medio | Frame profiler y capturas |
| GPU/frame | ~16,7ms total a 60 FPS | Performance panel |
| CPU render loop | <6ms ideal bajo carga típica | PerformanceObserver/profiler |
| draw calls visibles | reducir con instancing y batching | `renderer.info` |
| assets iniciales lobby | carga progresiva y placeholders | network panel |
| shaders postprocess | toggle por preset | comparar FPS on/off |
| bots iniciales | 8, luego 16, nunca empezar por 80 | escena de estrés repetible |
| memoria de texturas | presupuestar por calidad | estimación mipmaps y GPU |

No afirmar que la experiencia corre a 60 FPS sin ejecutar en hardware objetivo. La calidad Épica puede reducir rendimiento; ofrecer Low/Medium/High/Epic con sombras, antialiasing, pixel ratio, resolución dinámica, LOD, distancia de dibujado, vegetación, partículas y ambient occlusion.

## 6.5 Mundo y nivel
Partir de arena pequeña y geométricamente sencilla; luego añadir 3 biomas con colorimetría propia, rutas y verticalidad medida. La topología y el sistema de colisiones deben corresponderse: árbol que bloquea disparos si tiene colisionador, ventana abierta si puede atravesarse, pared con vida si es destructible. Integrar navmesh con mapas de bots. Para mundo grande, usar streaming/chunks y visibilidad/frustum.

## 6.6 Animación avanzada
`idle`, `walk`, `run`, `sprint`, `crouch`, `slide`, `jump`, `fall`, `land`, `ADS`, `fire`, `reload`, `heal`, `knock`, `revive`, `build`, `edit`, `emote`, `victory`, `death`. El rig debe sincronizar parte superior del cuerpo y piernas; animación de disparo no debe interrumpir en seco locomoción. Anticipación, follow-through, blend trees y eventos de animación (poner bala, sonido paso, fin recarga).

## 6.7 VFX funcionales
Muzzle flash, trazadora, polvo por suelo, chispas metálicas, hitmarker confirmado, fractura de escudo, partículas por rareza de loot, indicadores de tormenta y sprites originales. Cada VFX puede apagarse, reducirse o adaptarse para fotosensibilidad. No confundir VFX con damage events; la simulación decide impacto antes de dibujar feedback definitivo.

## 6.8 Audio espacial y accesibilidad
Audio buses `master`, `music`, `sfx`, `voice`, `ui`, `ambience`; efectos por material, oclusión, prioridades para no reproducir 40 sonidos de disparo simultáneos a máximo volumen. Subtítulos, indicadores visuales opcionales de sonido, volumen por bus, mute y prueba de salida. Audio con licencia o creado para el proyecto, nunca archivos extraídos de Fortnite.

## 6.9 Definición del resultado visual por fase
F1: cajas y terreno de prueba con buen control. F4: mapa pequeño coherente, siluetas y HUD legibles. F8: lobby de alto acabado. F13: iluminación, materiales, LOD y animaciones pulidas. Una captura impresionante sin una partida funcionando no completa F1-F4.
