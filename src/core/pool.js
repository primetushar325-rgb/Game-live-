/* Generic object pool — avoids per-frame allocation for particles etc. */

export class Pool {
  constructor(factory, reset, cap = 1000) {
    this.factory = factory;
    this.reset = reset;
    this.cap = cap;
    this.items = [];
    this.active = [];
  }
  spawn() {
    const it = this.items.pop() || this.factory();
    it._pooled = true;
    this.active.push(it);
    return it;
  }
  release(it) {
    const i = this.active.indexOf(it);
    if (i === -1) return;
    this.active.splice(i, 1);
    if (this.items.length < this.cap) {
      this.reset(it);
      this.items.push(it);
    }
  }
  releaseWhere(pred) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      if (pred(this.active[i])) {
        this.items.push(this.active.splice(i, 1)[0]);
        this.reset(this.items[this.items.length - 1]);
      }
    }
  }
  clear() {
    while (this.active.length) this.release(this.active[this.active.length - 1]);
  }
  get count() { return this.active.length; }
}
