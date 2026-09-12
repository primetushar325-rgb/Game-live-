import { ARENA } from '../config/defaults.js';

const TAU = Math.PI * 2;

export function angDist(a, b) {
  let d = Math.abs(a - b) % TAU;
  return d > Math.PI ? TAU - d : d;
}

export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

/** Circular boundary with ONE open gap (the elimination exit). */
export class Arena {
  constructor(settings, rng) {
    const R = ARENA.radiusBySize[settings.arenaSize] || ARENA.radiusBySize.M;
    this.cx = ARENA.cx;
    this.cy = ARENA.cy;
    this.R = R;
    const gapDeg = clamp(Number(settings.gapSize) || 42, 14, 100);
    this.gapHalfRad = (gapDeg * Math.PI / 180) / 2;
    this.gapAngle = rng.range(0, TAU);
    this.gapRotSpeed = settings.gapRotate ? ((Number(settings.gapSpeed) || 6) * Math.PI / 180) * rng.sign() : 0;
  }
  rotate(dt) {
    if (!this.gapRotSpeed) return;
    this.gapAngle = (this.gapAngle + this.gapRotSpeed * dt) % TAU;
    if (this.gapAngle < 0) this.gapAngle += TAU;
  }
  angleAt(x, y) {
    return Math.atan2(y - this.cy, x - this.cx);
  }
  distFromCenter(x, y) {
    return Math.hypot(x - this.cx, y - this.cy);
  }
  isInGap(x, y) {
    const d = this.distFromCenter(x, y);
    if (d < 1) return false;
    return angDist(this.angleAt(x, y), this.gapAngle) < this.gapHalfRad;
  }
  gapEdgePoints(margin = 0) {
    const a1 = this.gapAngle - this.gapHalfRad;
    const a2 = this.gapAngle + this.gapHalfRad;
    return [
      { x: this.cx + Math.cos(a1) * (this.R + margin), y: this.cy + Math.sin(a1) * (this.R + margin) },
      { x: this.cx + Math.cos(a2) * (this.R + margin), y: this.cy + Math.sin(a2) * (this.R + margin) },
    ];
  }
}
