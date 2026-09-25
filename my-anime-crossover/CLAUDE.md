# Anime Crossover Engine - Rules & Architecture

## Tech Stack
- Engine: Unity 2022.3 LTS / 60 FPS Target (Fixed Timestep = 0.0166667)
- Language: C# (.NET Standard 2.1)
- Input System: Unity New Input System (`com.unity.inputsystem`)
- Tests: Unity Test Framework (NUnit), EditMode

## Combat Architecture Guidelines
1. **Hitboxes**: DO NOT use Unity Physics Trigger Colliders (`OnTriggerEnter`) for melee attacks. Use **OverlapBoxNonAlloc** frame-by-frame via `HitboxManager` to prevent high-speed tunneling.
2. **Hurtboxes**: targets are found through the `Hurtbox` registry (collider → owner), never with `GetComponent` in the hit loop.
3. **State Machine**: All character actions (Idle, Move, Attack, HitStun, Dash, Dead) MUST pass through `StateMachine<TId>`. Never change state inside `Enter`/`Exit` (it throws); defer to `Tick`.
4. **Performance**: No `GetComponent`, `Instantiate`, LINQ or allocations inside combat loops. Cache references in `Awake`; spawn VFX with `PoolService`.
5. **Frame Data**: Attacks are driven by `AttackTimeline` (Startup, Active, Recovery, hit stop) stepped in `FixedUpdate`.
6. **Single writer**: only `CharacterMotor` writes `Rigidbody.velocity`. States request movement, dash uses `SetVelocityOverride`, hits use `AddKnockback`.
7. **Damage flows through `Health`**: it is the only `IDamageable`. Controllers react to `Health.Damaged` / `Health.Died` events.
8. **Data in ScriptableObjects**: attacks (`AttackDefinition`), combos (`ComboDefinition`) and tuning (`CharacterStats`) are assets, not hard-coded numbers.

## Code Style
- PascalCase for public properties/methods/events.
- camelCase with underscore prefix (`_variable`) for private fields.
- Use explicit types instead of `var` for combat logic readability.
- One public type per file; file name = type name (MonoBehaviours and ScriptableObjects must).
- `sealed` by default; `[SerializeField] private` instead of public fields.
- XML `<summary>` on every public type explaining *why*, not *what*.

## Project Map
| Carpeta | Contenido |
|---|---|
| `Assets/Scripts/Core` | Tipos compartidos (`HitboxData`, `DamageInfo`, `IDamageable`, `FrameTime`), `StateMachine/`, `Pooling/` |
| `Assets/Scripts/Data` | ScriptableObjects: `AttackDefinition`, `ComboDefinition`, `CharacterStats` |
| `Assets/Scripts/Combat` | Lógica pura (`AttackTimeline`, `ComboSequencer`, `HealthModel`) + componentes (`HitboxManager`, `Hurtbox`, `Health`, `CombatEngine`, `TargetAssist`, `HealthBarWorld`) |
| `Assets/Scripts/Controllers` | `CharacterInput`, `CharacterMotor`, `CharacterDash`, `CharacterMovement` (cerebro), `PlayerRespawner` y `States/` |
| `Assets/Scripts/Enemies` | `EnemyBrain` (IA cuerpo a cuerpo), `EnemySpawner` (reciclado sin Instantiate) |
| `Assets/Tests/EditMode` | Pruebas de `AttackTimeline`, `ComboSequencer`, `StateMachine`, `HealthModel` y `Health` |
| `tools/` | `verify.sh`: compila contra Unity y pasa las pruebas sin abrir el editor |

See `ARCHITECTURE.md` for the component diagram and `README.md` for scene setup.

## Rules learned
- Unity may call one component's `OnEnable` before another component's `Awake` on the same object: in `OnEnable`, only use references obtained in that component's own `Awake`.
- Put game rules in plain C# classes (`*Model`, `*Timeline`, `*Sequencer`) and keep MonoBehaviours as thin wrappers, so they can be tested without the engine.
- Clear static registries in `[RuntimeInitializeOnLoadMethod(SubsystemRegistration)]` (Enter Play Mode without domain reload).
- Initialise serialized reference fields to `null` so CS0649 does not fire (verify runs with warnings as errors).

## Checks before committing
- `./tools/verify.sh` must end with "Todo en verde". It compiles against Unity with zero warnings and runs the tests that do not need the engine.
- Test Runner → EditMode → Run All must be green.
