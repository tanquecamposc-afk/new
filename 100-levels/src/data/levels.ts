import { Genre, WORLDS, worldOf } from './worlds';

export type ChallengeType = 'nodamage' | 'allcoins' | 'undetected' | 'first' | 'accuracy' | 'secret' | 'kills';

export interface LevelMeta {
  id: string;          // "1".."100" or "S1".."S5"
  num: number;         // 1..100 (secret levels: 101..105)
  name: string;
  world: number;       // 1..10 (0 for secret)
  genre: Genre;
  /** Mechanic tag used by the builder (a world may contain several variants). */
  variant: string;
  parTime: number;     // seconds for the 2nd star
  challenge: ChallengeType;
  challengeText: string;
  boss?: string;
  hasSecret: boolean;
  blurb: string;
}

type Row = [name: string, variant: string, par: number, challenge: ChallengeType, blurb: string, boss?: string];

const CH_TEXT: Record<ChallengeType, string> = {
  nodamage: 'Finish without taking damage',
  allcoins: 'Collect every coin',
  undetected: 'Never be fully detected',
  first: 'Finish in 1st place',
  accuracy: 'Finish with 85%+ accuracy',
  secret: 'Find the hidden relic',
  kills: 'Defeat every enemy',
};

const TABLE: Row[] = [
  // WORLD 1 — PARKOUR
  ['First Steps', 'basics', 45, 'allcoins', 'Learn to run and jump across the rooftops.'],
  ['Moving Parts', 'moving', 60, 'nodamage', 'Platforms that never stand still.'],
  ['Laser Grid', 'lasers', 70, 'nodamage', 'Security lasers sweep the facility.'],
  ['Vanishing Floor', 'vanish', 70, 'allcoins', 'Tiles crumble the moment you land.'],
  ['Velocity', 'speed', 55, 'secret', 'Speed pads launch you across the void.'],
  ['The Tower', 'tower', 90, 'nodamage', 'Climb the tower before the wind takes you.'],
  ['Crusher Row', 'crushers', 80, 'allcoins', 'Industrial pistons slam without mercy.'],
  ['Spin Cycle', 'spinners', 85, 'secret', 'Rotating beams guard every gap.'],
  ['Gauntlet', 'gauntlet', 120, 'nodamage', 'Everything you learned. No mistakes.'],
  ['GUARDIAN', 'boss', 150, 'nodamage', 'The facility\'s giant sentinel awakens.', 'guardian'],
  // WORLD 2 — PUZZLE
  ['Switchback', 'switches', 80, 'allcoins', 'Every switch opens a path.'],
  ['Heavy Thoughts', 'crates', 110, 'secret', 'Push crates onto pressure plates.'],
  ['Glyph Lock', 'code', 120, 'nodamage', 'Find the symbols. Enter the code.'],
  ['Echoes', 'memory', 100, 'nodamage', 'Remember the sequence of light.'],
  ['Unseen Bridge', 'invisible', 90, 'allcoins', 'Pulse (Q) to reveal what cannot be seen.'],
  ['Weightless', 'gravity', 100, 'secret', 'Gravity lifts and low-g chambers.'],
  ['Against the Clock', 'timed', 90, 'nodamage', 'Doors close. Move fast.'],
  ['Prism', 'mirrors', 130, 'allcoins', 'Bend the light beam into the receptor.'],
  ['Grand Enigma', 'mixed', 180, 'secret', 'The temple\'s final examination.'],
  ['THE MASTER', 'boss', 240, 'nodamage', 'An intellect that reshapes the temple.', 'master'],
  // WORLD 3 — COMBAT
  ['First Blood', 'intro', 90, 'nodamage', 'Grab your blade. They are coming.'],
  ['Archers', 'archers', 110, 'kills', 'Close the distance on the bowmen.'],
  ['Brutes', 'brutes', 120, 'nodamage', 'Heavy hitters. Dodge (F) or be crushed.'],
  ['The Bow', 'bow', 120, 'secret', 'Claim the hunter\'s bow in the ruins.'],
  ['Chargers', 'chargers', 120, 'kills', 'They charge. You sidestep.'],
  ['Hordes', 'waves', 160, 'nodamage', 'Survive five waves in the pit.'],
  ['Arcane Staff', 'staff', 150, 'secret', 'A staff of storms waits in the temple ruins.'],
  ['Shamans', 'shamans', 150, 'kills', 'Kill the healers first.'],
  ['Colosseum', 'colosseum', 200, 'nodamage', 'The crowd wants blood.'],
  ['THE WARRIOR', 'boss', 240, 'nodamage', 'The champion of the arena. Three phases.', 'warrior'],
  // WORLD 4 — RACING
  ['Ignition', 'trial', 70, 'first', 'Time trial. Hit every checkpoint.'],
  ['Rivals', 'rivals', 110, 'first', 'Three rivals. Two laps.'],
  ['Debris Field', 'obstacles', 120, 'first', 'Obstacles litter the highway.'],
  ['Airtime', 'ramps', 120, 'first', 'Ramps, jumps and long drops.'],
  ['Midnight Drift', 'drift', 130, 'first', 'Tight corners under the neon.'],
  ['Boost Line', 'boost', 120, 'first', 'Chain the boost pads.'],
  ['Elimination', 'elimination', 160, 'first', 'Last place is eliminated each lap.'],
  ['Rush Hour', 'traffic', 140, 'first', 'Weave through live traffic.'],
  ['Skyline Grand Prix', 'grandprix', 170, 'first', 'Everything at once.'],
  ['ULTIMATE RACE', 'ultimate', 210, 'first', 'Seven rivals. Three laps. One winner.', 'race'],
  // WORLD 5 — HORROR
  ['The Manor', 'manor', 150, 'nodamage', 'Find the key. Leave. Quickly.'],
  ['Whispers', 'fuses', 180, 'secret', 'Restore the power. Something listens.'],
  ['Black Woods', 'forest', 180, 'nodamage', 'Follow the lanterns through the woods.'],
  ['Hide', 'hide', 170, 'nodamage', 'They hunt by sight. Hide in the wardrobes.'],
  ['Cellar', 'cellar', 180, 'secret', 'The basement goes deeper than it should.'],
  ['Pale Figures', 'figures', 190, 'nodamage', 'Don\'t let them see you.'],
  ['The Chapel', 'chapel', 200, 'secret', 'Light the candles. Break the seal.'],
  ['Night Hunt', 'hunt', 200, 'nodamage', 'The woods are full of eyes.'],
  ['Deep Manor', 'deep', 240, 'allcoins', 'The manor rearranges itself.'],
  ['THE WATCHER', 'boss', 240, 'nodamage', 'It cannot die. Run.', 'watcher'],
  // WORLD 6 — STEALTH
  ['Shadows', 'intro', 120, 'undetected', 'Stay out of their vision cones.'],
  ['Eyes Everywhere', 'cameras', 140, 'undetected', 'Security cameras sweep the halls.'],
  ['Distraction', 'distract', 150, 'secret', 'Throw stones (Q) to lure guards away.'],
  ['Alarm', 'alarms', 160, 'undetected', 'Disable the alarm panels.'],
  ['Takedown', 'takedown', 160, 'undetected', 'Sneak behind guards and press E.'],
  ['Keycards', 'keycards', 180, 'secret', 'Three keycards. Three sectors.'],
  ['Tall Grass', 'grass', 170, 'undetected', 'Crouch in the grass to vanish.'],
  ['Data Heist', 'heist', 200, 'secret', 'Steal the drives from the server rooms.'],
  ['Lockdown', 'lockdown', 220, 'undetected', 'Patrols doubled. Cameras everywhere.'],
  ['THE FORTRESS', 'boss', 300, 'undetected', 'The greatest infiltration.', 'fortress'],
  // WORLD 7 — PRECISION
  ['Steady Aim', 'aim', 60, 'accuracy', 'Hit every target.'],
  ['Reflex', 'reaction', 60, 'accuracy', 'Shoot only the green lights.'],
  ['Recall', 'memory', 80, 'accuracy', 'Shoot targets in the order they flashed.'],
  ['Pop-Up', 'speed', 60, 'accuracy', 'Targets vanish fast.'],
  ['Timing', 'timing', 80, 'accuracy', 'Strike as they cross the ring.'],
  ['Archery Range', 'archery', 100, 'accuracy', 'Account for drop and wind.'],
  ['Moving Targets', 'moving', 80, 'accuracy', 'Lead your shots.'],
  ['Dodge Chamber', 'dodge', 60, 'nodamage', 'Survive the turrets.'],
  ['Marksman', 'gauntlet', 120, 'secret', 'The full qualification course.'],
  ['PERFECT SHOT', 'boss', 150, 'accuracy', 'Six stages. Each harder than the last.', 'perfect'],
  // WORLD 8 — SURVIVAL
  ['Castaway', 'gather', 150, 'nodamage', 'Gather wood and stone.'],
  ['First Fire', 'fire', 180, 'nodamage', 'Build a campfire before nightfall.'],
  ['Shelter', 'shelter', 220, 'secret', 'Build walls. The wolves are coming.'],
  ['Relics', 'explore', 220, 'secret', 'Explore the island for ancient relics.'],
  ['VOLCANO', 'volcano', 150, 'nodamage', 'The volcano erupts. Climb above the lava.'],
  ['Long Night', 'nights', 240, 'nodamage', 'Survive until dawn.'],
  ['Signal', 'signal', 260, 'allcoins', 'Craft and light a signal beacon.'],
  ['The Hunt', 'hunt', 220, 'kills', 'Hunt the island\'s beasts.'],
  ['Storm', 'storm', 240, 'nodamage', 'Survive the storm and the dark things in it.'],
  ['THE APOCALYPSE', 'apocalypse', 150, 'nodamage', 'Meteors fall. Reach the shelter.', 'apocalypse'],
  // WORLD 9 — BOSS RUSH
  ['INFERNO — Fire Boss', 'fire', 180, 'nodamage', 'A titan of living magma.', 'fire'],
  ['GLACIUS — Ice Boss', 'ice', 180, 'nodamage', 'The frozen colossus.', 'ice'],
  ['VOLTARA — Lightning Boss', 'lightning', 200, 'nodamage', 'Three orbs of pure current.', 'lightning'],
  ['UMBRA — Shadow Boss', 'shadow', 200, 'nodamage', 'It lives between your shadows.', 'shadow'],
  ['TEMPEST — Storm Boss', 'storm', 200, 'nodamage', 'Winged fury of the storm.', 'storm'],
  ['GAIA — Earth Boss', 'earth', 220, 'nodamage', 'The mountain walks.', 'earth'],
  ['NAGA — Serpent Boss', 'serpent', 220, 'nodamage', 'It swims through stone.', 'serpent'],
  ['ELDER — Ancient Boss', 'ancient', 240, 'nodamage', 'Older than the levels themselves.', 'ancient'],
  ['BAAL — Demon Boss', 'demon', 240, 'nodamage', 'Hell has a champion.', 'demon'],
  ['THE DESTROYER', 'destroyer', 300, 'nodamage', 'The machine that ends worlds.', 'destroyer'],
  // WORLD 10 — CHAOS
  ['Chaos I — Blade Runner', 'parkour_combat', 150, 'nodamage', 'Parkour with enemies on every ledge.'],
  ['Chaos II — Countdown', 'puzzle_time', 150, 'secret', 'Puzzles against a shrinking clock.'],
  ['Chaos III — Wreckage', 'racing_obstacles', 150, 'first', 'Racing through a falling city.'],
  ['Chaos IV — Pursuit', 'horror_chase', 180, 'nodamage', 'Something chases you through the dark.'],
  ['Chaos V — Infiltrator', 'stealth_combat', 200, 'undetected', 'Sneak or fight. Your choice.'],
  ['Chaos VI — Last Island', 'survival', 200, 'secret', 'Survive the chaos storm.'],
  ['Chaos VII — Sky Duel', 'boss_parkour', 220, 'nodamage', 'A boss fight on floating platforms.', 'skyduel'],
  ['Chaos VIII — Legion', 'legion', 240, 'kills', 'Every enemy you have ever fought.'],
  ['FINAL TRIAL', 'final_trial', 360, 'nodamage', 'The final test of everything.'],
  ['👑 THE 100TH', 'final', 420, 'nodamage', 'The end of all levels.', 'the100th'],
];

