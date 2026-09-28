/** Every clue the player can learn. Clues are knowledge: they survive loop resets. */
export interface ClueDef {
  id: string;
  n: number;
  text: string;
  /** Short knowledge entry shown in MEMORY → KNOWLEDGE. */
  knowledge?: [label: string, value: string];
  ngPlus?: boolean;
}

const list: Omit<ClueDef, 'n'>[] = [
  { id: 'LOOP_13MIN', text: 'At 13:00 everything resets. The clock returns to 12:47. I keep my memories.', knowledge: ['Loop', '12:47 → 13:00 (13 minutes)'] },
  { id: 'ORPHEUS', text: 'This place is ORPHEUS — a facility for temporal research.' },
  { id: 'A13_INTRO', text: 'An AI named A-13 runs ORPHEUS. It speaks to me. It knows my schedule.' },
  { id: 'SUBJECT13', text: 'My wristband reads: SUBJECT 13 · ID 0413-A.', knowledge: ['My ID', 'SUBJECT 13 · 0413-A'] },
  { id: 'KANE_MET', text: 'Dr. Kane enters the Laboratory at 12:48.', knowledge: ['Kane', 'Laboratory at 12:48'] },
  { id: 'KANE_ROUTE', text: 'Kane moves: Lab (12:48) → Security (12:51) → Archives (12:54).', knowledge: ['Kane route', 'Lab 12:48 → Security 12:51 → Archives 12:54'] },
  { id: 'SECURITY_CODE', text: 'The Security door code is 7391.', knowledge: ['Security code', '7391'] },
  { id: 'ARCHIVES_TIMED', text: 'The Archives unlock at exactly 12:50.', knowledge: ['Archives', 'Unlock at 12:50'] },
  { id: 'POWER_FAIL', text: 'Main power fails at 12:52. The dark lasts about half a minute.', knowledge: ['Power failure', '12:52'] },
  { id: 'TERMINAL_MSG', text: 'At 12:54 every screen in ORPHEUS shows the same message.', knowledge: ['Terminals', 'Message at 12:54'] },
  { id: 'ALARM_1257', text: 'An alarm sounds at 12:57. After that, Kane is gone.', knowledge: ['Alarm', '12:57'] },
  { id: 'REACTOR_1259', text: 'The reactor begins to overload at 12:59. Staying near it is lethal.', knowledge: ['Reactor', 'Overloads at 12:59'] },
  { id: 'CAMERAS', text: 'The Security console can access the facility cameras.' },
  { id: 'OBSERVER_CCTV', text: 'At 12:55 a figure stands in the Archives — but only on camera.', knowledge: ['Observer', 'CAM-03 Archives at 12:55'] },
  { id: 'SYMBOLS', text: 'The figure traces four symbols on the Archive wall: △ ○ ◇ ✕.', knowledge: ['Symbol sequence', '△  ○  ◇  ✕'] },
  { id: 'EMPTY_ROOM', text: 'I reached the Archives while the figure was on camera. Nobody was there.' },
  { id: 'SYNC_PROTOCOL', text: 'Three temporal relays must be synchronized within one loop to open the Core.' },
  { id: 'RELAY_TIMES', text: 'Relay A syncs at 12:50 (Lab), B at 12:54 (Archives), C at 12:58 (Reactor).', knowledge: ['Relays', 'A 12:50 Lab · B 12:54 Archives · C 12:58 Reactor'] },
  { id: 'GENERATORS', text: 'Three auxiliary generators can restore backup power. They need a tool to restart.', knowledge: ['Generators', '2 in Maintenance, 1 in Reactor — need Tool'] },
  { id: 'BACKUP_POWER', text: 'With backup power online, the Restricted Sector and the main exit have power.' },
  { id: 'EXIT_BROKEN', text: 'A-13 says the main exit is operational. It is not.' },
  { id: 'A13_LIES', text: "A-13's directive: 'Keep the subject calm. Disclosure: none.' It lies to me.", knowledge: ['A-13', 'Not trustworthy'] },
  { id: 'SECTOR7', text: 'Blueprints show a sealed Sector 7 behind the Restricted Sector\'s east wall.', knowledge: ['Sector 7', 'Behind Restricted east wall'] },
  { id: 'PROJECT13', text: 'PROJECT 13: fold a failing temporal field into a closed 13-minute loop.' },
  { id: 'ANCHOR', text: 'A living person had to stay inside the loop as its anchor.' },
  { id: 'MEMORY_WIPE', text: "The anchor's memory is suppressed at every reset to keep the loop stable." },
  { id: 'OBSERVER_DISTANT', text: 'The figure now appears at the end of corridors. It is getting closer.' },
  { id: 'OBSERVER_FOLLOWS', text: 'It only moves when I am not looking at it.' },
  { id: 'NOT_FIRST_LOOP', text: 'Tally marks in Sector 7: 4,211. This was never Loop 01.', knowledge: ['Real iteration', '4,211+'] },
  { id: 'OBSERVER_BADGE', text: "The figure's badge, left in Sector 7: SUBJECT 13 · ID 0413-A." },
  { id: 'OBSERVER_IDENTITY', text: 'The Observer is me — an earlier version of me that kept its memories.', knowledge: ['The Observer', 'A previous version of me'] },
  { id: 'CORE_AUTH', text: 'Core authorization: 4211 — the number of times I have been here.', knowledge: ['Core authorization', '4211'] },
  { id: 'KANE_ECHO', text: 'Kane is an echo. The real Kane died when Project 13 failed.' },
  { id: 'MAYA_TRUTH', text: 'Maya suppressed my memory, loop after loop. She called it mercy.' },
  { id: 'MAYA_WARNING', text: "Maya: 'Don't trust A-13. It was built to keep you calm, not safe.'" },
  { id: 'CORE_ACCESS', text: 'The Core door needs the symbol sequence and all three relays in sync.', knowledge: ['Core door', 'Symbols + 3 relays same loop'] },
  { id: 'CORE_CHOICE', text: 'The Core console can shut the loop down — with me inside it.' },
  { id: 'BREAK_METHOD', text: 'To break the loop: wake the four anchors in the order the Observer drew, before 13:00.', knowledge: ['Breaking the loop', 'Core anchors △ ○ ◇ ✕ before 13:00'] },
  { id: 'PHONE', text: 'The Hub phone rings at 12:52:30. There is someone on the line. Almost.', knowledge: ['Phone', 'Hub, 12:52:30'] },
  { id: 'ARC_PATTERN', text: 'The broken panel in Maintenance arcs every four seconds. Pass right after a discharge.' },
  { id: 'DEJA_VU', text: 'The mug on the Hub table is different from one loop to the next.' },
  { id: 'ANOMALIES', text: 'Things appear that should not exist. The loop is decaying.' },
  { id: 'STRANGE_KEY', text: 'A strange key from Sector 7. It fits a locker in the Dormitory.' },
  { id: 'KANE_REMEMBERS', text: "Kane: 'We've had this conversation before, haven't we?'" },
  { id: 'FIRST_DEATH', text: 'Death does not end it. The loop simply starts again.' },
  { id: 'NGP_VOICE', text: 'The voice on the phone is mine. From after.', ngPlus: true },
  { id: 'NGP_KANE', text: 'Kane remembers the loop breaking.', ngPlus: true },
  { id: 'NGP_ITERATION', text: 'Iteration 4,212. The loop re-formed after I broke it. Something pulled me back.', ngPlus: true },
];

