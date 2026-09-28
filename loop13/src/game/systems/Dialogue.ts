/** Branching conversations (NPCs, the Observer, the phone). Time keeps running while you talk. */
import { G } from '../core/store';
import { Flow } from './Flow';
import { Audio } from '../audio/AudioEngine';

export interface Line { speaker: string; text: string; }
export interface Choice { id: string; text: string; disabled?: boolean; }

interface Conv { lines: Line[]; choices?: Choice[]; onChoice?: (id: string) => void; onEnd?: () => void; }

export const Dialogue = {
  open(conv: Conv): void {
    Flow.openPanel('dialogue', {
      dialogue: { speaker: conv.lines[0]?.speaker ?? '', lines: conv.lines, index: 0, choices: conv.choices, onChoice: conv.onChoice, onEnd: conv.onEnd },
    }, 'DIALOGUE');
    const first = conv.lines[0];
    if (first) voice(first);
  },
  advance(): void {
    const d = G().panelData.dialogue;
    if (!d) return;
    if (d.index < d.lines.length - 1) {
      const next = { ...d, index: d.index + 1 };
      G().setPanel('dialogue', { dialogue: next });
      voice(next.lines[next.index]);
      Audio.sfx('ui');
      return;
    }
    if (d.choices && d.choices.length) return; // waiting for a choice
    Dialogue.close();
  },
  choose(id: string): void {
    const d = G().panelData.dialogue;
    if (!d) return;
    Audio.sfx('ui');
    const cb = d.onChoice;
    Flow.closePanel();
    cb?.(id);
  },
  close(): void {
    const d = G().panelData.dialogue;
    const cb = d?.onEnd;
    Flow.closePanel();
    cb?.();
  },
};

function voice(l: Line): void {
  if (l.speaker === 'A-13') Audio.speak(l.text, 'A13');
  else if (l.speaker === 'THE OBSERVER') Audio.speak(l.text, 'OBSERVER');
  else if (l.speaker !== 'YOU') Audio.sfx('whisper', { volume: 0.15 });
}
