# 01. ARQUITECTURA DEL JUEGO Y ESTRUCTURA DEL REPOSITORIO

## 1.1 Modelo de arquitectura recomendado
Separar cinco capas:

1. **Domain (simulación):** jugador, salud, armas, inventario, tormenta, eventos, construcción, misiones. Determinista y sin dependencias de UI.
2. **Presentation (render):** renderizador 3D, cámara, partículas, UI/HUD, SFX y postprocesado; consume snapshots del dominio.
3. **Input:** teclado, mouse, mando, touch opcional; traduce input a comandos de intención.
4. **Networking:** transporte WebSocket, serialización, interpolation, prediction, reconciliation; jamás decide daño autoritativo.
5. **Services:** cuentas, inventario cosmético, progreso, tienda, temporadas, analytics, bases de datos; independientes de cada frame.

**Principio de una única fuente de verdad:** No mantengas `playerHealth` independiente en HUD, personaje y servidor. La barra se deriva del estado que la simulación entrega. Evita duplicar la definición de modos en el router, lobby, matchmaking y servidor: usa un registro común y versiones.

## 1.2 Monorepo objetivo al escalar
```text
nexus-royale/
  CLAUDE.md
  .claude/rules/ .claude/skills/ .claude/agents/
  apps/
    web/        (Vite, React, R3F, HUD, settings)
    server/     (salas, authoritative tick, matchmaking)
    admin/      (contenido, moderación, economy tools)
  packages/
    shared/     (schemas, config, enums, versioning)
    simulation/ (gameplay rules, Rapier adapters, events)
    content/    (weapons, cosmetics, quests, battle pass)
    networking/ (protocol, snapshots, prediction)
    ui/         (components and tokens)
  assets/
    characters/ animations/ maps/ vfx/ audio/ materials/
    LICENSES.md
  docs/
  tests/
    unit/ integration/ e2e/ load/ security/
  tools/
    content-validator/ map-compiler/ build-asset-manifest/
```
Este kit solo incluye un subconjunto `src/core` y pruebas; migra sus módulos a `packages/simulation` cuando tengas frontend.

## 1.3 Simulación con pasos fijos
Utiliza tick de simulación local de 60 Hz para movimientos sensibles (dt = 1/60 s), con interpolación visual según FPS. Si el servidor adopta 20-30 Hz de snapshots para un primer prototipo online, diseña reconciliación y pruebas; no confundas frecuencia de snapshots con frecuencia de física. Emplea reloj monotónico. Un frame retrasado no debe avanzar la simulación con un `dt` enorme: acumula tiempo, limita pasos de recuperación y monitorea la deriva.

```text
Input físico  -> InputAction {seq,buttons,yaw,pitch,atTick}
               -> Command validation (phase, ammo, cooldown)
               -> Fixed simulation tick -> Events -> New state
               -> Snapshot -> Interpolation -> Render + HUD + audio
               -> Persistence / analytics for durable events
```

## 1.4 Patrones en lugar de una mega clase Game
- `MatchStateMachine`: transiciones de partida.
- `ModeRules`: políticas de construcción, reaparición, win condition, loot.
- `CombatService`: efectos de impacto, salud, escudo, knockdown, muerte.
- `ItemRegistry`: datos y rarezas, sin lógica hardcodeada por arma.
- `BuildPlacementService`: snapping y validación del servidor.
- `StormService`: posición radio y daño por fase.
- `PlayerInventory`: quickbar, consumibles, stacking.
- `MatchResultResolver`: ganadores, placements, eventos firmados.
- `ProgressionService`: adjudicación XP/botín idempotente.
- `ContentManifest`: versiones, assets, licencias y referencias.
- `SceneRenderer` y `HudPresenter`: siguen estado, no lo alteran.

## 1.5 Diseño de eventos
No hagas que `shoot()` directamente sume XP o dinero. `shoot` valida, calcula hit y emite `DamageApplied`; la muerte emite `PlayerEliminated`; la resolución de ronda emite `MatchEnded`; el servicio de progresión puede procesar una única vez `MatchEnded` con un ID persistente. Conserva ID de eventos y versión de schema.

Ejemplo de cadena: `InputShoot → ShotFired → DamageApplied → ShieldBroken? → PlayerKnocked? → PlayerEliminated? → MatchEnded? → RewardGranted`.

## 1.6 Paquetes, herramientas y decisión tecnológica
- **Three.js / R3F:** render 3D en navegador. React UI solo en HUD/menús, no render por cada tick de física.
- **Rapier:** collision shapes, raycast, character controller, gravedad y dinámica. Un controller base no resuelve automáticamente parkour, mantling ni todas las físicas del shooter; prueba salto, slopes y cámara.
- **Zustand o alternativa ligera:** stores de presentación; evitar 60 actualizaciones React por segundo en cientos de componentes.
- **Zod:** validación de contenido JSON y protocolos. Exige schemas para inputs externos.
- **Node WebSocket:** transporte inicial. Abstracción de sala, autenticación, rate limits y tick autoritativo.
- **PostgreSQL:** cuentas, propiedad de cosméticos, temporadas, saldo y ledger (con transacciones).
- **Playwright:** pruebas e2e de menús y smoke tests en navegador.
- **Vitest o node:test:** pruebas de la lógica; este kit utiliza node:test para no requerir dependencias adicionales.

Consulta documentación de versiones al instalar; no fijes versiones en el prompt sin comprobar compatibilidad.

## 1.7 Gestión de errores
Errores críticos: NaNs en posición, referencia a Collider destruido, input de jugador eliminado, duplicación de XP, desincronización de sesión, assets no disponibles, WebGL context lost. Deben registrarse con códigos, no romper la pantalla completa sin un menú de recuperación.

## 1.8 Persistencia y migraciones
No guardes un `PlayerState` entero sin versión. Estructura `schemaVersion`, `accountId`, `loadout`, `settings`, `questProgress`, `wallet` (separado, servidor), `inventory`, `updatedAt`. Escribir migraciones 1 → 2 y pruebas de datos viejos. El guardado local es solo válido para un prototipo offline.
