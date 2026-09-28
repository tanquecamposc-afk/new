/**
 * Every interactable object in ORPHEUS: its position, prompt label (which may
 * depend on time/knowledge/inventory) and what happens on [E].
 */
import { world } from '../core/world';
import { G } from '../core/store';
import { Memory } from './MemorySystem';
import { Inventory } from './Inventory';
import { Puzzles, GENERATOR_POS, RELAY_POS, ANCHOR_GLYPH } from './PuzzleSystem';
import { Flow } from './Flow';
import { Dialogue } from './Dialogue';
import { say } from './Voice';
import { Audio } from '../audio/AudioEngine';
import { playAction } from './PlayerSystem';
import { at, formatClock, RELAY_WINDOWS, SYMBOL_GLYPH } from '../core/constants';
import { mugState, has, loopN, ANOMALY_LABEL } from './Progression';
import { exitAttempt, noteExitBroken } from './Terminals';
import { Endings } from './EndingSystem';
import { Cutscenes } from './Cutscenes';
import { kaneConversation, mayaConversation, observerConversation, phoneConversation, type ConvDef } from '../data/dialogue';
import { hideObserver } from '../ai/Observer';
import type { ItemId } from '../core/types';
import { backupPower } from './DoorSystem';

export interface Interactable {
  id: string;
  pos: () => { x: number; y: number; z: number };
  /** Prompt text, or null when not currently interactable. */
  label: () => string | null;
  /** If set, the prompt is shown greyed out with this reason and [E] gives feedback. */
  hold?: number;
  range?: number;
  act: () => void;
}

const P = (x: number, y: number, z: number) => () => ({ x, y, z });
const inspect = (title: string, text: string) => Flow.openPanel('inspect', { inspect: { title, text } });

function pickup(id: string, item: ItemId, label = 'PICK UP'): Omit<Interactable, 'pos' | 'id'> {
  return {
    label: () => (world.pickups[id] ? label : null),
    act: () => { world.pickups[id] = false; playAction('pickup', 0.7); Inventory.add(item); },
  };
}

function doc(docId: string, label = 'READ DOCUMENT'): Omit<Interactable, 'pos' | 'id'> {
  return { label: () => label, act: () => { playAction('inspect', 0.8); Memory.readDocument(docId); } };
}

function talk(conv: () => ConvDef, onDone?: (choice?: string) => void) {
  const c = conv();
  const grant = () => c.grant?.forEach((g) => Memory.discoverClue(g));
  Dialogue.open({
    lines: c.lines,
    choices: c.choices,
    onChoice: (choice) => {
      grant();
      const extra = c.choiceLines?.[choice];
      if (extra) {
        Dialogue.open({ lines: extra.lines, onEnd: () => { extra.grant?.forEach((g) => Memory.discoverClue(g)); onDone?.(choice); } });
      } else onDone?.(choice);
    },
    onEnd: () => { grant(); onDone?.(); },
  });
}

function relay(id: 'A' | 'B' | 'C'): Interactable {
  const [x, y, z] = RELAY_POS[id];
  return {
    id: `relay_${id}`, pos: P(x, y, z),
    label: () => (world.relays[id] ? `RELAY ${id} — SYNCHRONIZED` : `ENGAGE RELAY ${id}`),
    act: () => Puzzles.engageRelay(id),
  };
}

function generator(i: number): Interactable {
  const [x, y, z] = GENERATOR_POS[i];
  return {
    id: `gen_${i}`, pos: P(x, y, z), hold: 2.4,
    label: () => (world.generators[i] ? `G${i + 1} — ONLINE` : Inventory.has('tool') ? `RESTART GENERATOR G${i + 1}` : `GENERATOR G${i + 1} — NEEDS TOOL`),
    act: () => {
      if (world.generators[i]) return;
      if (!Inventory.has('tool')) { Audio.sfx('doorLocked', { pos: { x, y, z } }); Memory.discoverClue('GENERATORS'); return; }
      Puzzles.restartGenerator(i);
    },
  };
}

