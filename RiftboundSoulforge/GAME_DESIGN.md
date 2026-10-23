# RIFTBOUND: SOULFORGE — Game Design (as implemented)

**One sentence:** a multiplayer world where weapons evolve according to their mastery, supernatural
powers fuse into hybrid techniques, and expeditions reveal new resources, secrets and combinations.

## Core loop
1. Spawn in **the Nexus** → read the event board, contracts (Quest Board), check build (Menu → Loadout).
2. **Rift Portal** briefing states the death rules → launch alone or with a party.
3. **Emberfall Frontier**: mine ore, hunt, read the mural, find the hidden chamber, cross the ravine.
4. Fight with combos, heavy guard-breaks, parries, dodges, essences, fusions and awakenings.
5. Push deeper (Keep: x1.3 drops, Arena: x1.6) or **extract** at a beacon to bank the Satchel.
6. Back at the Nexus: Forge upgrades/tempers, Artisan crafting, Fusion research, Katana Trial.
7. Challenge the **Fracture Warden** with friends; return for world events and dailies.

No timers gate play, no Robux needed, no paid randomness.

## Signature systems
### A. Living Weapons (katana)
* Moveset: 3-hit chain (Rising Cut, Return Cut, Crescent Sweep) → 4th finisher at mastery 3 (Rift
  Severance) → heavy Drawn Cut (stamina, guard break), block, timed perfect parry, dodge with i-frames.
* Mastery 1–10 from real hits (training dummies give a trickle). Unlock list shown in Menu → Mastery.
* Evolution at mastery 5 **and** after the Katana Trial: **Tempest Edge** (+15% speed, 5th strike
  Gale Flurry, heavy becomes a lunging Gale Thrust, -40% dodge cooldown, cyan trail) or **Aegis Edge**
  (+0.08 s parry window, Aegis Riposte counter, heavy becomes Bulwark Slam area + 30% shield, gold trail).
  Switching branch costs coins at the Forge; mastery is never lost.
* New weapons = `WeaponConfig` entry (moveset data); combat pipeline is data-driven.

### B. Power Fusion
* Ember (Flare Burst cone + burn; Ember Nova knockback), Storm (Arc Bolt chain + Charged; Thunderstep
  blink with i-frames), Gravity (Graviton Pull + Gathered; Crushing Field slow/crush zone).
  Second ability at essence mastery 2; mastery 3 passives (Wildfire spread, Static Charge +10%,
  Event Pressure +15%); mastery 4 longer awakening; mastery 5 +15% damage.
* Fusions: **Collapsing Sun** (Ember+Gravity: pull well → solar blast + burn) and **Magnetic Rift**
  (Storm+Gravity: held rift that pulls and chains lightning). Plasma Lance is defined but sealed.
* Unlock = research (essences, masteries, discovery, shards at the Fusion Chamber) + **attunement**:
  chain essence A into essence B on the same enemy within 3 s, three times. Hitting a combo before
  researching it triggers a hint — experimentation is rewarded.

### C. Resonance Awakening
* Resonance (0–100) from hits, finishers, perfect parries (+15), dodging telegraphs (+8),
  interrupts (+10), co-op (+15). Full → **G**.
* Forms: Infernal Ascension (+25% dmg, burning hits), Tempest Sovereign (+30% speed, half dodge
  cooldown, sparking hits), Singularity Throne (-25% damage taken, gathering hits). 15 s (+3 at mastery 4).
  **G again** = one signature (Solar Cataclysm / Thousand Bolts / Event Horizon).
* Counterplay: 10 s burnout afterwards (no resonance gain); the Warden's Suppression Pulse ends it.
* Visible to everyone: highlight, aura particles, light.

### D. Cooperative Resonance (server-validated)
* **Singularity Detonation**: A gathers (Gravity), B hits with Ember within 3 s → explosion.
* **Conductive Collapse**: A charges (Storm), B hits with Gravity within 3 s → chain burst.
* **Warden Breach**: A perfect-parries the Warden, B strikes the exposed back within 2.5 s → 5% max HP + stagger.
* Different players only, both within 60 studs, per-pair cooldown, once per cast; both are rewarded.

### E. Combat depth (combo, crits, elements, flow)
* **Combo meter**: every hit (katana or ability) extends a 3 s chain. Ranks D (5) • C (12) • B (25) •
  A (40) • S (60) add +2/+5/+8/+12/+18% damage and the same bonus to resonance gain. Taking a hit
  that is not blocked, parried or evaded breaks the combo.
* **Critical hits**: katana strikes crit at 10% (+1% per 5 combo, capped at 25%) for x1.6.
* **Elemental affinities**: each enemy is weak to one essence (x1.5) and resists another (x0.6;
  a fusion is only resisted if both essences are). Shown in the Bestiary.
  Stalker: weak Gravity / resists Storm • Rune Guardian: Storm / Ember • Ember Beast: Gravity / Ember •
  Ashen Sentinel: Storm / Gravity • Eclipse Stalker: Ember / Gravity • Blade Wraith: Ember / Storm.
