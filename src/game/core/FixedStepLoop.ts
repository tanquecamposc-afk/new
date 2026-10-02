/**
 * Acumulador de paso fijo: la física avanza siempre con el mismo dt
 * (determinista, preparado para servidor autoritativo) y el render
 * interpola entre los dos últimos estados con `alpha`.
 */
export class FixedStepAccumulator {
  private accumulator = 0;

  constructor(
    readonly step: number,
    private readonly maxSubSteps: number,
  ) {}

  /** Devuelve cuántos pasos fijos deben ejecutarse para `frameDt` segundos. */
  advance(frameDt: number): number {
    // Un frame enorme (pestaña en segundo plano) no debe provocar cientos de pasos.
    const clamped = Math.min(Math.max(frameDt, 0), this.step * this.maxSubSteps);
    this.accumulator += clamped;
    let steps = 0;
    // Épsilon: evita perder un paso por errores de coma flotante al restar.
    while (this.accumulator >= this.step - 1e-9 && steps < this.maxSubSteps) {
      this.accumulator = Math.max(0, this.accumulator - this.step);
      steps++;
    }
    if (steps === this.maxSubSteps) this.accumulator = Math.min(this.accumulator, this.step);
    return steps;
  }

  /** Fracción [0,1) del siguiente paso, para interpolar el render. */
  get alpha(): number {
    return this.accumulator / this.step;
  }

  reset(): void {
    this.accumulator = 0;
  }
}
