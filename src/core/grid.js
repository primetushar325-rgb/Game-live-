/* Spatial hash grid for O(n) broad-phase ball collision.
   Hash collisions between cells are harmless (a few extra pair checks). */

export class SpatialGrid {
  constructor(cell) {
    this.cell = Math.max(8, cell);
    this.map = new Map();
  }
  _key(cx, cy) {
    return (cx * 73856093) ^ (cy * 19349663);
  }
  clear() { this.map.clear(); }
  insert(b) {
    const cx = Math.floor(b.x / this.cell);
    const cy = Math.floor(b.y / this.cell);
    const k = this._key(cx, cy);
    let arr = this.map.get(k);
    if (!arr) { arr = []; this.map.set(k, arr); }
    arr.push(b);
  }
  forPairs(fn) {
    for (const arr of this.map.values()) {
      const n = arr.length;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) fn(arr[i], arr[j]);
      }
    }
  }
}
