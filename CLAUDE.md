# OneBlock — documentación técnica

Plugin OneBlock para **Paper 1.20.4+** (Java 17, Maven, Adventure/MiniMessage, Display Entities,
SQLite + HikariCP, PlaceholderAPI opcional).

## Compilar

```bash
mvn clean package
```

El jar sale en `target/OneBlock-1.0.0.jar` con HikariCP y el driver SQLite ya incluidos
(shade + relocation de `com.zaxxer.hikari` a `com.oneblock.libs.hikari`).

Repositorios necesarios: `repo.papermc.io` (paper-api) y `repo.extendedclip.com` (PlaceholderAPI).

## Arquitectura

```
com.oneblock
├── OneBlockPlugin.java      ciclo de vida, tareas, acceso a todos los managers
├── api/                     OneBlockBreakEvent, OneBlockPhaseChangeEvent, OneBlockSkinChangeEvent
├── command/                 OneBlockCommand (/ob)
├── config/                  ConfigManager (config, phases, skins, messages) + Messages
├── cosmetics/               BlockSkin, SkinManager, ParticleHaloTask
├── display/                 HologramManager, HUDManager, LeaderboardManager, ParticleEngine
├── gui/                     GUIManager, GUIHolder, GUIAction, GUIListener
├── hook/                    PlaceholderHook
├── island/                  Island, IslandManager
├── listener/                BlockListener, PlayerListener, VoidListener
├── phase/                   Phase, PhaseManager
├── storage/                 Database (interfaz), SQLiteStorage
└── util/                    Text (MiniMessage), Particles, Items
```

Regla de hilos: **todo lo que toca el mundo corre en el hilo principal**; todo SQL sale del hilo
principal vía `OneBlockPlugin#async(...)` y vuelve con `OneBlockPlugin#sync(...)`.

## Comandos

| Comando | Permiso | Qué hace |
|---|---|---|
| `/ob gui` · `/ob menu` | `oneblock.use` | Menú principal de 54 slots |
| `/ob create` | `oneblock.use` | Crea la isla y teletransporta |
| `/ob home` | `oneblock.use` | Vuelve a la isla |
| `/ob top` | `oneblock.use` | Top 10 por chat |
| `/ob invite <jugador>` | `oneblock.use` | Añade miembro |
| `/ob kick <jugador>` | `oneblock.use` | Quita miembro |
| `/ob transfer <jugador>` | `oneblock.use` | Transfiere la propiedad |
| `/ob settop` | `oneblock.admin` | Coloca el holograma del Top 10 aquí |
| `/ob reload` | `oneblock.admin` | Recarga config, fases y cosméticos |

Permisos: `oneblock.use` (default true), `oneblock.admin` (op), `oneblock.skin.*` y
`oneblock.skin.<id>` por cosmético.

## Placeholders (PlaceholderAPI)

| Placeholder | Valor |
|---|---|
| `%oneblock_phase%` | Nombre de la fase actual |
| `%oneblock_phase_id%` | Id interna de la fase |
| `%oneblock_count%` / `%oneblock_blocks%` | Bloques picados |
| `%oneblock_next_phase%` | Bloques que faltan para la siguiente fase |
| `%oneblock_next_phase_name%` | Nombre de la siguiente fase (`MAX` si es la última) |
| `%oneblock_progress%` | Progreso dentro de la fase (0-100) |
| `%oneblock_members%` | Miembros de la isla |
| `%oneblock_halo%` / `%oneblock_pedestal%` | Cosmético equipado |
| `%oneblock_top_<n>_name%` | Nombre del puesto n (1-10) |
| `%oneblock_top_<n>_blocks%` | Bloques del puesto n |
| `%oneblock_top_<n>_uuid%` | UUID del puesto n |

## Cosméticos (`skins.yml`)

Tres tipos, uno equipable a la vez por isla:

- `PEDESTAL` — anillo de `ItemDisplay` que flota y gira alrededor del bloque
  (`pedestal-material`, `pedestal-count`, `pedestal-scale`).
- `HALO` — aura de partículas con forma `RING`, `SPIRAL`, `HEART`, `STORM` o `VORTEX`
  (`particles`, `particle-count`, `radius`, `color.red/green/blue` para partículas de polvo).
- `SOUND` — sonido al romper el bloque (`sound` como clave vanilla, `pitch`, `volume`).

Desbloqueo: por permiso `oneblock.skin.<id>` **o** por progreso, con `required-phase`
(índice de fase empezando en 0). Los nombres de partícula se resuelven en runtime, así que un
nombre que no exista en la versión del servidor se ignora en vez de romper el plugin.

## Fases (`phases.yml`)

Cada fase define `required-blocks` (acumulado), `blocks` y `mobs` con pesos `NOMBRE:peso`,
`chest-loot` / `special-loot` con `NOMBRE:cantidad`, `icon`, `color` (MiniMessage),
`bossbar-color` y `border-size` (tamaño del WorldBorder animado al entrar en la fase).

Probabilidades de regeneración, configurables en `config.yml` → `chances`:
2 % bloque especial, 12 % cofre, 15 % mob, resto bloque normal de la fase.

## Eventos de la API

```java
@EventHandler
public void onBreak(OneBlockBreakEvent event) {   // cancelable
    event.getIsland(); event.getPhase(); event.getBlock();
}

@EventHandler
public void onPhase(OneBlockPhaseChangeEvent event) {  // getFrom() / getTo()
}

@EventHandler
public void onSkin(OneBlockSkinChangeEvent event) {     // cancelable
}
```

## Base de datos

SQLite en `plugins/OneBlock/oneblock.db` a través de HikariCP (`ob_islands`, `ob_members`,
índice `ob_islands_blocks` para el Top 10). La interfaz `Database` está pensada para añadir un
`MySQLStorage` sin tocar el resto del plugin: mismo contrato, mismas llamadas asíncronas.

## Tareas periódicas

- `ParticleHaloTask`: cada `cosmetics.halo-period-ticks` (3 por defecto), solo para islas con un
  jugador dentro de `cosmetics.render-distance`.
- Leaderboard: cada `leaderboard.refresh-seconds` (60), consulta asíncrona + repintado síncrono.