function anchor(i: number, x: number, z: number): Interactable {
  return {
    id: `anchor_${i}`, pos: P(x, 1.4, z), range: 2.2,
    label: () => (world.final.active ? (world.anchors[i] ? `ANCHOR ${SYMBOL_GLYPH[ANCHOR_GLYPH[i]]} — AWAKE` : `WAKE ANCHOR ${SYMBOL_GLYPH[ANCHOR_GLYPH[i]]}`) : `INSPECT ANCHOR ${SYMBOL_GLYPH[ANCHOR_GLYPH[i]]}`),
    act: () => {
      if (world.final.active) { playAction('interact', 0.6); Endings.anchor(i); return; }
      inspect(`ANCHOR ${SYMBOL_GLYPH[ANCHOR_GLYPH[i]]}`, 'A black pillar engraved with a single glyph. It is cold, and it hums when you stand close — as if it were waiting for something to be remembered.');
    },
  };
}

export const INTERACTABLES: Interactable[] = [
  // ── HUB ──
  {
    id: 'hub_mug', pos: P(0.3, 0.85, 0.1), range: 1.8,
    label: () => (mugState() === 'gone' ? null : 'INSPECT'),
    act: () => {
      const s = mugState();
      Memory.seeMugState(s);
      playAction('inspect', 0.8);
      const text = {
        intact: 'A white mug, still warm. "ORPHEUS — 13 YEARS OF SAFE TIME". The coffee inside is exactly as warm as last time.',
        broken: 'The mug is broken. Three clean pieces, as if it had been dropped very carefully.',
        note: 'The broken mug, and a note beside it in handwriting you almost recognise: "YOU NOTICED. GOOD. NOW NOTICE THE REST."',
        gone: '',
      }[s];
      if (s === 'note') Memory.findSecret('MUG_NOTE');
      if (world.anomalies.includes('DOUBLE_MUG')) Memory.noteAnomaly('DOUBLE_MUG', ANOMALY_LABEL.DOUBLE_MUG);
      inspect('MUG', text);
    },
  },
  {
    id: 'hub_stop', pos: P(-8, 1.6, -7.7), label: () => (loopN() >= 12 ? 'INSPECT' : null),
    act: () => inspect('WALL', 'Letters scratched deep into the panel, the grooves still sharp: STOP RESETTING. The scratches are in your handwriting.'),
  },
  { id: 'hub_reception', pos: P(-8.1, 1.15, -3.6), label: () => 'USE COMPUTER', act: () => { playAction('computer', 1); Flow.openPanel('terminal', { terminalId: 'reception' }); } },
  { id: 'hub_welcome', pos: P(-8.1, 0.95, -4.9), ...doc('WELCOME') },
  { id: 'hub_safety', pos: P(-9.7, 1.5, 2.5), ...doc('SAFETY', 'READ NOTICE') },
  {
    id: 'hub_phone', pos: P(-8.1, 1.0, -5.6),
    label: () => (world.phoneRinging ? 'ANSWER PHONE' : 'INSPECT PHONE'),
    act: () => {
      if (!world.phoneRinging) { inspect('PHONE', 'An old desk phone. The line is dead. There is no cable.'); return; }
      world.phoneRinging = false;
      Audio.sfx('phoneLift', { pos: world.player.pos });
      playAction('interact', 0.8);
      talk(phoneConversation, () => { if (loopN() >= 6) { Memory.findSecret('PHONE_WHISPER'); Audio.sfx('whisper', { volume: 1 }); world.light.flicker = 1; } });
    },
  },
  {
    id: 'hub_map', pos: P(-2.6, 1.8, -7.7), label: () => 'INSPECT MAP',
    act: () => { Memory.discoverClue('ORPHEUS'); inspect('FACILITY MAP', 'ORPHEUS — Level −3.\nHub · Medical · Laboratory · Security · Archives · Dormitory · Core Access · Restricted Sector · Maintenance · Reactor.\n\nThe east wing has been painted over. Faint lines show a room past the Restricted Sector, labelled only "7".'); },
  },
  {
    id: 'hub_clock', pos: P(3, 2.9, -7.7), range: 2.8, label: () => 'INSPECT CLOCK',
    act: () => {
      if (world.anomalies.includes('WRONG_CLOCK')) {
        Memory.findSecret('WRONG_CLOCK');
        Memory.noteAnomaly('WRONG_CLOCK', ANOMALY_LABEL.WRONG_CLOCK);
        inspect('CLOCK', 'The wall clock reads 03:13 and the second hand is running backwards.');
      } else inspect('CLOCK', `The wall clock reads ${formatClock(world.t)}. It is exactly right. It is always exactly right.`);
    },
  },
  {
    id: 'elevator_panel', pos: P(1.55, 1.3, -7.7), label: () => 'CALL ELEVATOR',
    act: () => {
      playAction('interact', 0.7);
      const r = exitAttempt();
      if (r === 'escape') { Endings.escape(); return; }
      Audio.sfx('doorLocked', { pos: { x: 0, y: 1.3, z: -8 } });
      if (r === 'lie') {
        say('A-13', 'The main exit is operational. Please wait.');
        setTimeout(() => { say('A-13', '…Please wait.'); noteExitBroken(); }, 3200);
      } else if (r === 'noCard') { say('A-13', 'Director access card required.'); noteExitBroken(); }
      else { say('A-13', 'Elevator has no power. Auxiliary generators offline.'); noteExitBroken(); }
    },
  },
  {
    id: 'hub_storage_top', pos: P(9.4, 2.35, -6.9), range: 1.6,
    label: () => (world.player.pos.y > 1.8 && !world.flags.has('highNote') ? 'READ NOTE' : null),
    act: () => { world.flags.add('highNote'); Memory.findSecret('HIGH_PLACE'); inspect('NOTE', '"You pushed the crates again. You always push the crates.\nThe code for Security is on Kane\'s bunk. You always forget that too.\n— you"'); Memory.discoverClue('SECURITY_CODE'); },
  },
  {
    id: 'hub_fake_door', pos: P(-9.6, 1.2, -5.8),
    label: () => (world.anomalies.includes('IMPOSSIBLE_DOOR') ? 'OPEN DOOR' : null),
    act: () => { Memory.noteAnomaly('IMPOSSIBLE_DOOR', ANOMALY_LABEL.IMPOSSIBLE_DOOR); Audio.sfx('door', { pos: world.player.pos }); inspect('DOOR', 'The door opens onto solid concrete. When you close it and open it again, the concrete has a handprint in it. Your size.'); },
  },
  {
    id: 'security_keypad', pos: P(8.2, 1.4, 7.72),
    label: () => (world.keypadSolved ? null : 'ENTER CODE'),
    act: () => { playAction('interact', 0.5); Flow.openPanel('keypad', { keypadTarget: 'd_security' }); },
  },
  {
    id: 'archives_panel', pos: P(-4.2, 1.4, -7.72),
    label: () => (world.t < at('12:50') ? 'INSPECT DOOR' : null),
    act: () => { Memory.discoverClue('ARCHIVES_TIMED'); Audio.sfx('doorLocked', { pos: { x: -5.5, y: 1.3, z: -8 } }); inspect('ARCHIVES', 'ARCHIVES — SCHEDULED ACCESS\nNext window: 12:50'); },
  },
  {
    id: 'restricted_panel', pos: P(13.7, 1.4, 1.5),
    label: () => (backupPower() ? null : 'INSPECT DOOR'),
    act: () => { Audio.sfx('doorLocked', { pos: { x: 14, y: 1.3, z: 0 } }); Memory.discoverClue('GENERATORS'); inspect('RESTRICTED SECTOR', `NO POWER — auxiliary generators ${world.generators.filter(Boolean).length}/3 online.\nPrimary grid access revoked by A-13.`); },
  },
  // ── MEDICAL ──
  { id: 'med_flashlight', pos: P(-7.2, 0.95, 12.05), ...pickup('med_flashlight', 'flashlight') },
  {
    id: 'med_mirror', pos: P(-6.5, 1.6, 17.72), label: () => 'LOOK IN MIRROR',
    act: () => { playAction('inspect', 1); Memory.discoverClue('SUBJECT13'); inspect('MIRROR', 'A tired face you cannot quite remember owning.\nOn your wrist, a hospital band: SUBJECT 13 · ID 0413-A.\nThe band is worn smooth, as if it had been there for years.'); },
  },
  { id: 'med_log', pos: P(-3.7, 0.85, 16.1), ...doc('MEDICAL_LOG') },
  {
    id: 'med_cabinet', pos: P(-3.55, 1.2, 11), label: () => (world.pickups.med_cabinet ? 'OPEN CABINET' : null),
    act: () => { world.pickups.med_cabinet = false; playAction('pickup', 0.7); Inventory.add('medkit'); },
  },
  { id: 'maya_journal', pos: P(-8.6, 0.95, 16.3), label: () => ((loopN() >= 3 && loopN() % 2 === 0) || has('MAYA_WARNING') ? 'READ JOURNAL' : null), act: () => Memory.readDocument('MAYA_JOURNAL') },
  {
    id: 'wake_bed', pos: P(-8.2, 0.9, 13.3), range: 1.6,
    label: () => (world.fastForward ? 'GET UP' : 'LIE DOWN (WAIT)'),
    act: () => {
      world.fastForward = !world.fastForward;
      if (world.fastForward) { world.player.action = 'lying'; world.player.actionDuration = 9999; world.player.pos.set(-7.1, 0, 13.3); say('YOU', 'Just a few minutes…', 2); }
      else { world.player.action = null; }
    },
  },
  // ── LAB ──
  { id: 'lab_notebook', pos: P(-1.6, 1.0, 11.1), ...doc('KANE_NOTEBOOK') },
  { id: 'lab_battery', pos: P(-1.6, 1.0, 13.1), ...pickup('lab_battery', 'battery') },
  { id: 'lab_tool', pos: P(2.4, 1.0, 13.1), ...pickup('lab_tool', 'tool') },
  { id: 'lab_computer', pos: P(2.4, 1.15, 10.8), label: () => 'USE COMPUTER', act: () => { playAction('computer', 1); Memory.readDocument('LAB_EMAIL'); } },
  {
    id: 'lab_fridge', pos: P(3.1, 1.2, 16.6), label: () => (world.pickups.lab_fridge ? 'OPEN FRIDGE' : null),
    act: () => { world.pickups.lab_fridge = false; playAction('pickup', 0.7); Inventory.add('sample'); Memory.findSecret('SAMPLE'); inspect('EXPERIMENTAL SAMPLE', 'A vial of pale liquid. When you tilt it, the surface takes three seconds to follow.\nFor a moment you see your own hand holding it — from the other side of the room.'); },
  },
  relay('A'),
  { id: 'lab_whiteboard', pos: P(-2.7, 1.6, 11.5), label: () => 'INSPECT WHITEBOARD', act: () => inspect('WHITEBOARD', 'Equations about folded intervals. A circle with an arrow from 13:00 back to 12:47.\nSomeone wrote "RELAYS: A 12:5_  B 12:5_  C 12:5_" and then angrily erased the digits.\nBeneath it: "ask K. while he is in Security".') },
  {
    id: 'lab_maint_reader', pos: P(2.95, 1.3, 17.72),
    label: () => (world.doors.d_lab_maint.unlocked ? null : Inventory.has('keycard') ? 'SWIPE KEYCARD' : 'MAINTENANCE — KEYCARD REQUIRED'),
    act: () => {
      if (!Inventory.has('keycard')) { Audio.sfx('doorLocked', { pos: { x: 2, y: 1.3, z: 18 } }); return; }
      world.doors.d_lab_maint.unlocked = true; Audio.sfx('keypadOk', { pos: { x: 2, y: 1.3, z: 18 } }); playAction('interact', 0.5);
    },
  },
  // ── SECURITY ──
  {
    id: 'sec_cctv', pos: P(6.1, 1.15, 14.6), label: () => 'USE CAMERAS',
    act: () => { playAction('computer', 1); Memory.discoverClue('CAMERAS'); world.cctv.active = true; world.cctv.since = world.t; Flow.openPanel('cctv'); },
  },
  { id: 'sec_terminal', pos: P(8.0, 1.15, 14.6), label: () => 'USE TERMINAL', act: () => { playAction('computer', 1); Flow.openPanel('terminal', { terminalId: 'security' }); } },
  { id: 'sec_keycard', pos: P(4.75, 0.85, 10.6), ...pickup('sec_keycard', 'keycard') },
  { id: 'sec_log', pos: P(4.75, 0.85, 9.7), ...doc('SHIFT_LOG') },
  // ── DORMITORY ──
  { id: 'dorm_code', pos: P(-19.4, 0.62, -6.1), ...doc('CODE_NOTE', 'READ NOTE') },
  { id: 'dorm_maya_note', pos: P(-22.6, 0.62, 6.1), label: () => (loopN() >= 3 || G().run.ngPlus > 0 ? 'READ NOTE' : null), act: () => Memory.readDocument('MAYA_NOTE') },
  { id: 'dorm_battery', pos: P(-18.2, 0.85, 0.2), ...pickup('dorm_battery', 'battery') },
  {
    id: 'strange_locker', pos: P(-13.75, 1.2, -4.2),
    label: () => (world.flags.has('lockerOpen') ? null : Inventory.has('strangekey') ? 'USE STRANGE KEY' : 'LOCKER 13'),
    act: () => {
      if (!Inventory.has('strangekey')) { inspect('LOCKER 13', 'A locker with an old brass keyhole. The number 13 has been scratched in by hand.'); return; }
      world.flags.add('lockerOpen'); Audio.sfx('metal', { pos: world.player.pos, volume: 0.4 }); Memory.findSecret('LOCKER_13'); Memory.readDocument('OBSERVER_DIARY');
    },
  },
  {
    id: 'dorm_dup_kane', pos: P(-22.9, 1.3, -1.8), range: 3,
    label: () => (world.anomalies.includes('DUPLICATE_KANE') ? 'INSPECT' : null),
    act: () => { Memory.noteAnomaly('DUPLICATE_KANE', ANOMALY_LABEL.DUPLICATE_KANE); inspect('KANE?', 'He stands facing the lockers, perfectly still. He does not breathe. When you blink, he is facing you.'); },
  },
  // ── ARCHIVES ──
  { id: 'arch_sync', pos: P(-2.7, 0.85, -18.95), ...doc('SYNC_PROTOCOL') },
  { id: 'arch_drive', pos: P(-2.7, 0.85, -18.05), ...pickup('arch_datadrive', 'datadrive') },
  { id: 'arch_blueprint', pos: P(-3.7, 1.3, -14.5), ...doc('SECTOR7_BLUEPRINT', 'READ BLUEPRINT') },
  { id: 'arch_p13', pos: P(-9.05, 1.35, -9.6), ...doc('P13_OVERVIEW', 'OPEN DRAWER') },
  relay('B'),
  {
    id: 'arch_wall', pos: P(-9.6, 2.3, -18.5), range: 2.8, label: () => 'INSPECT WALL',
    act: () => {
      const sawCam = world.flags.has('sawObserverCctv');
      if (sawCam) Memory.discoverClue('EMPTY_ROOM');
      inspect('ARCHIVE WALL', sawCam ? 'On the camera, four glyphs glowed here. Here, there is only wallpaper — and four faint, warm spots on it, the size of a fingertip.' : 'Old wallpaper. Four faint marks at head height, as if someone had pressed a finger to it over and over.');
    },
  },
  // ── ANTECHAMBER / CORE ──
  {
    id: 'symbol_panel', pos: P(7.72, 1.4, -12.8),
    label: () => (world.symbolSolved ? 'PATTERN ACCEPTED' : 'ENTER PATTERN'),
    act: () => { if (!world.symbolSolved) { playAction('interact', 0.5); Flow.openPanel('symbols'); } },
  },
  {
    id: 'relay_board', pos: P(3.28, 1.8, -11), label: () => 'CHECK RELAY STATUS',
    act: () => {
      Memory.discoverClue('CORE_ACCESS');
      const s = (k: 'A' | 'B' | 'C') => `RELAY ${k}: ${world.relays[k] ? 'SYNCHRONIZED' : 'OPEN'}${has('RELAY_TIMES') ? `  (window ${formatClock(RELAY_WINDOWS[k].start)})` : ''}`;
      inspect('TEMPORAL CORE — LOCKS', `LOCK 1  PATTERN: ${world.symbolSolved ? 'ACCEPTED' : 'WAITING'}\nLOCK 2  SYNC:\n  ${s('A')}\n  ${s('B')}\n  ${s('C')}`);
    },
  },
  {
    id: 'core_console', pos: P(5.5, 1.15, -17.75), label: () => 'USE CORE CONSOLE',
    act: () => { playAction('computer', 1); Memory.discoverClue('CORE_CHOICE'); Flow.openPanel('core'); },
  },
  anchor(0, 2.6, -20.5), anchor(1, 12.4, -20.5), anchor(2, 12.4, -28.5), anchor(3, 2.6, -28.5),
  // ── RESTRICTED ──
  { id: 'res_card', pos: P(20.1, 0.85, -7.0), ...pickup('res_accesscard', 'accesscard') },
  { id: 'res_computer', pos: P(20.9, 1.15, -7.3), label: () => 'USE COMPUTER', act: () => { playAction('computer', 1); Memory.readDocument('KANE_EMAIL'); } },
  { id: 'res_report', pos: P(18.8, 0.85, 0.5), ...doc('P13_FINAL', 'READ REPORT') },
  {
    id: 'res_pod', pos: P(16.1, 1.4, 4.75), label: () => 'INSPECT POD',
    act: () => { Memory.findSecret('POD'); inspect('CONTAINMENT POD', 'Frost on the inside of the glass. A shape in a lab coat, curled up, very still.\nThe name tag reads KANE, J.\nThe Kane walking the corridors is breathing. This one is not.'); Memory.discoverClue('KANE_ECHO', !has('NOT_FIRST_LOOP')); },
  },
  {
    id: 'res_eastwall', pos: P(23.7, 1.4, -1), range: 2.2,
    label: () => (world.hiddenOpen ? null : has('SECTOR7') ? 'INSPECT WALL' : null),
    act: () => {
      if (world.t >= at('12:55') || G().run.clues.includes('OBSERVER_DISTANT')) {
        world.hiddenOpen = true;
        Audio.sfx('glitch'); Audio.sfx('swell');
        world.distortion = 0.6;
        say('A-13', 'There is no Sector 7. There is no Sector 7. There is n—');
      } else {
        inspect('EAST WALL', 'The wall hums under your palm. There is space behind it. It feels thicker now — as if, later in the loop, it might be thinner.');
      }
    },
  },
  {
    id: 'res_jammed', pos: P(20.5, 1.2, 7.7), hold: 2,
    label: () => (world.doors.d_rr_top.unlocked ? null : Inventory.has('tool') ? 'PRY DOOR OPEN' : 'JAMMED DOOR — NEEDS TOOL'),
    act: () => { if (Inventory.has('tool')) { world.doors.d_rr_top.unlocked = true; Audio.sfx('metal', { pos: { x: 20.5, y: 1.2, z: 8 } }); } },
  },
  {
    id: 'res_jammed_s', pos: P(20.5, 1.2, 8.3), hold: 2,
    label: () => (world.doors.d_rr_top.unlocked ? null : Inventory.has('tool') ? 'PRY DOOR OPEN' : 'JAMMED DOOR — NEEDS TOOL'),
    act: () => { if (Inventory.has('tool')) { world.doors.d_rr_top.unlocked = true; Audio.sfx('metal', { pos: { x: 20.5, y: 1.2, z: 8 } }); } },
  },
  // ── MAINTENANCE / REACTOR ──
  generator(0), generator(1), generator(2),
  { id: 'maint_manual', pos: P(-13.4, 1.4, 21.2), ...doc('GEN_MANUAL', 'READ MANUAL') },
  {
    id: 'maint_radio', pos: P(-6.6, 1.25, 20.65), label: () => 'LISTEN TO RADIO',
    act: () => { Audio.sfx('static', { pos: world.player.pos }); Audio.sfx('whisper', { volume: 0.8 }); Memory.findSecret('RADIO'); inspect('RADIO', 'Static. Then a voice, played backwards. Slowed down in your head it says:\n"…thirteen minutes… you have thirteen minutes… good morning…"\nIt is your voice.'); },
  },
  { id: 'maint_battery', pos: P(14.2, 1.0, 20.9), ...pickup('maint_battery', 'battery') },
  { id: 'maint_medkit', pos: P(-15.2, 1.2, 20.6), ...pickup('maint_medkit', 'medkit') },
  relay('C'),
  { id: 'reactor_notice', pos: P(17.7, 0.85, 13), ...doc('REACTOR_WARNING') },
  // ── SECTOR 7 ──
  {
    id: 'unk_badge', pos: P(31.2, 0.15, -2.4), range: 1.8, label: () => (world.flags.has('badgeTaken') ? null : 'PICK UP BADGE'),
    act: () => {
      world.flags.add('badgeTaken');
      playAction('pickup', 0.8);
      Memory.discoverClue('OBSERVER_BADGE');
      if (has('SUBJECT13')) Cutscenes.identityReveal(() => Memory.discoverClue('OBSERVER_IDENTITY'));
      else inspect('BADGE', 'A staff badge, scratched almost blank: SUBJECT 13 · ID 0413-A.\nThe number feels familiar. Where have you seen it?');
    },
  },
  { id: 'unk_notes1', pos: P(27.2, 0.85, 3.3), ...doc('OWN_NOTES_1', 'READ NOTES') },
  { id: 'unk_notes2', pos: P(27.9, 0.85, 3.3), ...doc('OWN_NOTES_2', 'READ NOTES') },
  { id: 'unk_key', pos: P(26, 0.55, -5.2), ...pickup('unk_strangekey', 'strangekey') },
  {
    id: 'unk_tally', pos: P(24.4, 1.5, -3.5), label: () => 'INSPECT WALL',
    act: () => { Memory.discoverClue('NOT_FIRST_LOOP'); Memory.discoverClue('CORE_AUTH'); inspect('THE WALL', 'Tally marks. Thousands of them, in groups of five, floor to ceiling, on every wall.\nThe last group is fresh. Beneath it, carved deeper than the rest:\n\n4211'); },
  },
  // ── New Game+ ──
  { id: 'ngp_doc', pos: P(-0.4, 0.85, -0.2), label: () => (G().run.ngPlus > 0 ? 'READ LOG' : null), act: () => Memory.readDocument('NGP_ITERATION') },
];

