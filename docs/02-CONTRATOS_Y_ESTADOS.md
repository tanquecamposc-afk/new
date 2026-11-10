# 02. CONTRATOS, MÁQUINAS DE ESTADO E INVARIANTES

## 2.1 Objetos y contratos
Un `ModeConfig` necesita: `modeId`, `ruleSetVersion`, `maxPlayers`, `minPlayers`, `allowedTeamSizes`, `buildPolicy`, `lootPoolId`, `stormScheduleId`, `respawnPolicy`, `rankedPolicy`, `winPolicy`, `mapRotation`, `spawnPolicy` y `sourceStatus`. Añade `UIVisibility` por modo (por ejemplo, construcción desactivada) para que el HUD refleje la regla real.

Un `PlayerState`: `id`, `teamId`, `position`, `rotation`, `velocity`, `isGrounded`, `movementState`, `health`, `shield`, `inventory`, `activeSlot`, `materials`, `aliveState`, `statistics`, `connectionState` y `serverTick`. Evita valores indefinidos: enum `alive | knocked | eliminated | spectating`. Todo número debe tener límites comprobados.

Un `WeaponState`: `weaponId`, `instanceId`, `ammoInMag`, `ammoReserve`, `fireCooldownTicks`, `reloadFinishTick | null`, `spreadSeed`, `rarity`, `attachmentIds`. Nunca pases `baseDamage` del cliente al servidor.

Un `BuildPiece`: `pieceId`, `ownerId`, `teamId`, `type`, `material`, `gridX`, `gridY`, `gridZ`, `rotation`, `editPattern`, `health`, `placedAtTick`, `worldRevision`.

## 2.2 Estado de lobby
`NOT_AUTHENTICATED → HOME → PARTY_READY → SEARCHING → MATCH_FOUND → LOADING → IN_MATCH → RESULTS → HOME`.
- Solo el líder cambia modo en equipos online, salvo política expresa.
- Buscar partida exige validación de región, disponibilidad, equipo, tamaño.
- Cancelar matchmaking devuelve a HOME y libera reserva.
- Si la conexión se pierde durante loading, reintentar/reconectar con timeout.

## 2.3 Estado de partida BR
`CREATED → WAITING → WARMUP → DROP → ACTIVE → FINAL_CIRCLE → RESOLVING → RESULTS → CLOSED`.
Solo `ACTIVE` y `FINAL_CIRCLE` aplican puntuación de daño/comportamiento; `WARMUP` no otorga XP competitivo. `RESOLVING` debe ser idempotente para que dos eventos de eliminación simultáneos no generen dos ganadores.

## 2.4 Estado de jugador
- `alive`: puede moverse/disparar/curarse/recoger.
- `knocked`: vida de derribado y acciones restringidas, revivir permitido si reglas lo incluyen.
- `eliminated`: sin controles de ataque; espectar/reiniciar según modo.
- `spectating`: cámara sigue a objetivos permitidos; sin colisión de combate.
- `respawning`: cuenta atrás y posicionado en punto válido, inmunidad breve si se define.

## 2.5 Estado de arma
`ready → firing → cooldown → ready` o `ready → reloading → ready`; un arma sin munición no dispara. Cambiar de arma durante recarga usa política configurable (cancelar/continuar). El disparo necesita validar estado de jugador, intervalos, línea de visión, munición y alcance.

## 2.6 Invariantes que nunca deben violarse
- Salud y escudo entre 0 y máximos; no valores negativos ni NaN.
- Eliminado no recibe daño adicional, no dispara y no obtiene múltiples eliminaciones por el mismo evento.
- Munición y materiales nunca negativos; en Zero Build, construir se rechaza en el dominio, no solo se oculta UI.
- Una entidad/item de botín no puede reclamarse por dos jugadores; usar control de concurrencia en servidor.
- Una partida termina una vez y tiene un único resultado firmado; empatados requieren política explícita.
- La tormenta no puede tener radio negativo; centro siguiente dentro de zona permitida de diseño.
- Ningún respawn aparece dentro de collider sólido o fuera del mapa jugable.
- Recompensas de evento repetido no duplican saldo, XP ni rango.
- Configurar una skin cambia aspecto, no estadísticas del combate salvo una mecánica de gameplay explícita, anunciada y balanceada.
- Datos del contenido deben ser retrocompatibles o migrarse por versión.

## 2.7 Protocolo de eventos de red (ejemplo)
```json
{"v":1,"type":"client.input","seq":173,"clientTick":3902,"data":{"moveX":0.2,"moveZ":1,"jump":false,"fire":true,"yaw":2.15,"pitch":-0.14}}
{"v":1,"type":"server.snapshot","tick":3991,"lastProcessedSeq":173,"data":{"entities":[{"id":"p1","x":1.2,"y":0,"z":-9.4}]}}
{"v":1,"type":"server.match_event","eventId":"match1:kill:224","tick":3991,"event":"PlayerEliminated","actorId":"p1","targetId":"p2"}
```
**Estos son esquemas ilustrativos, no un protocolo completo ni seguro.** Añadir autenticación, validación, rate limiting, compresión, delta snapshots, reconexión y límites antes de publicar.

## 2.8 Contratos de acción
Para cada acción de juego documenta: `request -> server validate -> simulation change -> event -> render feedback -> persistence`. Ejemplo `InteractChest`: distancia <= rango, cofre sin abrir, línea de vista, jugador vivo. Efecto: marca cofre como abierto, genera botín por RNG de servidor, envía evento. Fallo: sin items y mensaje de acción rechazada sin animación de recompensa.
