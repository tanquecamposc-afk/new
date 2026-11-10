/**
 * Fixed-timestep accumulator. Rendering runs at whatever rate the display gives us; the
 * simulation only ever advances in whole ticks of `dt`, so results do not depend on FPS.
 */
export interface StepPlan {
  /** Whole simulation ticks to run now. */
  steps: number;
  /** 0..1 position between the previous and the current tick, for visual interpolation. */
  alpha: number;
  /** Seconds discarded because the frame took too long (the game slows down instead of spiralling). */
  droppedSeconds: number;
}

export class FixedStepper {
  private accumulator = 0;
  private readonly plan: StepPlan = { steps: 0, alpha: 0, droppedSeconds: 0 };

  constructor(
    readonly dt: number,
    readonly maxStepsPerFrame = 5,
    /** Longest frame that is honoured; anything longer (tab in background) is clamped. */
    readonly maxFrameSeconds = 0.25,
  ) {
    if (!(dt > 0)) throw new Error('dt must be positive');
    if (!(maxStepsPerFrame >= 1)) throw new Error('maxStepsPerFrame must be at least 1');
  }

  /** Feeds elapsed real time and returns how many ticks to simulate. The returned object is reused. */
  advance(frameSeconds: number): StepPlan {
    const plan = this.plan;
    let frame = Number.isFinite(frameSeconds) && frameSeconds > 0 ? frameSeconds : 0;
    let dropped = 0;
    if (frame > this.maxFrameSeconds) {
      dropped += frame - this.maxFrameSeconds;
      frame = this.maxFrameSeconds;
    }
    this.accumulator += frame;
    // The small epsilon stops 59.999 ticks worth of time from rounding down to 59.
    let steps = Math.floor(this.accumulator / this.dt + 1e-9);
    if (steps > this.maxStepsPerFrame) {
      dropped += (steps - this.maxStepsPerFrame) * this.dt;
      this.accumulator -= (steps - this.maxStepsPerFrame) * this.dt;
      steps = this.maxStepsPerFrame;
    }
    this.accumulator -= steps * this.dt;
    if (this.accumulator < 0) this.accumulator = 0;
    plan.steps = steps;
    plan.alpha = Math.min(1, this.accumulator / this.dt);
    plan.droppedSeconds = dropped;
    return plan;
  }

  reset(): void {
    this.accumulator = 0;
  }
}
