# Hoja de ruta

Leyenda: ✅ hecho y verificado · 🟡 parcial · ⬜ pendiente · 🔒 bloqueado (requiere algo externo)

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Entorno, arquitectura, docs, tests | ✅ |
| 1 | Núcleo jugable: coche, balón, estadio, cámara, goles, marcador, reinicio | ✅ |
| 2 | Física avanzada: aéreos, esquives, derrape, paredes/techo, pads, demoliciones | ✅ (ajuste fino con jugadores reales pendiente) |
| 3 | Offline completo: bots, 1v1–4v4, reglas, prórroga, juego libre, dificultades | 🟡 falta: entrenamiento personalizado, temporada offline, pantalla dividida |
| 4 | Multijugador: servidor dedicado, salas, LAN, predicción/reconciliación | ✅ en localhost · 🔒 internet (falta servidor público) |
| 5 | Calidad visual/sonora: modelos mejores, PBR, partículas, explosiones | 🟡 coche v2 y estadio mejorado; faltan más coches y estadios |
| 6 | Modos alternativos con estadios propios: Aros, Hielo, Suelo Explosivo, Poderes, Eliminación… | ⬜ (7 modos mutador ya jugables) |
| 7 | Interfaz completa: garaje, perfil, inventario | 🟡 menú, ajustes, perfil local |
| 8 | Competitivo: cuentas, MMR, ligas, torneos | ⬜ / 🔒 backend |
| 9 | Progresión: temporada, desafíos, tienda virtual | 🟡 XP y niveles locales |
| 10 | Contenido: más coches, estadios, packs | ⬜ |
| 11 | Optimización, exportación, entrega | ⬜ (exportar requiere plantillas de exportación de Godot) |

## Próximos hitos recomendados (en orden)

1. **Repeticiones de gol** (grabar snapshots en un buffer circular de 6 s y reproducir con cámara cinemática).
2. **Entrenamiento personalizado** (packs JSON: posición del coche/balón, velocidad, éxito) + editor.
3. **Servidor público** en Sudamérica y prueba real entre dos casas; después cuentas y amigos.
4. Ajuste fino de la sensación de control con jugadores humanos (registro de sesiones).
5. Modo **Aros** (primer estadio especial: reutiliza `ArenaShape` con otra SDF).
