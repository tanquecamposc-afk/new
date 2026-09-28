export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  xp: number;
  coins: number;
  hidden?: boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_step', name: 'FIRST STEP', desc: 'Complete level 1.', icon: '👣', xp: 50, coins: 50 },
  { id: 'untouchable', name: 'UNTOUCHABLE', desc: 'Complete a level without taking damage.', icon: '🛡️', xp: 100, coins: 100 },
  { id: 'parkour_master', name: 'FREE RUNNER', desc: 'Complete World 1.', icon: '🏃', xp: 200, coins: 200 },
  { id: 'big_brain', name: 'BIG BRAIN', desc: 'Complete World 2.', icon: '🧠', xp: 200, coins: 200 },
  { id: 'gladiator', name: 'GLADIATOR', desc: 'Complete World 3.', icon: '⚔️', xp: 200, coins: 200 },
  { id: 'speed_demon', name: 'SPEED DEMON', desc: 'Win a race under the par time.', icon: '🏎️', xp: 150, coins: 150 },
  { id: 'pole_position', name: 'POLE POSITION', desc: 'Complete World 4.', icon: '🏁', xp: 200, coins: 200 },
  { id: 'nightmare_survivor', name: 'NIGHTMARE SURVIVOR', desc: 'Complete World 5.', icon: '👁️', xp: 250, coins: 250 },
  { id: 'ghost', name: 'GHOST', desc: 'Finish a stealth level undetected.', icon: '🥷', xp: 150, coins: 150 },
  { id: 'infiltrator', name: 'INFILTRATOR', desc: 'Complete World 6.', icon: '🏯', xp: 250, coins: 250 },
  { id: 'sharpshooter', name: 'SHARPSHOOTER', desc: 'Finish a precision level with 100% accuracy.', icon: '🎯', xp: 150, coins: 150 },
  { id: 'survivor', name: 'SURVIVOR', desc: 'Complete World 8.', icon: '🌋', xp: 250, coins: 250 },
  { id: 'boss_slayer', name: 'BOSS SLAYER', desc: 'Defeat 10 bosses.', icon: '👹', xp: 400, coins: 400 },
  { id: 'first_boss', name: 'GIANT KILLER', desc: 'Defeat your first boss.', icon: '🤖', xp: 100, coins: 100 },
  { id: 'centurion', name: 'CENTURION', desc: 'Defeat 100 enemies.', icon: '💀', xp: 200, coins: 200 },
  { id: 'collector', name: 'COLLECTOR', desc: 'Own 10 items.', icon: '🎒', xp: 150, coins: 150 },
  { id: 'rich', name: 'HIGH ROLLER', desc: 'Hold 5,000 coins at once.', icon: '💰', xp: 150, coins: 0 },
  { id: 'lucky', name: 'LUCKY', desc: 'Open a Legendary or Mythic chest.', icon: '🍀', xp: 150, coins: 150 },
  { id: 'treasure_hunter', name: 'TREASURE HUNTER', desc: 'Find 5 secret relics.', icon: '🗝️', xp: 200, coins: 200 },
  { id: 'archaeologist', name: 'ARCHAEOLOGIST', desc: 'Find every secret relic.', icon: '🏺', xp: 500, coins: 1000 },
  { id: 'star_hoarder', name: 'STAR HOARDER', desc: 'Earn 100 stars.', icon: '⭐', xp: 300, coins: 300 },
  { id: 'perfectionist', name: 'PERFECTIONIST', desc: 'Earn 3 stars in 25 levels.', icon: '🌟', xp: 300, coins: 300 },
  { id: 'almost_there', name: 'ALMOST THERE', desc: 'Reach level 99.', icon: '🔥', xp: 300, coins: 300 },
  { id: 'the_100', name: 'THE 100', desc: 'Complete level 100.', icon: '👑', xp: 1000, coins: 2000 },
  { id: 'hard_mode', name: 'HARDENED', desc: 'Complete a level on Insane or Nightmare.', icon: '💢', xp: 200, coins: 200 },
  { id: 'mutant', name: 'MUTANT', desc: 'Complete a level with a mutation active.', icon: '🧬', xp: 200, coins: 200 },
  { id: 'speedrunner', name: 'SPEEDRUNNER', desc: 'Finish a speedrun.', icon: '⏱️', xp: 300, coins: 300 },
  { id: 'secret_finder', name: '???', desc: 'Complete a secret level.', icon: '❓', xp: 300, coins: 300, hidden: true },
  { id: 'die_hard', name: 'DIE HARD', desc: 'Die 25 times. Keep going.', icon: '⚰️', xp: 100, coins: 100 },
];
