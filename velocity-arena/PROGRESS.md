# Progreso

_Última actualización: 2026-11-24 — alfa 0.3_

## Verificado (tests automáticos y/o capturas reales)

| Sistema | Verificación |
|---|---|
| SDF del estadio, normales, raycast, detección de gol | tests `test_arena_sdf` |
| Coche en reposo, aceleración, frenada, reversa, giro, derrape | tests |
| Turbo, supersónico, velocidad máxima, consumo | tests |
| Salto variable (0,84 m toque / 2,36 m completo), doble salto (4,89 m) | tests |
| Esquive frontal (+5,2 m/s), cancelación de flip, aterrizaje sobre ruedas | tests |
| Control aéreo y amortiguación | tests |
| Conducción por pared (sube a 14,8 m con ruedas en contacto) | tests |
| Rebote del balón, reposo estable, sin túnel a 60 m/s | tests |
| Golpe coche–balón, demolición y reaparición, choque entre compañeros | tests |
| Pads de turbo (6 grandes, 30 pequeños) y reaparición | tests |
| Flip reset sobre el balón | test |
| Estabilidad 60 s con 8 coches y entradas aleatorias (sin NaN, sin escapar) | test |
| Snapshot → restauración reproduce la simulación (error 0) | test |
| Reglas: cuenta atrás, goles, autogol, reloj, regla 0 s, prórroga, asistencias | tests |
| Modo rastreador (homing) | test |
| Partida de bots 2v2 completa sin errores | test (prueba de humo) |
| Menú principal, partida 1v1/2v2/3v3, juego libre, 3 ambientes, HUD | capturas con Xvfb |

## Implementado pero sin verificar en este entorno

- **Mando físico** y vibración (no hay mando conectado al contenedor).
- **Audio** (el contenedor no tiene tarjeta de sonido: se usa el driver nulo).
- **Rendimiento en GPU real** y renderizador Forward+ (aquí solo hay OpenGL por
  software; SSAO solo funciona en Forward+).
- Sensación de control con jugadores humanos (ajuste fino pendiente).
- Pantallas de pausa / fin de partida / ajustes: construidas y sin errores al
  cargar, pero no se han navegado con clic en este entorno.

## Limitaciones conocidas

- La IA es correcta pero básica: ~1 toque cada 2,7 s de juego en 2v2; a veces
  rodea el balón; aéreos poco fiables.
- La marca de tiempo de la herramienta de capturas cuenta fotogramas, por lo que
  con render por software la simulación avanza más que los segundos indicados.
- Sin repeticiones de gol (la cámara orbita el punto del gol durante 3 s).
- La reasignación de controles en el menú no está hecha (InputMap sí es remapeable).
- No hay builds exportados: requieren descargar las plantillas de exportación.
