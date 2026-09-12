/* Seeded RNG (mulberry32) — deterministic per-match randomness. */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed) {
    this.seed = seed >>> 0;
    this._r = mulberry32(this.seed);
  }
  next() { return this._r(); }
  range(a, b) { return a + (b - a) * this._r(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(arr) { return arr[Math.floor(this._r() * arr.length)]; }
  sign() { return this._r() < 0.5 ? -1 : 1; }
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this._r() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
}

export function randomSeed() {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

/* Deterministic 32-bit hash for stable colors per name. */
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const PALETTE = [
  '#38b6ff', '#8b5cf6', '#ff3d71', '#22e584', '#ffcf4d',
  '#ff8a3d', '#22d3ee', '#f472b6', '#a3e635', '#f87171',
  '#60a5fa', '#c084fc', '#facc15', '#34d399', '#fb923c',
];

export function colorFor(name) {
  return PALETTE[hashStr(name) % PALETTE.length];
}