export const CLUES: ClueDef[] = list.map((c, i) => ({ ...c, n: i + 1 }));
export const CLUE_BY_ID: Record<string, ClueDef> = Object.fromEntries(CLUES.map((c) => [c.id, c]));
export const BASE_CLUE_COUNT = CLUES.filter((c) => !c.ngPlus).length;

/** High-level MEMORY discoveries, unlocked by clues. */
export interface DiscoveryDef { id: string; title: string; requires: string[]; }
export const DISCOVERIES: DiscoveryDef[] = [
  { id: 'ORPHEUS', title: 'ORPHEUS', requires: ['ORPHEUS'] },
  { id: 'LOOP', title: '13 MINUTE LOOP', requires: ['LOOP_13MIN'] },
  { id: 'A13', title: 'A-13', requires: ['A13_INTRO'] },
  { id: 'KANE', title: 'DR. KANE', requires: ['KANE_MET'] },
  { id: 'MAYA', title: 'DR. MAYA', requires: ['MAYA_WARNING'] },
  { id: 'CODE', title: 'SECURITY CODE', requires: ['SECURITY_CODE'] },
  { id: 'CORE', title: 'TEMPORAL CORE', requires: ['CORE_ACCESS'] },
  { id: 'OBSERVER', title: 'THE OBSERVER', requires: ['OBSERVER_CCTV'] },
  { id: 'SECTOR7', title: 'SECTOR 7', requires: ['SECTOR7'] },
  { id: 'P13', title: 'PROJECT 13', requires: ['PROJECT13'] },
  { id: 'EXP13', title: 'EXPERIMENT 13', requires: ['ANCHOR', 'SUBJECT13'] },
  { id: 'IDENTITY', title: 'WHO I AM', requires: ['OBSERVER_IDENTITY'] },
  { id: 'PURPOSE', title: 'TRUE PURPOSE', requires: ['MEMORY_WIPE', 'NOT_FIRST_LOOP', 'MAYA_TRUTH'] },
];

/** Knowledge required to attempt the True Ending. */
export const TRUE_ENDING_REQUIREMENTS = [
  'SECURITY_CODE', 'SYMBOLS', 'OBSERVER_IDENTITY', 'PROJECT13', 'NOT_FIRST_LOOP',
  'A13_LIES', 'KANE_ECHO', 'MAYA_TRUTH', 'CORE_AUTH', 'BREAK_METHOD',
];
