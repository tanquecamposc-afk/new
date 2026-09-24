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
- `CharacterMovement`;
- opcional: `TargetAssist`, para girar el golpe hacia el enemigo más cercano en la dirección que pulsas;
- opcional: `PlayerRespawner`, para reaparecer en el punto de control al morir.

Dentro, crea un hijo con un collider en la capa Hurtbox y el componente `Hurtbox`. Ponle la etiqueta **Player** al objeto raíz.

### 5. Enemigo
Monta lo mismo que el jugador, pero con estos cambios:
- quita `CharacterInput`, `CharacterDash` y `CharacterMovement`, y añade `EnemyBrain`;
- en `Health`, pon Team = Enemy.

### 6. Barra de vida
Dentro del personaje, crea un hijo `HealthBar` con el componente `HealthBarWorld`. Dentro de él pon:
- un hijo `Visual` (asígnalo a *Visual Root*) con dos quads o sprites, `Fill` y `Trail`, cada uno con el pivote en su borde izquierdo;
- asigna esos dos al componente.

La barra mira a la cámara, se oculta con la vida llena y la estela baja con retraso.

### 7. Zonas de enemigos
Crea un objeto con `EnemySpawner`, asígnale el prefab del enemigo, cuántos quieres y, si quieres, puntos de aparición. Los enemigos se crean una sola vez. Al morir se desactivan y el spawner los reaparece reciclados pasado un tiempo, siempre lejos del jugador.

### 8. VFX
Añade a la escena un objeto `PoolService` con una entrada `HitVFX`: el prefab de partículas y un precalentado de 16. Pon un `PooledObject` al prefab con Lifetime de 0,5 s para que vuelva solo al pool.

### Parámetros del Animator
Todos son opcionales:
- `Speed` (float);
- `Hit` y `Dash` (trigger);
- `Dead` (bool);
- los triggers de cada ataque (`Attack1`, `Attack2`…).

## Pruebas

**Sin Unity:** `./tools/verify.sh` hace dos cosas (requiere mono):
- compila todo el código contra los ensamblados de referencia reales de Unity, con los avisos tratados como errores;
- ejecuta las pruebas que no necesitan el motor.

El CI de GitHub (`.github/workflows/unity.yml`) lo lanza en cada push que toca este proyecto.

**En Unity:** Window → General → Test Runner → EditMode → Run All. Cubren:
- las fases de `AttackTimeline`, el hit stop y la cancelación;
- las transiciones de `StateMachine` y sus errores;
- `ComboSequencer`: encadenar golpes, volver al primero y reiniciar por tiempo;
- `HealthModel`: daño, muerte, fuego amigo, invulnerabilidad, daño negativo y curación;
- `Health` con GameObjects: multiplicador de daño y fuentes de invulnerabilidad.

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
    │   ├── Combat/
    │   │   ├── AttackTimeline.cs             frames de un golpe (C# puro)
    │   │   ├── ComboSequencer.cs             qué golpe del combo toca (C# puro)
    │   │   ├── HealthModel.cs                reglas de la vida (C# puro)
    │   │   ├── Health.cs                     IDamageable + eventos
    │   │   ├── Hurtbox.cs                    zona golpeable con registro
    │   │   ├── HitboxManager.cs              OverlapBoxNonAlloc por frame
    │   │   ├── CombatEngine.cs               combo, buffer, hit stop, VFX
    │   │   ├── TargetAssist.cs               apuntado al empezar el golpe
    │   │   └── HealthBarWorld.cs             barra de vida sin UGUI
    │   ├── Controllers/                      CharacterInput, CharacterMotor, CharacterDash, CharacterMovement, PlayerRespawner
    │   │   └── States/CharacterStates.cs     Idle, Move, Attack, HitStun, Dash, Dead
    │   └── Enemies/                          EnemyBrain (IA), EnemySpawner (reciclado)
    ├── Tests/EditMode/                       AnimeCrossover.Tests.EditMode.asmdef + pruebas
└── tools/
    ├── verify.sh                             compila contra Unity y pasa las pruebas sin abrir el editor
    └── stubs/InputSystemStub.cs              firmas del Input System para compilar fuera de Unity
```
