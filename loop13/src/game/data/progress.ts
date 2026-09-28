import type { EndingId } from '../core/types';

export interface SecretDef { id: string; title: string; hint: string; ngPlus?: boolean; }
export const SECRETS: SecretDef[] = [
  { id: 'BODY_ON_CAMERA', title: 'Someone in my bed', hint: 'A camera shows the Dormitory differently.' },
  { id: 'POD', title: 'Containment', hint: 'Look inside the pod in the Restricted Sector.' },
  { id: 'SAMPLE', title: 'Seeing tomorrow', hint: 'The Lab fridge holds something that refracts late.' },
  { id: 'WRONG_CLOCK', title: 'Wrong time', hint: 'Not every clock agrees.' },
  { id: 'LOCKER_13', title: 'Locker 13', hint: 'A key that is warm to the touch.' },
  { id: 'CAM08', title: 'The eighth camera', hint: 'A-13 hides one feed.' },
  { id: 'RADIO', title: 'Backwards', hint: 'A radio in the tunnels plays something in reverse.' },
  { id: 'PHONE_WHISPER', title: 'Turn around', hint: 'Answer the phone after many loops.' },
  { id: 'KANE_VANISH', title: 'Clock hand', hint: 'Watch Kane at the very end of his route.' },
  { id: 'MUG_NOTE', title: 'Left for you', hint: 'The mug is not always alone on the table.' },
  { id: 'HIGH_PLACE', title: 'Up high', hint: 'Something rests on top of the Hub storage unit.' },
  { id: 'OBSERVER_GIFT', title: 'A gift from after', hint: 'New Game+ only.', ngPlus: true },
];

export interface AchievementDef { id: string; title: string; desc: string; }
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'FIRST_LOOP', title: 'FIRST LOOP', desc: 'Complete your first loop.' },
  { id: 'DEJA_VU', title: 'DEJA VU', desc: 'Notice a change between two loops.' },
  { id: 'WATCHER', title: 'WATCHER', desc: 'Find The Observer.' },
  { id: 'THIRTEEN_MINUTES', title: '13 MINUTES', desc: 'Synchronize all three relays before the reset.' },
  { id: 'NO_ESCAPE', title: 'NO ESCAPE', desc: 'Discover that the main exit does not work.' },
  { id: 'TRUE_MEMORY', title: 'TRUE MEMORY', desc: 'Find every clue.' },
  { id: 'LOOP_BREAKER', title: 'LOOP BREAKER', desc: 'Reach the True Ending.' },
  { id: 'CODEBREAKER', title: 'CODEBREAKER', desc: 'Open the Security door.' },
  { id: 'EYES_EVERYWHERE', title: 'EYES EVERYWHERE', desc: 'View every public camera feed.' },
  { id: 'POWER_TRIP', title: 'POWER TRIP', desc: 'Restore backup power.' },
  { id: 'SHADOW', title: 'SHADOW', desc: 'Follow Kane through his whole route in one loop.' },
  { id: 'NOT_THE_END', title: 'NOT THE END', desc: 'Die for the first time.' },
  { id: 'SURVIVOR', title: 'SURVIVOR', desc: 'Survive a chase.' },
  { id: 'THE_EXIT', title: 'THE EXIT', desc: 'Reach the Escape ending.' },
  { id: 'SEVERED', title: 'SEVERED', desc: 'Reach the Sacrifice ending.' },
  { id: 'MIRROR', title: 'MIRROR', desc: 'Reach the Observer ending.' },
  { id: 'ARCHIVIST', title: 'ARCHIVIST', desc: 'Read every document.' },
  { id: 'SECRETKEEPER', title: 'SECRET KEEPER', desc: 'Find every secret.' },
  { id: 'PERSISTENT', title: 'PERSISTENT', desc: 'Complete 13 loops.' },
];

export interface EndingDef { id: EndingId; n: number; title: string; subtitle: string; lines: string[]; }
export const ENDINGS: EndingDef[] = [
  {
    id: 'ESCAPE', n: 1, title: 'ESCAPE', subtitle: 'Something remains unresolved.',
    lines: [
      'The elevator climbs for a long time.',
      'The doors open onto grey daylight, and cold air, and silence.',
      'You walk away from ORPHEUS without looking back.',
      'Behind you, somewhere under the ground, a clock reads 12:47.',
      'And someone who looks exactly like you says: "Good morning."',
    ],
  },
  {
    id: 'SACRIFICE', n: 2, title: 'SACRIFICE', subtitle: 'The loop ends. You do not.',
    lines: [
      'The Core screams, and then it stops.',
      'The field collapses inward, and the fold seals itself around the only thing still inside it.',
      'Outside, time moves again. Nobody will ever know why.',
      'Inside, it is 12:47. It will always be 12:47.',
      'At least now you remember why you stay.',
    ],
  },
  {
    id: 'OBSERVER', n: 3, title: 'OBSERVER', subtitle: 'You were always watching yourself.',
    lines: [
      'You take its hand. It is your hand.',
      'Four thousand loops of memory pour back in at once, and for a moment you understand everything.',
      'Then you are in the corridor, at the far end, in the dark.',
      'A version of you wakes up in Medical. Confused. Afraid.',
      'You watch. You wait. You begin drawing symbols on the Archive wall.',
    ],
  },
  {
    id: 'TRUE', n: 4, title: 'LOOP BROKEN', subtitle: 'Time remembers. So do you.',
    lines: [
      'The clock reads 12:59:59, and it does not move.',
      'You remember all of it. Every loop. Every morning. Every "good morning".',
      'The fold cannot close around a mind that remembers everything.',
      'The Observer smiles with your face, and lets go.',
      'At 13:00:00, for the first time in four thousand, two hundred and eleven loops — it is 13:00.',
    ],
  },
];

export const ENDING_BY_ID = Object.fromEntries(ENDINGS.map((e) => [e.id, e])) as Record<EndingId, EndingDef>;
