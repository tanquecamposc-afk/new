# Anime Crossover Engine (Unity)

Base de combate cuerpo a cuerpo para un ARPG de anime en Unity 2022.3 LTS. Incluye:
- combos por frame data con input buffer y hit stop;
- hitboxes sin tunneling (`OverlapBoxNonAlloc`);
- dash con i-frames;
- vida con equipos y puntos débiles;
- enemigo con IA;
- pool de VFX;
- pruebas EditMode.

## Requisitos

- Unity **2022.3 LTS**.
- Paquetes:
  - **Input System** (`com.unity.inputsystem`). En Player Settings, Active Input Handling debe ser *Input System Package* o *Both*.
  - **Test Framework** (`com.unity.test-framework`), que viene por defecto.
- **Project Settings → Time → Fixed Timestep = `0.0166667`**, para que un frame de combate sea un frame a 60 FPS.

## Instalación

Copia la carpeta `Assets/` dentro de tu proyecto. Los `.asmdef` crean dos ensamblados: `AnimeCrossover.Runtime` y `AnimeCrossover.Tests.EditMode`.

## Montar la escena

### 1. Datos
En la ventana Project, usa **Create → Anime Crossover**:
- **Attack** (por ejemplo `Attack_Light1`, `Attack_Light2`, `Attack_Light3`): daño, aturdimiento, empuje, caja, frames, hit stop, trigger del Animator y clave de VFX.
- **Combo** (`Combo_Light`): arrastra los ataques en orden.
- **Character Stats** (`Stats_Player`, `Stats_Goblin`): vida, velocidad y dash.

### 2. Input
Crea un Input Actions asset con un mapa `Player` y tres acciones:
- **Move**: Value/Vector2. WASD y el stick izquierdo.
- **Attack**: Button. Clic izquierdo y botón Oeste del mando.
- **Dash**: Button. **Shift** y botón Este.

### 3. Capas
Crea la capa **Hurtbox** y pon ahí los colliders de los `Hurtbox`. En el `HitboxManager` de cada personaje, pon `Hurtbox Layers` = Hurtbox.

### 4. Jugador
En un GameObject con Rigidbody y CapsuleCollider, añade:
- `CharacterInput` (asigna las tres acciones);
- `CharacterMotor` (Stats);
- `CharacterDash` (Stats);
- `Health` (Team = Player, Stats);
- `HitboxManager`;
- `CombatEngine` (Combo, Animator);
- `CharacterMovement`.

Dentro, crea un hijo con un collider en la capa Hurtbox y el componente `Hurtbox`. Ponle la etiqueta **Player** al objeto raíz.

### 5. Enemigo
Monta lo mismo que el jugador, pero con estos cambios:
- quita `CharacterInput`, `CharacterDash` y `CharacterMovement`, y añade `EnemyBrain`;
- en `Health`, pon Team = Enemy.

### 6. VFX
Añade a la escena un objeto `PoolService` con una entrada `HitVFX`: el prefab de partículas y un precalentado de 16. Pon un `PooledObject` al prefab con Lifetime de 0,5 s para que vuelva solo al pool.

### Parámetros del Animator
Todos son opcionales:
- `Speed` (float);
- `Hit` y `Dash` (trigger);
- `Dead` (bool);
- los triggers de cada ataque (`Attack1`, `Attack2`…).

## Pruebas

**Window → General → Test Runner → EditMode → Run All.** Cubren:
- las fases de `AttackTimeline`, el hit stop y la cancelación;
- las transiciones de `StateMachine` y sus errores;
- `Health`: daño, muerte, fuego amigo, multiplicador, invulnerabilidad y curación.

## Estructura

```
my-anime-crossover/
├── CLAUDE.md                  reglas del proyecto para Claude Code
├── ARCHITECTURE.md            diagrama y flujo de un golpe
├── README.md
├── .editorconfig              estilo de código C#
└── Assets/
    ├── Scripts/                              AnimeCrossover.Runtime.asmdef
    │   ├── Core/
    │   │   ├── HitboxData.cs                 datos del golpe + frame data
    │   │   ├── DamageInfo.cs                 DamageInfo, Team, IDamageable, IInvulnerabilitySource
    │   │   ├── FrameTime.cs                  conversión frames ↔ segundos
    │   │   ├── StateMachine/StateMachine.cs  máquina de estados genérica
    │   │   └── Pooling/                      ObjectPool, PooledObject, PoolService
    │   ├── Data/                             AttackDefinition, ComboDefinition, CharacterStats
    │   ├── Combat/                           AttackTimeline, HitboxManager, Hurtbox, Health, CombatEngine
    │   ├── Controllers/                      CharacterInput, CharacterMotor, CharacterDash, CharacterMovement
    │   │   └── States/CharacterStates.cs     Idle, Move, Attack, HitStun, Dash, Dead
    │   └── Enemies/EnemyBrain.cs             IA: Idle → Chase → Attack → HitStun/Dead
    └── Tests/EditMode/                       AnimeCrossover.Tests.EditMode.asmdef + pruebas
```
