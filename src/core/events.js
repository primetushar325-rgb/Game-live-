/* Minimal event bus — keeps the engine pure (no DOM/audio coupling). */

export class EventBus {
  constructor() {
    this.m = new Map();
  }
  on(ev, fn) {
    if (!this.m.has(ev)) this.m.set(ev, new Set());
    this.m.get(ev).add(fn);
    return () => this.off(ev, fn);
  }
  off(ev, fn) {
    const s = this.m.get(ev);
    if (s) s.delete(fn);
  }
  emit(ev, data) {
    const s = this.m.get(ev);
    if (!s) return;
    for (const fn of [...s]) fn(data);
  }
  listenerCount(ev) {
    return this.m.get(ev)?.size ?? 0;
  }
}
