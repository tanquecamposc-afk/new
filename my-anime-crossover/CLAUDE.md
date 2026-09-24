# Anime Crossover Engine - Rules & Architecture

## Tech Stack
- Engine: Unity 2022.3 LTS / 60 FPS Target
- Language: C# (.NET Standard)
- Input System: Unity New Input System

## Combat Architecture Guidelines
1. **Hitboxes**: DO NOT use Unity Physics Trigger Colliders (`OnTriggerEnter`) for melee attacks. Use **BoxCastAll / OverlapBox** frame-by-frame via `HitboxManager` to prevent high-speed tunneling.
2. **State Machine**: All character actions (Idle, Attack, HitStun, Dash) MUST pass through a State Pattern to prevent animation breaking or unintended inputs.
3. **Performance**: Avoid `GetComponent` or `Object.Instantiate` inside combat loops. Pre-allocate or use Object Pooling for hit VFX and projectile meshes.
4. **Frame Data**: Attacks are driven by Frame Counters (Startup, Active, Recovery).

## Code Style
- PascalCase for public properties/methods.
- camelCase with underscore prefix (`_variable`) for private fields.
- Use explicit types instead of `var` for combat logic readability.

## Project Map
- `Assets/Scripts/Core/HitboxData.cs` — attack data (damage, hitstun, knockback, box, frame data).
- `Assets/Scripts/Combat/HitboxManager.cs` — `OverlapBoxNonAlloc` hit detection and the `IDamageable` interface.
- `Assets/Scripts/Combat/CombatEngine.cs` — light combo chain, run frame by frame (Startup → Active → Recovery).
- `Assets/Scripts/Controllers/CharacterMovement.cs` — movement and the character state machine (Idle, Move, Attack, HitStun, Dash).
- `Assets/Scripts/Controllers/CharacterDash.cs` — dash with i-frames (Shift).