* **Dodge-cancel**: once a strike has landed, dodging skips its recovery.
* **Flujo**: evading a telegraphed attack grants +20% damage for 3 s.

## World
* **The Nexus** (floating island): Soulforge Spire landmark, Forge, Artisan Bench, Fusion Chamber,
  Training Arena (dummies, Sparring Golem, Trial pedestal), Rift Portal, Quest Board, Warden Gate,
  Gathering Garden, Hall of Echoes (live server leaderboard), Style Kiosk, event announcement board,
  signposts, glowing paths.
* **Emberfall Frontier**: safe camp (beacon, return portal) → autumn forest + ruined outpost (depth 1)
  → hidden **Sunfall Chamber** (mural clue ☾→☀→✦, kindle three braziers in order, wall slides open,
  tablet = Collapsing Sun knowledge + Resonant Temper blueprint, one-time cache) → **Cinder Ravine**
  (pillar jumps over lava, longer south ledge, lever drawbridge shortcut) → **Ruined Keep** interior
  (depth 2, Rune Guardians, Cobalt, Ashen Sentinel mini-boss, Keep Beacon) → **Warden's Approach** →
  **Fracture Arena** (depth 3).
* Zone moods: atmosphere/grade/clock tween per region.

## Enemies
* **Rift Stalker**: fast, line lunge, retreats after striking.
* **Rune Guardian**: blocks light strikes from the front (80%), heavy breaks guard; after Rune Slam it is OPEN.
* **Ember Beast**: Fire Ring (safe centre) and long Molten Charge.
* Champions: **Ashen Sentinel** (keep, unlocks Gravity via contract), **Eclipse Stalker** (event).
* Every attack is telegraphed with exactly its hit shape, a fill animation and a glyph.

## The Fracture Warden
* Seal → 10 s countdown → arena barrier locks with everyone inside; health scales +75% per extra player.
* P1 Guarded Assault: Cleave, Sundering Sweep, Fracture Slam (exposes back crystal), Rift Lance
  (parryable → 2.5 s stagger + exposed; teaches its weakness → Codex).
* P2 Rift Fractures: hazard zones, Shard Volley (lobbed, telegraphed landings), Rift Step teleports.
* P3 Resonance Overload: 5.5 s channel — interrupt with 6% max HP damage or stand in a SAFE zone;
  Suppression Pulse ring ends awakenings; faster movement.
* Final — The Last Fracture: arena tiles collapse in 3 readable waves (2.2 s warning), then a 10 s
  **opening** (x3 damage, weak point exposed). If it survives, the cycle repeats — never a hard DPS check.
  Health is floored at 15% until the final phase so it cannot be skipped.
* Rewards to every participant who contributed (2% damage, any mechanic, or 60 s present + damage),
  once per encounter id; into the Satchel → extract at the Warden's Beacon. First clear bonus;
  25% Fracture Core chance with a deterministic craft alternative (4 Warden Sigils).

## Economy & progression
* Materials: Iron, Cobalt (needs Cobalt Pick), Emberstone, Essence Shards, Warden Sigils, Fracture
  Core (component), Ember Tonic (consumable). Each has listed uses.
* Forge: katana +1..+4 upgrades, 5 tempers (Swift, Heavy, Guard, Resonant[blueprint], Fracture[core]).
  Previews current vs resulting stats. Nothing can break or be destroyed.
* Player level (max 40): HP +5/level, secondary slot at 3, dailies at 2, second loadout at 4.
* Quests: 10-step main path (= tutorial), exploration, gathering, mastery, co-op and a daily boss
  contract + 3 rotating daily challenges. Rewards claimed once.
* Achievements and earned cosmetics (trail colours).

## Expedition risk
Depth 1/2/3 death loses 25/50/75% of the unbanked Satchel. XP, mastery, unlocks, achievements and
purchases are never at risk. Disconnect = fall at current depth, remainder banked.

## Monetization (scaffold only, ids unset)
Loadout Archive pass (+3 loadout slots), Resonant Aura Pack (cosmetic), Supporter Dye product
(cosmetic trail). No power, no loot boxes.

## Planned (not implemented)
Frost/Umbra/Verdant essences, Plasma Lance, Greatsword/Dual Blades/Staff/Gauntlets/Spear/Scythe,
Frostgrave/Verdant Reach/Obsidian Crown/Hollow Sky/Last Rift, Dimensional Storm & World Boss events,
opt-in PvP arena (flag exists: `GameConfig.Combat.PvPEnabled = false`), guilds, prestige, seasons.
