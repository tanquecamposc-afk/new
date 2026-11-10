# 08. SISTEMA COMPLETO DE QA, PRUEBAS Y CRITERIOS DE ACEPTACIÓN

## 8.1 Definición de terminado
Una característica está terminada solo cuando: (a) el comportamiento principal es real y reproducible; (b) estado y UI son consistentes; (c) no rompe flows existentes; (d) supera tests unitarios y manuales relevantes; (e) se registró evidencia de ejecución; (f) su rendimiento no cae por debajo del objetivo de fase en hardware probado; (g) los límites y bugs conocidos están documentados.

## 8.2 Pirámide de pruebas
- **Unit:** vida, daño, escudo, recoil, item cooldown, tormenta, condición de ganador, rangos, compras, XP, idempotencia.
- **Property-based:** 1000 inputs aleatorios dentro de esquema nunca producen salud negativa ni victoria múltiple; seeds reproducibles.
- **Integración:** cliente manda disparo → servidor valida → daño → HUD de ambos; terminar match → recompensa única.
- **E2E:** lobby → seleccionar modo → iniciar → jugar → terminar → regresar; equipar skin → iniciar → skin se ve.
- **Visual:** capturas comparadas a resoluciones fijas con margen; no usar capturas como sustituto de interacciones.
- **Network/load:** 2/8/16 clientes simulados y luego 40-80 solo si servidor lo soporta; jitter y reconexión.
- **Security:** inject damage, spoof player ID, replay rewarded event, bad schema, flood inputs, forged score.
- **Accessibility:** teclado, captions, contraste, focus states y reduce motion.

## 8.3 Casos críticos con ID y criterio de aprobación
| Test ID | Escenario | Criterio |
|---|---|---|
| T01 | WASD y cámara | movimiento relativo a cámara sin atravesar paredes |
| T02 | Salto | altura/aterrizaje consistente a 30/120 FPS visuales |
| T03 | Disparo | munición -1, hit confirmado en collider visible |
| T04 | Escudo | se consume primero y nunca negativo |
| T05 | Recarga | no dispara durante recarga, ammo final correcto |
| T06 | Bot | no atraviesa paredes ni ve a través de muros |
| T07 | Tormenta | tiempo/radio/daño reproducibles por tick |
| T08 | Resultado BR | un solo ganador y salida a lobby |
| T09 | Construcción | materiales, alcance, grid y soporte validados |
| T10 | Zero Build | acción construir rechazada aunque se envíe por API |
| T11 | Reload | teammate vivo permite reaparición antes de lockout |
| T12 | Reload | team wipe cancela respawns pendientes |
| T13 | Pillars Nexiph | máximo 8 y objeto cada 5s |
| T14 | Pillars Hive | máximo 12 y objeto cada 6s |
| T15 | Pillars | caída al vacío elimina y hay ganador único |
| T16 | Ranked | rating únicamente por resultado validado |
| T17 | XP | evento repetido no da XP doble |
| T18 | Tienda | saldo insuficiente rechaza, compra persistente |
| T19 | Locker | skin se ve en lobby y en partida tras reiniciar |
| T20 | Configuración | aplicar/guardar/restablecer produce resultado |
| T21 | Network | dos clientes comparten daño validado |
| T22 | Network | cliente no puede mandar HP o victoria arbitraria |
| T23 | Creativo | mapa guardado/cargado sin deserialización peligrosa |
| T24 | Perf | mides FPS/frame time en perfil definido |
| T25 | Accesibilidad | menús navegables por teclado y focus visible |

## 8.4 Matriz de compatibilidad
Chrome/Chromium moderno (primero), Firefox, Edge, Safari en hardware compatible; teclado/ratón, mandos; 1920×1080, 1366×768 y 1280×720. Pruebas en GPU integrada y dedicada si existe. No afirmar compatibilidad móvil sin test táctil y perf.

## 8.5 Matriz de bugs
Bloqueante P0: no abre juego, pierde compras, crash frecuente, exploit de moneda, daño no autoritativo. Alta P1: partida no termina, jugador atraviesa suelo, respawn imposible, grandes lag spikes. Media P2: HUD no coincide con estado, animación rota, botones parcialmente inaccesibles. Baja P3: typo, transición visual menor.

## 8.6 Plantilla para bug
**Título**; versión/commit; entorno; pasos exactos; esperado; observado; logs; video/captura; severidad; hipótesis; test de regresión añadido; resultado tras arreglo.

## 8.7 Evidencia que exigir a Claude
Una entrega válida debería mencionar el comando y resultado real (`npm test`, build); ruta de archivo; una secuencia de pasos reproducible. Si no hay acceso a navegador, debe decir «no pude verificar visualmente» y dar instrucciones. Una test suite verde no demuestra calidad de sprites/UI/servidores si esas partes no existen.

## 8.8 Métricas de juego y telemetría sin exceso de datos
FPS promedio/p95, frame time p95, tiempo carga, ping, porcentaje de desconexiones, tiempo matchmaking, crash-free sessions, eliminaciones por arma, victoria por zona, drop-offs de tutorial. Sin recoger información personal innecesaria; opt-in/opt-out y privacidad documentados.
