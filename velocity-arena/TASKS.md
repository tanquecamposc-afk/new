# Tareas

## En curso / siguiente
- [ ] Repeticiones de gol (buffer circular de snapshots + cámara cinemática)
- [ ] Entrenamiento personalizado: formato de pack, ejecución, detección de éxito
- [ ] Editor de packs de entrenamiento (colocar coche/balón, velocidad inicial)
- [ ] Mejorar IA: evitar rodeos, mejores aéreos, rotación 3v3
- [ ] Reasignación de controles en el menú de ajustes
- [ ] Servidor dedicado headless + cliente ENet (entrada → snapshots)
- [ ] Predicción y reconciliación del cliente; interpolación de rivales
- [ ] Pruebas con latencia simulada (0/50/100/150 ms, jitter, pérdida)

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
- [x] Fase 0: entorno, Godot 4.4.1 verificado, estructura, docs, runner de tests
- [x] Fase 1: coche, balón, estadio, cámara, entrada, goles, marcador, reinicio
- [x] Fase 2: aéreos, esquives, flip cancel, flip reset, paredes, pads, demoliciones
- [x] Bots con 7 dificultades, 1v1–4v4, 7 modos mutador, juego libre
- [x] Menú 3D, HUD, pausa, fin de partida, ajustes persistentes, ES/EN, perfil local
