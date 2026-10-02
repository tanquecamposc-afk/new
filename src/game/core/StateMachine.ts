/**
 * Máquina de estados genérica con tabla de transiciones explícita.
 * Las transiciones no permitidas se rechazan (devuelven false) en lugar de
 * dejar el sistema en un estado imposible.
 */
export class StateMachine<S extends string> {
  private current: S;
  private listeners = new Set<(from: S, to: S) => void>();

  constructor(
    initial: S,
    private readonly transitions: Readonly<Record<S, readonly S[]>>,
  ) {
    this.current = initial;
  }

  get state(): S {
    return this.current;
  }

  can(to: S): boolean {
    return this.transitions[this.current].includes(to);
  }

  transition(to: S): boolean {
    if (!this.can(to)) return false;
    const from = this.current;
    this.current = to;
    for (const l of this.listeners) l(from, to);
    return true;
  }

  /** Igual que transition pero lanza error: para transiciones que nunca deberían fallar. */
  force(to: S): void {
    if (!this.transition(to)) {
      throw new Error(`Transición inválida: ${this.current} → ${to}`);
    }
  }

  onChange(listener: (from: S, to: S) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
