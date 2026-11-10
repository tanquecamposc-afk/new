# 05. MULTIJUGADOR REAL, NETCODE Y SERVIDOR AUTORITATIVO

## 5.1 Etapas de implementación
1. **Offline:** servidor lógico embebido que controla mundo y bots, aunque esté en la misma pestaña.
2. **LAN/desarrollo:** Node server local, 2 clientes reales, WebSocket, IDs, sala, logs de input, snapshots.
3. **Online alfa:** autenticación, colas privadas, 2-8 jugadores, reconexión, protección básica contra spam.
4. **Beta:** colas, regiones, bots claramente etiquetados, 10-40 jugadores si rendimiento lo permite.
5. **Escala:** 40-80 con prueba de carga, servidores en regiones y presupuesto real. No prometer capacidad sin medida.

## 5.2 Autoridad y confianza
Servidor determina: posición válida, gravedad/colisiones, raycast/daño, velocidad de disparo, inventory ownership, pickup, materiales, storm, respawn, winner, score, moneda, XP/rango. Cliente solicita: movimiento deseado, apuntado, disparar, editar, interactuar, usar ítem. El servidor NUNCA acepta «hice 500 de daño» ni «gané 1000 monedas» de un paquete cliente.

### Latencia, predicción e interpolación
- Cliente predice su movimiento para sensación inmediata; añade `inputSequence` a cada entrada.
- Servidor responde con estado autoritativo y último `inputSequence` procesado.
- Cliente corrige y reproduce entradas pendientes; suaviza pequeñas diferencias visualmente.
- Otros jugadores se interpolan con buffer; no hacer teletransportes continuos.
- Para disparo, manejar hit validation/lag compensation con ventana pequeña y validada, no rewind infinito.
- Prueba artificial: latencias 0, 80, 150, 250 ms; 0/2/5% packet loss; jitter variable. Documenta resultados.

## 5.3 Esquema de snapshot
`tick`, `matchId`, `worldRevision`, `lastInputSeq`, `entities[]` delta, `events[]`, `storm`, `modeState`, `checksum`. No envíes todo el mapa a todos los clientes cada tick; usa estados compactos, interés espacial, particionado y delta updates. Datos grandes de cosméticos se descargan como assets CDN, no cada frame.

## 5.4 Seguridad del protocolo
- Autenticación temporal de conexión, expiración, reconexión con token separado.
- Validación de contenido de cada mensaje y versionado.
- Rate limit por jugador/IP cuando corresponde; límites de payload y longitud de cadenas.
- Replay prevention o secuencias monotonías para acciones críticas.
- Backpressure por conexiones lentas, desconectar clientes maliciosos, no escribir logs sensibles.
- Servidor controla RNG de loot y match results.
- No exponer claves privadas, connection strings ni APIs administrativas al frontend.

## 5.5 Matchmaking de prototipo
Colas por `modeId`, región, equipo, habilidades y tiempo de espera. Si el jugador escoge Ranked, exigir servidor real con resultados persistentes; offline usar etiqueta «Práctica Ranked» sin otorgar rangos oficiales. Un lobby debe manejar invite, ready, leave party, kick con permisos, cambio de líder, deserter penalty si existe y reconexión. No mezclar equipos de tamaños incompatibles.

## 5.6 Tiempo, estado y concurrencia
- Asignar a cada match un proceso worker/sala con secuencia única de ticks.
- Evitar duplicación de eventos en reintentos de red con event IDs.
- Limitar efectos de recuperación de la partida si el proceso reinicia; según fase, terminar sin premiar o restaurar snapshot.
- Guardar en DB resultados y recompensas con transacción única.
- Para ranking, la firma del resultado no viene del cliente.

## 5.7 Pruebas previas a decir 'online'
Dos navegadores en dos equipos conectan al mismo servidor; uno se mueve, el otro ve una posición coherente. Si el jugador A daña a B, la salud baja de forma idéntica en ambos, tras confirmación de servidor. Un tercero intenta inyectar daño imposible, el servidor lo rechaza. Desconectar/reconectar mantiene estado si el timeout permite. Una muerte simultánea no crea dos ganadores ni dos recompensas.

## 5.8 Datos personales y menores
Definir edad mínima, protección de menores, bloqueo/reporte de usuarios, moderación de chat/UGC y políticas transparentes. Para un juego público puede requerirse asesoría legal según región. Nunca almacenar datos sensibles innecesarios. Evitar cobros en etapa local.