/** Characters are interactables too. */
export const CHARACTER_INTERACTABLES: Interactable[] = [
  {
    id: 'npc_kane', pos: () => ({ x: world.kane.pos.x, y: 1.5, z: world.kane.pos.z }), range: 2.3,
    label: () => (world.kane.present && world.kane.vanishing <= 0 ? 'TALK' : null),
    act: () => {
      world.kane.talking = true;
      talk(kaneConversation, () => { world.kane.talking = false; world.kane.talkedThisLoop++; });
    },
  },
  {
    id: 'npc_maya', pos: () => ({ x: world.maya.pos.x, y: 1.5, z: world.maya.pos.z }), range: 2.3,
    label: () => (world.maya.present ? 'TALK' : null),
    act: () => {
      world.maya.talking = true;
      talk(mayaConversation, () => { world.maya.talking = false; });
    },
  },
  {
    id: 'npc_observer', pos: () => ({ x: world.observer.pos.x, y: 1.5, z: world.observer.pos.z }), range: 2.6,
    label: () => (world.observer.interactive && world.observer.visible && world.observer.mode === 'WATCHING' ? 'APPROACH' : null),
    act: () => {
      world.flags.add('observerMet');
      Memory.setFlag('observerMet');
      talk(observerConversation, (choice) => {
        if (choice === 'hand') { Endings.observer(); return; }
        if (choice === 'gift') { Memory.findSecret('OBSERVER_GIFT'); Inventory.add('sample'); }
        hideObserver(60);
      });
    },
  },
];

export const ALL_INTERACTABLES = [...INTERACTABLES, ...CHARACTER_INTERACTABLES];
