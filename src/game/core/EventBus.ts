type Handler<T> = (payload: T) => void;

/** Bus de eventos tipado y síncrono. Desacopla simulación, render, audio y UI. */
export class EventBus<Events extends object> {
  private handlers = new Map<keyof Events, Set<Handler<never>>>();

  on<K extends keyof Events>(name: K, handler: Handler<Events[K]>): () => void {
    let set = this.handlers.get(name);
    if (!set) {
      set = new Set();
      this.handlers.set(name, set);
    }
    set.add(handler as Handler<never>);
    return () => this.off(name, handler);
  }

  off<K extends keyof Events>(name: K, handler: Handler<Events[K]>): void {
    this.handlers.get(name)?.delete(handler as Handler<never>);
  }

  emit<K extends keyof Events>(name: K, payload: Events[K]): void {
    const set = this.handlers.get(name);
    if (!set) return;
    for (const h of [...set]) (h as Handler<Events[K]>)(payload);
  }

  clear(): void {
    this.handlers.clear();
  }
}
