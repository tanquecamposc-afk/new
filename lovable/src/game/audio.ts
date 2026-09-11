/** Sonido sintetizado con WebAudio: sin archivos, sin descargas, sin licencias. */
import type { SoundName } from "./types";

type Tone = { freq: number; dur: number; type: OscillatorType; vol: number };

const TONES: Record<SoundName, Tone> = {
  mine: { freq: 160, dur: 0.05, type: "square", vol: 0.03 },
  break: { freq: 150, dur: 0.06, type: "square", vol: 0.04 },
  chest: { freq: 523, dur: 0.16, type: "triangle", vol: 0.05 },
  chestRare: { freq: 1046, dur: 0.18, type: "triangle", vol: 0.06 },
  hit: { freq: 240, dur: 0.07, type: "square", vol: 0.05 },
  hurt: { freq: 180, dur: 0.12, type: "sawtooth", vol: 0.05 },
  place: { freq: 300, dur: 0.06, type: "square", vol: 0.04 },
  eat: { freq: 520, dur: 0.1, type: "sine", vol: 0.05 },
  upgrade: { freq: 700, dur: 0.16, type: "triangle", vol: 0.06 },
  phase: { freq: 660, dur: 0.2, type: "triangle", vol: 0.06 },
  die: { freq: 110, dur: 0.4, type: "sawtooth", vol: 0.06 },
  win: { freq: 1046, dur: 0.5, type: "triangle", vol: 0.07 },
  dragon: { freq: 90, dur: 0.6, type: "sawtooth", vol: 0.07 },
};

let context: AudioContext | null = null;

export function playSound(name: SoundName, enabled: boolean): void {
  if (!enabled) return;
  try {
    context = context ?? new AudioContext();
    const tone = TONES[name];
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = tone.type;
    osc.frequency.value = tone.freq;
    gain.gain.value = tone.vol;
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + tone.dur);
    osc.stop(context.currentTime + tone.dur);
  } catch {
    // Sin audio disponible: el juego sigue igual.
  }
}
