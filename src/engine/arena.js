import { ARENA } from '../config/defaults.js';

const TAU = Math.PI * 2;

export function angDist(a, b) {
  let d = Math.abs(a - b) % TAU;
  return d > Math.PI ? TAU - d : d;
}

export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

/** Circular boundary with 1–4 open gaps (the elimination exits).
 *  Gaps are evenly distributed around the circumference with a random
 *  base offset (per match / per round / fixed — see gapPosition). */
export class Arena {
  constructor(settings, rng, { baseAngle = null } = {}) {
    const R = ARENA.radiusBySize[settings.arenaSize] || ARENA.radiusBySize.M;
    this.cx = ARENA.cx;
    this.cy = ARENA.cy;
    this.R = R;
    const gapDeg = clamp(Number(settings.gapSize) || 42, 14, 100);
    this.gapHalfRad = (gapDeg * Math.PI / 180) / 2;
    const n = clamp(Math.round(Number(settings.gapCount) || 1), 1, 4);
    this.gapCount = n;
    // FIXED anchors the first gap at the top (-90deg); RANDOM uses rng.
    const base = baseAngle != null ? baseAngle : (settings.gapPosition === 'FIXED' ? -Math.PI / 2 : rng.range(0, TAU));
    this.gaps = [];
    for (let i = 0; i < n; i++) {
      this.gaps.push({ angle: norm(base + (i * TAU) / n), halfRad: this.gapHalfRad });
    }
    this.gapRotSpeed = settings.gapRotate ? ((Number(settings.gapSpeed) || 6) * Math.PI / 180) * rng.sign() : 0;
  }

  /** The primary gap angle (kept for backwards-compat info/renders). */
  get gapAngle() { return this.gaps[0]?.angle ?? 0; }

  rotate(dt) {
    if (!this.gapRotSpeed || !this.gaps.length) return;
    for (const gp of this.gaps) gp.angle = norm(gp.angle + this.gapRotSpeed * dt);
  }

  angleAt(x, y) {
    return Math.atan2(y - this.cy, x - this.cx);
  }

  distFromCenter(x, y) {
    return Math.hypot(x - this.cx, y - this.cy);
  }

  isInGap(x, y) {
    const a = this.angleAt(x, y);
    for (const gp of this.gaps) {
      if (angDist(a, gp.angle) < gp.halfRad) return true;
    }
    return false;
  }

  /** All gap edge points (for rendering the glowing caps). */
  gapEdgePoints(margin = 0) {
    const pts = [];
    for (const gp of this.gaps) {
      const a1 = gp.angle - gp.halfRad;
      const a2 = gp.angle + gp.halfRad;
      pts.push({ x: this.cx + Math.cos(a1) * (this.R + margin), y: this.cy + Math.sin(a1) * (this.R + margin) });
      pts.push({ x: this.cx + Math.cos(a2) * (this.R + margin), y: this.cy + Math.sin(a2) * (this.R + margin) });
    }
    return pts;
  }
}

function norm(a) {
  a = a % TAU;
  return a < 0 ? a + TAU : a;
}
