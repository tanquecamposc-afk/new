export type Genre =
  | 'parkour' | 'puzzle' | 'combat' | 'racing' | 'horror'
  | 'stealth' | 'precision' | 'survival' | 'bossrush' | 'chaos' | 'final' | 'secret';

export interface WorldDef {
  id: number;
  name: string;
  genre: Genre;
  subtitle: string;
  setting: string;
  color: string;
  accent: string;
  icon: string;
  first: number;
  last: number;
}

export const WORLDS: WorldDef[] = [
  { id: 1, name: 'PARKOUR', genre: 'parkour', subtitle: 'Run. Jump. Survive the fall.', setting: 'Neon City Facility', color: '#34d4ff', accent: '#0a6c9a', icon: '🏃', first: 1, last: 10 },
  { id: 2, name: 'PUZZLE', genre: 'puzzle', subtitle: 'The temple rewards the patient.', setting: 'Futuristic Temple', color: '#b48cff', accent: '#4b2a8f', icon: '🧩', first: 11, last: 20 },
  { id: 3, name: 'COMBAT', genre: 'combat', subtitle: 'Steel decides everything.', setting: 'Arena of Ash', color: '#ff6a3d', accent: '#8f2a0e', icon: '⚔️', first: 21, last: 30 },
  { id: 4, name: 'RACING', genre: 'racing', subtitle: 'Full throttle through the skyline.', setting: 'Neo Highway', color: '#ffd23d', accent: '#8f6a0e', icon: '🏎️', first: 31, last: 40 },
  { id: 5, name: 'HORROR', genre: 'horror', subtitle: "Don't trust the darkness.", setting: 'Hollow Manor & Black Woods', color: '#c23b3b', accent: '#3a0c0c', icon: '👁️', first: 41, last: 50 },
  { id: 6, name: 'STEALTH', genre: 'stealth', subtitle: 'Unseen. Unheard. Unstoppable.', setting: 'Tech Fortress', color: '#3dffa2', accent: '#0e6b43', icon: '🥷', first: 51, last: 60 },
  { id: 7, name: 'PRECISION', genre: 'precision', subtitle: 'One shot. One chance.', setting: 'Training Center', color: '#ff3d9a', accent: '#7a0e45', icon: '🎯', first: 61, last: 70 },
  { id: 8, name: 'SURVIVAL', genre: 'survival', subtitle: 'The island does not forgive.', setting: 'Volcanic Island', color: '#7bd24a', accent: '#2f5c14', icon: '🌋', first: 71, last: 80 },
  { id: 9, name: 'BOSS RUSH', genre: 'bossrush', subtitle: 'Ten gods. One challenger.', setting: 'Boss Dimensions', color: '#ff9a1f', accent: '#7a3b00', icon: '👹', first: 81, last: 90 },
  { id: 10, name: 'CHAOS', genre: 'chaos', subtitle: 'Everything, all at once.', setting: 'Chaos Dimension', color: '#ff2d55', accent: '#4a0018', icon: '🌀', first: 91, last: 100 },
];

export const worldOf = (level: number): WorldDef => WORLDS[Math.min(9, Math.floor((level - 1) / 10))];
