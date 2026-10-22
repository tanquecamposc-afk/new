# Test plan

## A. Automated (offline, no Studio) — `tools/check.sh`
1. StyLua format check, Selene lint, Luau compile of every file.
2. `tests/run.luau` (32 tests): XP curves, cost atomicity, profile migrations/validation/newer-schema
   refusal/receipt bounds, weapon builds (mastery gates, evolutions, tempers), fusion pairs, every
   ability has a server implementation, daily picks, quest events/filters, world regions vs spawns,
   telegraph-readable windups (≥0.5 s), recipe items, monetization ids unset, boss phase data.
3. `rojo build` of the project. 4. `API_DUMP=… tools/check.sh` adds the Roblox API name cross-check.

## B. Manual Studio checklist (not yet executed)
### Startup
- [ ] Output shows `[World] built N instances` and `[Main] … server ready`, no red errors.
- [ ] Player spawns at the Nexus plaza; HUD, beam waypoint to the Training Arena.
- [ ] Without API access: red “NOT being saved” banner; play continues.
### Combat
- [ ] LMB chain 1→2→3 (→4 at mastery 3); combo resets after ~1.5 s idle; holding LMB chains.
- [ ] Damage numbers, sparks, slight shake, trail visible; other clients see the swing.
- [ ] V heavy costs 20 stamina; blocked when stamina is low.
- [ ] RMB block reduces Golem hits; tapping just before impact → “PERFECT PARRY”, Golem staggered.
- [ ] Block spam (repeated taps <0.7 s) does not keep perfect parries.
- [ ] Shift dodge through Golem slam → “EVADED”, quest m02 progresses.
- [ ] Q Flare Burst at mastery 1; E locked until Ember mastery 2 (lock icon + reason).
- [ ] Dying ends combat state; respawn works; enemies stop attacking the dead player.
### Exploration & economy
- [ ] Portal briefing → Launch → Camp. Satchel panel shows “SAFE ZONE”.
- [ ] Mine Iron (hold F): loot goes to Satchel; Cobalt refuses without Cobalt Pick.
- [ ] Two players mining the last charge simultaneously: only one gets it.
- [ ] Die in the Frontier: 25% Satchel lost, summary card; XP/mastery unchanged.
- [ ] Camp Beacon banks; second press says “Satchel is empty” (no duplication).
- [ ] Forge upgrade +1 consumes 6 Iron + 120 coins exactly; stats preview matches.
- [ ] Mural → braziers Moon, Sun, Star opens the wall; wrong order resets; tablet grants blueprint once; cache once per player.
- [ ] Ravine: pillars jumpable, lava teleports back with damage, lever lowers drawbridge for 10 min.
### Boss (2+ clients recommended)
- [ ] Seal countdown → barrier closes; late arrivals cannot enter; boss HP scales with players.
- [ ] Each attack telegraph matches its hit area; Rift Lance parry → stagger + weak point label.
- [ ] Phase 2 hazards/projectiles, Phase 3 overload: interrupt by damage OR survive in SAFE zones.
- [ ] Final: tile waves then opening; surviving opening repeats waves; boss dies only in opening.
- [ ] All contributors rewarded once; Warden's Beacon banks rewards; wipe resets the arena cleanly.
- [ ] Player leaving mid-fight: encounter continues / resets if nobody remains.
### Signature systems
- [ ] Awakening at 100 resonance, aura visible to others, G again = signature, burnout afterwards.
- [ ] Research Collapsing Sun (after tablet + Gravity) then chain Gravity→Ember 3× → unlock card; R casts.
- [ ] Co-op: A Graviton Pull, B Ember within 3 s → Singularity Detonation for both.
- [ ] Katana Trial at mastery 4; evolution at mastery 5 changes moveset/trail.
### Social, UI, platforms
- [ ] Party invite/accept/leave/kick; leader leaving promotes; party frames show health.
- [ ] Every menu button performs its action or shows a disabled reason.
- [ ] Store items show “Unavailable” (ids unset) and never prompt.
- [ ] Settings persist after rejoin (with saving on).
- [ ] Device emulator (phone): touch buttons usable, HUD scaled, no overlap blocking the prompt.
- [ ] Gamepad mapping works; typing in chat never triggers combat.
### Persistence (published place, API access on)
- [ ] Rejoin keeps coins/materials/mastery/quests.
- [ ] Join on a second server while still in the first: second waits/receives temporary profile; no overwrite.
- [ ] Stop the server (BindToClose) saves all players.
### Security probes (exploit console / command bar in a test place)
- [ ] Firing `CombatAction` 100×/s is rate-limited; damage unchanged.
- [ ] `Request("Craft")` far from the Forge is rejected; `ClaimQuest` twice grants once.
- [ ] Ability aim point 1000 studs away is clamped to ability range.