const SECRET_ROWS: Row[] = [
  ['SECRET 01 — CLASSIC MODE', 'classic', 60, 'allcoins', 'Retro pixels. Old-school jumps.'],
  ['SECRET 02 — IMPOSSIBLE PARKOUR', 'impossible', 150, 'nodamage', 'Only the best will finish.'],
  ['SECRET 03 — INFINITE BOSS', 'infinite', 300, 'nodamage', 'Bosses forever. How long can you last?'],
  ['SECRET 04 — SPEEDRUN', 'speedrun', 40, 'allcoins', 'A course built for the clock.'],
  ['SECRET 05 — TINY MODE', 'tiny', 120, 'allcoins', 'You are tiny. The world is not.'],
];

export const SECRET_UNLOCKS = [3, 6, 10, 14, 18]; // secrets needed per secret level

export const LEVELS: LevelMeta[] = TABLE.map((r, i) => {
  const num = i + 1;
  const w = worldOf(num);
  const genre: Genre = num === 100 ? 'final' : w.genre;
  return {
    id: String(num),
    num,
    name: r[0],
    world: w.id,
    genre,
    variant: r[1],
    parTime: r[2],
    challenge: r[3],
    challengeText: CH_TEXT[r[3]],
    boss: r[5],
    hasSecret: r[3] === 'secret',
    blurb: r[4],
  };
});

export const SECRET_LEVELS: LevelMeta[] = SECRET_ROWS.map((r, i) => ({
  id: 'S' + (i + 1),
  num: 101 + i,
  name: r[0],
  world: 0,
  genre: 'secret' as Genre,
  variant: r[1],
  parTime: r[2],
  challenge: r[3],
  challengeText: CH_TEXT[r[3]],
  hasSecret: false,
  blurb: r[4],
}));

/** All secret relic ids in the game (one per level whose challenge is "secret"). */
export const SECRET_IDS: string[] = LEVELS.filter((l) => l.hasSecret).map((l) => 'relic-' + l.id);
export const TOTAL_SECRETS = SECRET_IDS.length;

export function getLevel(id: string): LevelMeta | undefined {
  if (id.startsWith('S')) return SECRET_LEVELS.find((l) => l.id === id);
  return LEVELS[Number(id) - 1];
}

export function nextLevelId(id: string): string | null {
  if (id.startsWith('S')) return null;
  const n = Number(id);
  return n < 100 ? String(n + 1) : null;
}

export { WORLDS };
