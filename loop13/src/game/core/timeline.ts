/** Tiny real-time sequencer for scripted sequences (reset, death, cutscenes, endings). */
interface Step { at: number; fn: () => void; }

export class Timeline {
  private steps: Step[] = [];
  private t = 0;
  private running = false;
  onUpdate: ((t: number) => void) | null = null;

  start(steps: Step[], onUpdate?: (t: number) => void): this {
    this.steps = steps.slice().sort((a, b) => a.at - b.at);
    this.t = 0;
    this.running = true;
    this.onUpdate = onUpdate ?? null;
    return this;
  }
  stop(): void { this.running = false; this.steps = []; this.onUpdate = null; }
  get active(): boolean { return this.running; }
  get time(): number { return this.t; }

  update(dt: number): void {
    if (!this.running) return;
    this.t += dt;
    this.onUpdate?.(this.t);
    while (this.steps.length && this.steps[0].at <= this.t) {
      const s = this.steps.shift()!;
      s.fn();
    }
    if (!this.steps.length && !this.onUpdate) this.running = false;
  }
}

/** Shared timeline for major sequences (only one at a time). */
export const sequence = new Timeline();
/** Second channel for non-blocking scripted beats (A-13 lines, small events). */
export const beats = new Timeline();

const pending: { at: number; fn: () => void }[] = [];
let clock = 0;
/** Schedule a callback in real seconds (game-loop driven, pauses with the game). */
export function later(seconds: number, fn: () => void): void { pending.push({ at: clock + seconds, fn }); }
export function tickLater(dt: number): void {
  clock += dt;
  for (let i = pending.length - 1; i >= 0; i--) {
    if (pending[i].at <= clock) { const p = pending.splice(i, 1)[0]; p.fn(); }
  }
}
export function clearLater(): void { pending.length = 0; }
