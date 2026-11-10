# 00. PLAN MAESTRO DE PRODUCCIÓN PARA CLAUDE CODE

## 0.1 Objetivo del producto y alcance real
Crear un juego original 3D competitivo en tercera persona, con **sensación profesional de control**, modo de supervivencia Battle Royale y experiencias paralelas de combate rápido, plataformas, construcción, personalización y creación de mapas. El dossier de referencia del 10/11/2026 enumera características populares de Fortnite v43.00; esta ampliación convierte esos requisitos en trabajo técnico verificable. No existe un prompt que produzca automáticamente el volumen de contenido artístico, redes, operaciones y QA de un AAA completo. El proceso debe ser incremental.

**Definición de éxito por niveles:**
- **L0 - Domain Engine:** invariantes y reglas probadas en Node sin gráficos. Este kit contiene una pequeña parte de L0.
- **L1 - Vertical slice local:** escena 3D, jugador con cámara, un arma, enemigos, hud, área segura, victoria/derrota, volver al lobby; ejecutable en un navegador.
- **L2 - Playable Alpha:** construcción, edición, cuatro armas, botín, 3 zonas de mapa, entrenamiento, Recarga y Nexiph-style Pillars en una app local.
- **L3 - Playable Beta:** cuentas, persistencia, matchmaking limitado, partidas con pocos jugadores humanos, servidor autoritativo, reconexión y rankings de prueba.
- **L4 - Content Platform:** pases, misiones, tienda sin cobro real o con integración regulada, Creativo, UGC, red de mapas, medidas de moderación.
- **L5 - Escala de producción:** 40-80 jugadores conectados verificablemente, sistemas antiabuso, balance y observabilidad, regiones de servidores, pruebas de carga y seguridad, 60 FPS objetivos por perfil.

### Matriz vertical slices (orden y entregables)
| ID | Nombre | Resultado demostrable | Pruebas obligatorias |
|---|---|---|---|
| F0 | Fundamentos | monorepo, configuración, tests, build, lint, docs | npm test y typecheck |
| F1 | Movimiento | cámara 3ª persona + WASD + salto + colisiones + pausa | 30s sin atravesar paredes, cámara libre |
| F2 | Combate | 2 armas, apuntar, hit, daño, eliminación, HUD | proyectil/hitscan y escudo en test |
| F3 | Bots | 8 bots con state machine básica y navmesh | detectar, perseguir, atacar, esconderse |
| F4 | BR corto | spawn, loot, storm, top-1, resultados | partida completa de 3-8 min |
| F5 | Construcción | pared/piso/rampa/techo, gasto materiales, edición | colocar, bloquear, editar, destruir |
| F6 | Reload | reaparición por equipo, cierre final, equipo ganador | revive, no revive al eliminar equipo |
| F7 | Pillars | 8 pilares, objeto cada 5s, caída, último vivo | reloj, drops, ganador, reset ronda |
| F8 | Lobby & UX | modos, taquilla, configuraciones y perfil | botones y persistencia funcionales |
| F9 | Contenido | misiones, XP, recompensas, pase demo | dobles eventos no duplican premios |
| F10 | Online pequeño | 2-8 jugadores en sala con server autoridad | validación de daño, reconnect |
| F11 | Ranked | matchmaking por habilidad y rating experimental | rangos, rollback de resultados inválidos |
| F12 | Creativo MVP | colocar props con grid, guardar/cargar mapa | roundtrip JSON, límites y permisos |
| F13 | Optimización | LOD, GPU budget, accesibilidad, compatibilidad | 60 FPS en hardware objetivo comprobado |

**No empezar F10 si F4 no permite una partida completa reproducible. No empezar F9 si inventario, datos y persistencia no están bien definidos.**

## 0.2 Rúbrica de prioridad (RICE simplificada)
Puntuar cada tarea con: *impacto del jugador (1-5) × confianza técnica (1-5) × dependencia solucionada (1-5) / esfuerzo (1-5)*. Priorizar colisiones, input y combate sobre arte cosmético adicional si afectan el resultado. Pueden existir fases de UI de forma paralela, pero no marcar jugable por calidad de un mock.

## 0.3 Estándar para tickets
Cada ticket debe contener:
- Usuario: «Como jugador quiero X para Y».
- Entrada: tecla/click/mensaje/red/archivo.
- Preconditions: fase de partida, arma equipada, materiales, permisos.
- Cambio de estado autoritativo y eventos emitidos.
- Feedback: animación/HUD/sonido/cámara.
- Invalid cases: fuera de alcance, sin munición, spam, muerte, disconnect.
- Criterios de aceptación con pruebas automáticas/manuales.
- Impacto en configuración, rendimiento, accesibilidad y persistencia.

## 0.4 Día típico con Claude Code
1. Abre el repositorio correcto con Git limpio y revisa `docs/PROGRESO.md`.
2. En plan mode solicita «explora F[n], indica archivos, dependencias y pruebas».
3. Aprueba un plan de un alcance moderado: una característica completa, no «todos los modos».
4. Pide implementación y pruebas; ejecuta y copia los errores reales si falla.
5. Audita con el skill `verificar-entrega`; captura video/captura si es posible.
6. Registra versión, deuda, estado real y haz commit atómico. Pasa a la siguiente fase.

## 0.5 Señales de alarma
- Claude responde «ya está» pero no muestra los archivos que editó.
- La app abre un menú pero no contiene una escena 3D controlable.
- Los botones de tienda modifican texto sin persistir ni validar el saldo.
- Las armas producen efectos pero no daño en objetivos.
- Un temporizador usa setInterval no sincronizado y cambia resultados según FPS.
- La «partida multijugador» usa bots de navegador y afirma que hay personas reales.
- Los tests verifican solo que una función existe, no sus invariantes.
- Se cambia de stack sin migración, o se duplica gameplay por cada modo.

## 0.6 Decisiones abiertas (no bloquear F0-F1)
Plataforma principal: navegador escritorio 16:9. Motor sugerido: Three.js + React Three Fiber + Rapier para prototipo, pero validar API y capacidades reales. Backend futuro: Node WebSocket + PostgreSQL, con salas autoritativas. Calendario de temporada del producto debe ser original; no depender del contenido en vivo de terceros.
