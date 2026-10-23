# Implementation status

Legend: ✅ implemented (code-complete, statically verified) • 🟡 partial • ❌ not implemented.
**Nothing has been verified inside Roblox Studio yet** — this environment has no Studio. All ✅
items still need the manual checklist in `TEST_PLAN.md`.

## Verification actually performed
| Check | Tool | Result |
|---|---|---|
| Syntax of all 94 Luau files | Luau compiler via `tools/luau-check` (mlua) | pass |
| Lint | Selene 0.31 with offline `roblox_lite` std | 0 errors, 0 warnings |
| Formatting | StyLua | clean |
| Unit tests (36) | `tests/run.luau` | 36/36 pass |
| Project mapping & properties | `rojo build` | builds `.rbxl` |
| Enum / class / property names | `tools/api_check.py` vs Roblox API dump | 0 problems |
| Cross-module wiring (requires, service calls, remotes, request kinds, effects, feedback) | `tools/integrity_check.py` | 0 problems |
| Type checking (`luau-analyze`) | not available offline | **not run** |
| In-engine playtest | Roblox Studio | **not run** |

## Systems
| System | Status | Notes |
|---|---|---|
| Startup / services / remotes | ✅ | deterministic Init/Start, Registry, single Request RemoteFunction |
| Persistence | ✅ | session lock, migrations v0→v2, retries, autosave, BindToClose, temp profile on failure; needs live DataStore test |
| Security layer | ✅ | token-bucket per category, validators, distance checks, bounded logs |
| Nexus hub | ✅ | all stations physical, signage, live boards |
| Graphics | ✅ | Smooth Terrain with grass decoration; craggy cliff walls and mountains from tilted terrain blocks (no straight cliff walls or ball hills); floating islands with tapering rock keels; ravine basalt walls and basalt-column pillars; volumetric clouds, Future lighting, atmosphere/bloom/grade, per-zone moods |
| Creature & prop modelling | ✅ | enemies, Warden, ore nodes, rocks, crystals, trees, pines and torches sculpted from stretched ellipsoids (SpecialMesh Sphere) and wedge ridges/spikes instead of plain blocks and balls; still zero external assets |
| Language | ✅ | all player-facing text in Spanish (UI, prompts, quests, codex, notifications, signs); developer logs stay in English |
| Emberfall biome | ✅ | camp, forest/outpost, chamber, ravine (3 routes), keep, approach, arena |
| Katana combat | ✅ | chain, heavy, block, parry (anti-spam), dodge i-frames, stagger, LoS hit checks, dodge-cancel of strike recovery |
| Combo meter | ✅ | ranks D/C/B/A/S (+2…+18% damage and resonance), 3 s window, broken by taking a real hit; HUD meter |
| Critical hits | ✅ | katana only, 10% +1% per 5 combo (max 25%), x1.6, "¡CRÍTICO!" feedback |
| Elemental affinities | ✅ | each enemy weak (x1.5) / resistant (x0.6) to an essence; feedback + Bestiary line |
| Flujo (perfect evade buff) | ✅ | evading a telegraphed attack: +20% damage for 3 s |
| Lock-on targeting | ✅ | T / R3 / LOCK |
| Animations | ✅/🟡 | full-body procedural keyframe animator (11 R15 joints: 5 slashes, heavy, guard, dodge, cast, awaken, hurt, mine) + anime slash arcs, trails, impact flashes, FOV punches; uploaded animation ids optional (empty) |
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
2. Procedural full-body poses (tuned for R15; R6 only moves the arms) — check angles look right on blocky and Rthro avatars.
6. Terrain fills are generated at server start (~1–2 s); confirm surfaces sit flush with the invisible gameplay floors.
3. Lighting/zone moods may need tuning per monitor.
4. Boss balance (5200 HP base) and enemy damage are first-pass numbers.
5. Telegraph ground raycast near tree canopies / arena seams.
7. New organic models: SpecialMesh-sphere parts and wedge spikes are welded to the root; check enemy hit-flash and death effects on the larger part counts (Warden ≈ 120 parts).
8. Terrain cliffs are now tilted terrain blocks just outside the old invisible cliff walls; confirm no rock pokes into paths (Sunfall doorway is carved with Air, Keep east gate keeps its stone pillars).
9. Combo / crit / affinity / dodge-cancel numbers are first-pass and need feel-tuning.
