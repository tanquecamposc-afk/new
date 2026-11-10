# 03. GAMEPLAY CUANTIFICADO, BALANCE Y FEEL
**ADVERTENCIA:** todas las cifras de esta página son **valores originales propuestos para un prototipo**. No representan cifras verificadas del Fortnite actual. Claude debe implementarlos como config y facilitar cambio por versión de modo.

## 3.1 Movimiento propuesto
| Parámetro | Prototipo | Test |
|---|---:|---|
| Walking speed | 5.0 m/s | 5 m en ~1 s sobre plano |
| Sprint speed | 7.0 m/s | mayor que walk, no atraviesa collider |
| Crouch speed | 2.5 m/s | hitbox se reduce correctamente |
| Slide initiation | sprint + crouch | no activable en aire si no se diseñó |
| Jump velocity | 6.2 m/s | reproduce parábola con gravedad |
| Gravity | -18 m/s² | caída y aterrizaje repetibles |
| Max slope | 45 grados | deslizar/deshabilitar escalar si excede |
| Step height | 0.3 m | no atascarse en escalón pequeño |
| Camera distance | 4.0 m | raycast evita entrar en muro |
| ADS FOV | 55 grados | suave y reversible |
| Default FOV | 75 grados | configurable por accesibilidad |
| Fall damage start | 8 m | aplicable tras aterrizar, no en glider |

Velocidades solo para prueba. Cuida aceleración, frenado, air control, friction y third-person camera smoothing con curvas, no teletransportes. El control es lo más importante: ajustar mediante playtests, no confiar en la cifra inicial.

## 3.2 Armas de arranque (ficticias)
| ID | Tipo | Daño cuerpo | Mult. cabeza | Cargador | Ritmo | Recarga | Alcance base |
|---|---|---:|---:|---:|---:|---:|---:|
| `starter_ar` | rifle | 25 | 1.8x | 30 | 8/s | 2.0s | 60m |
| `starter_shotgun` | escopeta | 10 × 8 perdigones | 1.5x por perdigón | 5 | 0.85/s | 3.6s | 12m |
| `starter_smg` | SMG | 18 | 1.5x | 32 | 11/s | 2.4s | 30m |
| `starter_sniper` | francotirador | 90 | 2.0x | 1 | 0.65/s | 2.8s | 160m |
| `starter_pistol` | pistola | 32 | 1.75x | 12 | 4/s | 1.6s | 40m |
| `starter_melee` | cuerpo a cuerpo | 20 | 1.0x | n/a | 1.8/s | n/a | 2m |

Armas de disparo hitscan para MVP: raycast, materiales de impacto, paredes y props que bloquean, shotgun multiray por perdigón y caída de daño por distancia. Projectiles y explosivos después de estabilizar. `Spread` reproducible por semilla; recoil visual y matemático; daño a escudo antes de vida; hitmarker por confirmación de simulación. No permita que el HUD determine un disparo exitoso.

## 3.3 Recursos y curación originales
Salud base 100, escudo máximo 100 (según modo); mini escudo +25 con tope opcional 50, gran escudo +50 hasta 100, vendaje +15 hasta tope 75, kit médico recuperación completa con tiempo de canalización; poción de movilidad y sprite definido por `EffectDefinition`. Estas cifras son propuestas. Cancelación por disparo/movimiento según item. Debe haber exclusividad de estados para evitar consumir y disparar simultáneamente si el diseño lo prohíbe.

## 3.4 Estructuras propuestas
- Grid base 4m × 4m; pared, suelo, rampa y cono; pivots consistentes para snaps.
- Recursos madera/piedra/metal (nombres genéricos de materiales); costo 10 por pieza; salud y tiempo de construcción por material configurables.
- Distancia de colocación 8m desde jugador; prueba de soporte y colisión.
- Edición con patrón 3×3 en paredes y otra geometría según pieza; solo piezas que se poseen o si se otorgan permisos de Creative.
- Construcción no permitida en Zero Build, durante espectador ni en zonas marcadas `no-build`.

## 3.5 Tormenta de prototipo
Usa `SAMPLE_STORM` de `src/core/storm.ts`. Cada fase tiene `waitSeconds`, `shrinkSeconds`, `targetRadius`, `damagePerSecond`. Mostrar aviso 10 s antes de cierre, interpolar el centro y radio, sincronizar daño al tick; si se pasa a online, el servidor define el círculo. Comprobar mismo resultado a 30 y 120 FPS visuales.

## 3.6 Bots de práctica
Máquina mínima `PATROL → INVESTIGATE → CHASE → ATTACK → RETREAT → SEARCH → PATROL`. Usar percepción por visión (FOV+raycast) y sonido aproximado (radio y intensidad). Variar precisión artificial, tiempos de reacción y movilidad; evitar bots omniscientes. Un bot que pierde su objetivo no debe continuar disparando a través de paredes. Escalar desde 2 hasta 8 y 16 bots midiendo FPS.

## 3.7 Sprite/poderes originales
Efectos como `speed_boost`, `shield_pulse`, `short_dash`, `temporary_camouflage`, `jump_boost` mediante tabla `durationTicks`, `charges`, `cooldownTicks`, `stackPolicy`, `serverValidation`, `audioCue`, `vfxId`. Atribuir poder a clase/equipo y evitar ventajas de pago. No copiar diseños específicos de personajes de colaboraciones.

## 3.8 Economía y progresión de juego propuestos
XP por sobrevivir, daño causado, reanimación y victoria, todo con límites diarios y deduplicación; diseño idempotente. La tabla del pase debe tener 50 niveles de prueba en MVP de progresión, sin exigir contenido artístico ya terminado. Tienda demo con moneda ficticia generada localmente primero; transacciones monetarias reales solo después de seguridad/legalidad y backend.
