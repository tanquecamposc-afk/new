# RIFTBOUND: SOULFORGE

*Forge your fighting style. Fuse impossible powers. Break the Rift together.*

A Roblox multiplayer action RPG vertical slice written in Luau and synced with Rojo. Everything
is procedural (Parts, built-in materials, particles, beams, lighting): **no external models,
asset ids, paid assets or third-party libraries are required.**

> Status: code-complete vertical slice, verified with offline tooling only. **It has not been
> play-tested inside Roblox Studio yet** — see `IMPLEMENTATION_STATUS.md` and `TEST_PLAN.md`.

## 1. Project structure

```
RiftboundSoulforge/
├── default.project.json        Rojo mapping (+ Workspace/Players/StarterPlayer/Lighting props)
├── selene.toml, roblox_lite.yml, stylua.toml
├── src/
│   ├── ReplicatedStorage/Shared/        → ReplicatedStorage.Shared
│   │   ├── Config/        all balancing + content data (weapons, essences, fusions, enemies,
│   │   │                  boss, quests, recipes, world layout, events, monetization, audio)
│   │   ├── Combat/CombatMath.luau      weapon build maths (shared server/client)
│   │   ├── Progression/Leveling.luau   XP curves
│   │   ├── Inventory/Costs.luau        cost checks
│   │   ├── Util/ (Signal, Maid, Format)
│   │   └── Net.luau                    remote names (server creates them)
│   ├── ServerScriptService/             → ServerScriptService.Server
│   │   ├── Main.server.luau            deterministic Init/Start of all services
│   │   ├── Registry.luau               service locator (no circular requires)
│   │   ├── Data/ProfileSchema.luau     versioned schema, migrations, validation
│   │   ├── Services/  (23 services: data, security, requests, combat, enemies, boss, …)
│   │   ├── Combat/    Abilities, Telegraph, Hitbox
│   │   └── World/     Build primitives, Models, Lighting, Nexus, Emberfall
│   └── StarterPlayer/StarterPlayerScripts/  → StarterPlayerScripts.Client
│       ├── Main.client.luau, ClientState.luau
│       ├── Controllers/ (Input, Combat, Camera, Effects, Animation, HUD, UI, Notification,
│       │                 Zone, Waypoint, Sound)
│       └── UI/ (Theme, Kit components, QuestLogic, ViewUtil, Views/ – 15 views)
├── tests/run.luau                unit tests for pure modules
└── tools/
    ├── check.sh                  runs every offline check
    ├── luau-check/               Rust tool: Luau compiler syntax check + test runner (mlua)
    └── api_check.py              cross-checks Enum/class/property names against the API dump
```

Differences from the suggested layout (deliberate): world geometry is generated at runtime by
`WorldService` instead of living in `ServerStorage` templates (so no binary place file is needed);
UI is built in code by views instead of `StarterGui` instances; `Registry` + `RequestService` were
added to keep services decoupled and remote handling uniform.

## 2. Tools

| Tool | Needed for | Install |
|---|---|---|
| Roblox Studio | running the game | roblox.com/create |
| Rojo 7.x (CLI + Studio plugin) | syncing files into Studio | `cargo install rojo` or `aftman`/`rokit`; plugin: `rojo plugin install` |
| StyLua | formatting | `cargo install stylua` |
| Selene | linting | `cargo install selene` |
| Rust toolchain | `tools/luau-check` | rustup.rs |

## 3. Sync with Roblox Studio

1. `rojo serve` in this folder.
2. Open a **new Baseplate** place in Studio, open the Rojo plugin, click **Connect**.
   (Alternatively `rojo build default.project.json -o RiftboundSoulforge.rbxl` and open the file.)
3. Press **Play**. The server builds the world (~a second), loads your profile and spawns you in the Nexus.

The project sets `Workspace.StreamingEnabled = false`, `Players.CharacterAutoLoads = false` (the
server spawns characters after the profile loads) and `StarterPlayer.EnableMouseLockOption = false`
(Shift is the dodge key). Keep those if you edit the place by hand.

