# Tareas

## En curso / siguiente
- [ ] Repeticiones de gol (buffer circular de snapshots + cámara cinemática)
- [ ] Entrenamiento personalizado: formato de pack, ejecución, detección de éxito
- [ ] Editor de packs de entrenamiento (colocar coche/balón, velocidad inicial)
- [ ] Mejorar IA: evitar rodeos, mejores aéreos, rotación 3v3
- [ ] Reasignación de controles en el menú de ajustes
- [ ] Probar multijugador entre dos redes reales con un servidor público (necesita VPS y autorización)
- [ ] Backend HTTPS: cuentas persistentes, amigos, grupos (PostgreSQL + Redis)
- [ ] Competitivo: MMR por lista, ligas, clasificaciones; torneos en línea
- [ ] Juego libre en línea; modos arcade extra con estadios propios en línea

## Contenido
- [ ] 2.º y 3.er vehículo (familias de hitbox: larga-baja, alta-compacta)
- [ ] Estadios: Neon District, Frozen Circuit (reutilizan `ArenaShape`)
- [ ] Modos con estadio especial: Aros, Hockey sobre hielo, Suelo Explosivo
- [ ] Modo Caos de Poderes (sistema de habilidades con validación de servidor)
- [ ] Eliminación (sin balón, agarrar/lanzar, área que se reduce)

## Infraestructura
- [ ] Exportar build de Linux/Windows (descargar plantillas de exportación 4.4.1)
- [ ] Backend (autenticación, perfiles, MMR, matchmaking) con PostgreSQL/Redis
- [ ] CI: ejecutar `tests/run_tests.gd` en cada push

## Hecho
- [x] Multijugador: servidor dedicado, salas con código y contraseña, lobby, chat, cola casual, LAN, reconexión, predicción y reconciliación, simulador de red, overlay F4
- [x] Despliegue: Dockerfile, compose, scripts (Docker sin verificar)
- [x] Pasada visual: coche v2, estadio con costillas y anillo LED, cielo estrellado
- [x] Fase 0: entorno, Godot 4.4.1 verificado, estructura, docs, runner de tests
- [x] Fase 1: coche, balón, estadio, cámara, entrada, goles, marcador, reinicio
- [x] Fase 2: aéreos, esquives, flip cancel, flip reset, paredes, pads, demoliciones
- [x] Bots con 7 dificultades, 1v1–4v4, 7 modos mutador, juego libre
- [x] Menú 3D, HUD, pausa, fin de partida, ajustes persistentes, ES/EN, perfil local
