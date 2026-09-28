/** Spoken lines: subtitles + (optional) synthesized voice for A-13 / The Observer. */
import { G } from '../core/store';
import { Audio } from '../audio/AudioEngine';
import { later } from '../core/timeline';

export type Speaker = 'A-13' | 'KANE' | 'MAYA' | 'THE OBSERVER' | 'YOU' | '???' | 'PHONE';

export function say(speaker: Speaker, text: string, seconds?: number): void {
  const dur = seconds ?? Math.max(2.6, text.length * 0.065);
  G().pushSubtitle(speaker, text, dur);
  if (speaker === 'A-13') { Audio.sfx('ui'); Audio.speak(text, 'A13'); }
  else if (speaker === 'THE OBSERVER') Audio.speak(text, 'OBSERVER');
}

/** A sequence of lines with gaps, e.g. A-13's morning greeting. */
export function sayLines(lines: [Speaker, string, number?][], gap = 0.6): void {
  let t = 0;
  for (const [sp, text, dur] of lines) {
    const d = dur ?? Math.max(2.4, text.length * 0.065);
    later(t, () => say(sp, text, d));
    t += d + gap;
  }
}
