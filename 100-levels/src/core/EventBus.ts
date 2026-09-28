/** Minimal typed-ish event bus used by level logic and entities. */
type Handler = (data?: unknown) => void;

export class EventBus {
  private map = new Map<string, Set<Handler>>();

  on<T = unknown>(ev: string, fn: (data: T) => void): () => void {
    let set = this.map.get(ev);
    if (!set) {
      set = new Set();
      this.map.set(ev, set);
    }
    set.add(fn as Handler);
    return () => set!.delete(fn as Handler);
  }

  emit(ev: string, data?: unknown) {
    this.map.get(ev)?.forEach((fn) => fn(data));
  }

  clear() {
    this.map.clear();
  }
}
