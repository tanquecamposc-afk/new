# 11. CREATIVO: EDITOR DE ISLAS, GUARDADO Y PUBLICACIÓN

## 11.1 MVP honesto de Creativo
Una pantalla para elegir una plantilla original; entrar en isla 3D de edición; colocar, mover, rotar, escalar (con límites), duplicar y eliminar props; botón playtest que inicia la simulación; guardar JSON validado; cargar isla anterior; exportar y compartir un archivo de escena local. Publicación abierta y servidor de contenidos son fases posteriores.

## 11.2 Herramientas de editor
Select, translate, rotate, scale, place, duplicate, delete, undo/redo, snap-to-grid, terrain paint (fase avanzada), prefab palette, material palette, spawn point, safe area, score area, trigger zone, damage volume, portal y weapon spawner. Cada operación debe tener comando reversible para undo/redo y permisos por rol.

## 11.3 Modelo de datos de isla
```json
{"schemaVersion":1,"mapId":"demo-floating-island","authorId":"local-test","name":"Pilares del Amanecer","maxPlayers":8,"world":{"sky":"sunset","bounds":[-100,-20,-100,100,150,100]},"entities":[{"id":"spawn-a","type":"player_spawn","position":[0,5,0],"rotation":[0,0,0],"properties":{"team":0}},{"id":"floor-a","type":"platform","position":[0,0,0],"rotation":[0,0,0],"scale":[4,1,4],"properties":{"material":"stone"}}],"rules":{"mode":"pillars_nexiph"}}
```

## 11.4 Validación obligatoria
- Máximo de entidades, tamaño payload, materiales y geometrías permitidas.
- Bounding box del mundo y punto de spawn válido por jugador.
- Prohibido código JavaScript arbitrario o HTML peligroso dentro del mapa. Los dispositivos usan DSL con acciones predefinidas y validadores.
- Prevenir ciclos infinitos de triggers, rayos infinitos, miles de spawn loops y modelos gigantes.
- Guardar/leer mapas con versiones migrables, no ejecutar scripts del usuario por defecto.

## 11.5 Dispositivos y eventos
`onEnterZone` → `applyEffect`; `onMatchStart` → `spawnLoot`; `onPlayerEliminated` → `addScore`; `onTimerEnd` → `closeDoor`. Usar un grafo de eventos validado, límite de ejecución por tick y detector de ciclos.

## 11.6 Publicación futura
Autenticación de creadores, revisión, moderación, copyright reports, metadata, vista previa, estadísticas, listas, favoritos, reportes, borrado, versioning, editor colaborativo solo si se diseñó. Nunca declarar «publicar» funcional si solo guarda localmente.