## 4. Plugins / permissions

* Rojo Studio plugin.
* For saving in Studio: *Game Settings → Security → Enable Studio Access to API Services* (place must be published).
* For purchases: *Game Settings → Security* allow third-party sales only if you use them (not needed).

## 5. Multiplayer test

Studio → *Test* tab → *Clients and Servers* → choose 2–4 players → **Start**. Use one client to invite
another from *Menu (M) → Party*. Co-op check: player A casts **Graviton Pull** (Gravity Q), player B
hits the same enemies with an **Ember** ability within 3 s → *Singularity Detonation*.

## 6. DataStores (safe testing)

* Without API access the server warns and gives a **temporary, non-saving profile** (red banner).
  It never writes blank data over a real save.
* With API access, data goes to DataStore `RiftboundProfiles_v1`, key `Player_<UserId>`. Change
  `GameConfig.Data.DataStoreName` to a test name (e.g. `RiftboundProfiles_dev`) before testing so
  production data stays clean.
* Session locking: a profile held by another server is retried with backoff and never stolen
  while the lock is fresh (< 30 min).

## 7. Optional assets

* **Sounds**: `Shared/Config/AudioConfig.luau` → `Sounds.*.id = "rbxassetid://…"`. Empty ids are silent.
* **Animations**: same file, `Animations.Light1..5/Heavy/Block/Cast/...`. Empty ids use the
  procedural arm-pose fallback (`AnimationController`).
* **Models**: replace generators in `ServerScriptService/World/Models.luau` (enemy rigs, Warden,
  katana, ore nodes) — gameplay only needs `HumanoidRootPart`, `Humanoid`, the `HealthBar`
  billboard and named parts `WeakPoint` (Warden) / `Blade` + `SwingTrail` (katana).

## 8. Publishing a development build

1. Build/sync, then *File → Publish to Roblox As…* a **private** experience.
2. Enable Studio API access (above) and test saving with two sessions.
3. Monetization (optional): create passes/products on the Creator Dashboard, paste the numeric ids
   in `Shared/Config/MonetizationConfig.luau`. Unset ids (0) show “Unavailable” and never prompt.

## 9. Controls

| | Keyboard/Mouse | Gamepad | Touch |
|---|---|---|---|
| Light combo | LMB (hold to chain) | R2 | ATTACK |
| Heavy | V | R1 | HEAVY |
| Block / perfect parry | RMB (tap just before impact) | L2 | BLOCK (hold) |
| Dodge | Shift | B | DODGE |
| Essence abilities | Q / E | X / Y | Q / E |
| Fusion | R | L1 | R |
| Awaken / signature | G | D-Pad Up | AWAKEN |
| Ember Tonic | H | D-Pad Down | TONIC |
| Lock-on | T | R3 | LOCK |
| Menu | M | Select | MENU button |
| Interact | F (prompts) | X | tap prompt |

(Tab is left to Roblox's player list; the menu uses **M**.)

## 10. Feature status (summary)

Implemented: Nexus hub, Emberfall biome, katana moveset + evolution branches, Ember/Storm/Gravity
(2 abilities each), 2 fusions, awakening per essence, co-op resonance (2 combos + boss Breach),
3 enemy archetypes + 2 champions + training targets, Fracture Warden (4 phases), mining, crafting,
forge, hidden chamber puzzle, ravine shortcut, extraction/satchel risk, quests/dailies, parties,
3 world events, mastery trial, persistence, monetization scaffolding, HUD + 15 UI views, touch/gamepad.

Partial / missing: no in-engine playtest yet; animation & audio ids are empty (fallbacks only);
PvP, guilds, prestige, cross-server parties and the other 5 regions are **not** implemented.
Full details: `IMPLEMENTATION_STATUS.md`.

## 11. Checks

```
tools/check.sh                       # format, lint, Luau compile, unit tests, rojo build
API_DUMP=path/to/API-Dump.json tools/check.sh   # + Roblox API name cross-check
```
