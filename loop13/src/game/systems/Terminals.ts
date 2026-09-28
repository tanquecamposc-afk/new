/** Computer terminals: A-13 conversation, security logs, data drive decryption. */
import { G } from '../core/store';
import { world } from '../core/world';
import { Memory, Achievements } from './MemorySystem';
import { Inventory } from './Inventory';
import { Audio } from '../audio/AudioEngine';
import { has } from './Progression';
import { formatClock } from '../core/constants';

export interface TerminalOption { id: string; label: string; }
export interface TerminalDef {
  id: string;
  title: string;
  header: () => string[];
  options: () => TerminalOption[];
  respond: (id: string) => string[];
}

export const TERMINALS: Record<string, TerminalDef> = {
  reception: {
    id: 'reception',
    title: 'ORPHEUS RECEPTION — A-13 INTERFACE',
    header: () => [`A-13 v13.0.4  ·  ${formatClock(world.t, true)}`, 'Hello. How can I keep you calm today?'],
    options: () => {
      const o: TerminalOption[] = [
        { id: 'who', label: 'Who are you?' },
        { id: 'where', label: 'What is this place?' },
        { id: 'exit', label: 'Is the main exit working?' },
        { id: 'others', label: 'Is anyone else here?' },
      ];
      if (has('SECTOR7')) o.push({ id: 's7', label: 'What is Sector 7?' });
      if (has('OBSERVER_CCTV')) o.push({ id: 'figure', label: 'Who is the figure on the cameras?' });
      if (has('NOT_FIRST_LOOP')) o.push({ id: 'count', label: 'How many times have I been here?' });
      return o;
    },
    respond: (id) => {
      Audio.sfx('type');
      switch (id) {
        case 'who': Memory.discoverClue('A13_INTRO'); return ['I am A-13. I keep ORPHEUS running.', 'I keep you running.'];
        case 'where': Memory.discoverClue('ORPHEUS'); return ['ORPHEUS. A research facility.', 'You work here. You are happy here.'];
        case 'exit': world.flags.add('askedExit'); return ['The main exit is operational.', 'Please proceed there whenever you like.'];
        case 'others': return world.kane.present ? ['No one else is in the facility.', '(A figure in a lab coat walks past the camera feed in the corner of the screen.)'] : ['No one else is in the facility.'];
        case 's7': return ['Sector 7 does not exist.', 'Sector 7 does not exist.', 'Sector 7 does n█t ex█st.'];
        case 'figure': return ['There is no one in the cameras.', 'Please look away from the cameras.'];
        case 'count': Audio.sfx('glitch'); return ['Once. This is Loop 01.', '…', '4,211.', 'This is Loop 01.'];
        default: return [];
      }
    },
  },
  security: {
    id: 'security',
    title: 'SECURITY TERMINAL — SEC-02',
    header: () => world.flags.has('selfTyping') && world.t < 470
      ? ['> HELLO?', '> ARE YOU THERE', '> I CAN SEE YOU ON CAM-01', '> (nobody is typing)']
      : ['SECURITY SUBSYSTEM', `Session: ANONYMOUS · ${formatClock(world.t, true)}`],
    options: () => {
      const o: TerminalOption[] = [{ id: 'logs', label: 'Read shift log' }, { id: 'cams', label: 'Camera status' }];
      if (Inventory.has('datadrive')) o.push({ id: 'drive', label: 'Insert Data Drive [A-13 / DIRECTIVES]' });
      if (has('A13_LIES')) o.push({ id: 'cam8', label: 'Unlock hidden feed CAM-08' });
      return o;
    },
    respond: (id) => {
      Audio.sfx('type');
      switch (id) {
        case 'logs': setTimeout(() => Memory.readDocument('SHIFT_LOG'), 50); return ['Opening log…'];
        case 'cams': Memory.discoverClue('CAMERAS'); return ['CAM-01 … CAM-07: ONLINE', 'CAM-08: ████ (restricted by A-13)', 'Use the camera console on the left.'];
        case 'drive': setTimeout(() => Memory.readDocument('A13_DIRECTIVE'), 50); return ['Decrypting…', 'DONE.'];
        case 'cam8': world.flags.add('cam8'); Memory.setFlag('cam8Unlocked'); return ['CAM-08 feed unlocked.', 'A-13: Please do not look at CAM-08.'];
        default: return [];
      }
    },
  },
};

export function exitAttempt(): 'escape' | 'lie' | 'noPower' | 'noCard' {
  const power = world.generators.every(Boolean);
  const card = Inventory.has('accesscard');
  if (power && card) return 'escape';
  if (!power && !card) return 'lie';
  return power ? 'noCard' : 'noPower';
}

export function noteExitBroken(): void {
  Memory.discoverClue('EXIT_BROKEN');
  Achievements.unlock('NO_ESCAPE');
  G();
}
