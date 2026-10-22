# Implementation status

Legend: ✅ implemented (code-complete, statically verified) • 🟡 partial • ❌ not implemented.
**Nothing has been verified inside Roblox Studio yet** — this environment has no Studio. All ✅
items still need the manual checklist in `TEST_PLAN.md`.

## Verification actually performed
| Check | Tool | Result |
|---|---|---|
| Syntax of all 93 Luau files | Luau compiler via `tools/luau-check` (mlua) | pass |
| Lint | Selene 0.31 with offline `roblox_lite` std | 0 errors, 0 warnings |
| Formatting | StyLua | clean |
| Unit tests (32) | `tests/run.luau` | 32/32 pass |
| Project mapping & properties | `rojo build` | builds `.rbxl` |
| Enum / class / property names | `tools/api_check.py` vs Roblox API dump | 0 problems |
| Type checking (`luau-analyze`) | not available offline | **not run** |
| In-engine playtest | Roblox Studio | **not run** |

## Systems
| System | Status | Notes |
|---|---|---|
| Startup / services / remotes | ✅ | deterministic Init/Start, Registry, single Request RemoteFunction |
| Persistence | ✅ | session lock, migrations v0→v2, retries, autosave, BindToClose, temp profile on failure; needs live DataStore test |
| Security layer | ✅ | token-bucket per category, validators, distance checks, bounded logs |
| Nexus hub | ✅ | all stations physical, signage, live boards |
| Emberfall biome | ✅ | camp, forest/outpost, chamber, ravine (3 routes), keep, approach, arena |
| Katana combat | ✅ | chain, heavy, block, parry (anti-spam), dodge i-frames, stagger, LoS hit checks |
| Lock-on targeting | ✅ | T / R3 / LOCK |
| Animations | 🟡 | procedural arm poses + trails; real animation ids are empty hooks |
| Ember / Storm / Gravity | ✅ | 2 abilities each + passives |
| Fusions | ✅ | Collapsing Sun, Magnetic Rift; research + attunement; Plasma Lance sealed |
| Awakening | ✅ | 3 forms + signatures, burnout, suppression |
| Co-op resonance | ✅ | 2 combos + Warden Breach |
| Enemy AI | ✅ | Stalker / Guardian / Beast behaviours, champions, training targets, leash, sleep when no players near |
| Fracture Warden | ✅ | 4 phases, hazards, projectiles, overload interrupt, tile finale, rewards, reset |
| Mining | ✅ | hold prompts, tool tiers, shared charges, respawn |
| Forge / crafting | ✅ | upgrades, tempers, tools, consumables, evolution respec |
| Hidden discovery | ✅ | brazier puzzle + tablet + cache; ravine lever shortcut |
| Expedition risk / extraction | ✅ | satchel, depth multipliers, death/disconnect rule, 3 beacons |
| Quests & dailies | ✅ | 16 quests + 8-quest daily pool |
| Mastery trial | ✅ | Katana Trial (Blade Wraith) |
| Parties | ✅ | server-local only (no cross-server) |
| World events | ✅ | Rift Surge, Crystal Bloom, Eclipse Hunt; 2 more defined as not implemented |
| Codex / achievements | ✅ | fusions, co-op, bestiary, discoveries, weapons, regions, achievements |
| HUD + 15 views | ✅ | Inventory, Loadout, Mastery, Quests, Codex, Party, Stats, Settings, Store, Help, Forge, Fusion, Expedition, Boss Gate, Trial |
| Touch / gamepad | ✅ | on-screen buttons; gamepad map; untested on devices |
| Accessibility | ✅ | shake, effects, volumes, HUD scale, reduced clutter, high-contrast telegraphs |
| Audio | 🟡 | central config + hooks; no asset ids shipped (silent) |
| Monetization | 🟡 | ProcessReceipt + pass checks done; ids intentionally unset |
| PvP | ❌ | flag only |
| Guilds, prestige, seasons | ❌ | |
| Other regions / essences / weapons | ❌ | data placeholders only, never equippable |

## Known risks to check first in Studio
1. Procedural enemy rigs (Humanoid R15 + HipHeight, no limbs): confirm they stand at the right height and path with `MoveTo`.
2. Procedural arm poses on Motor6D C0 for R15 and R6 avatars.
3. Lighting/zone moods may need tuning per monitor.
4. Boss balance (5200 HP base) and enemy damage are first-pass numbers.
5. Telegraph ground raycast near tree canopies / arena seams.
