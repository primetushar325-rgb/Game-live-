/* Pure 2D physics: circle-circle impulses + circular boundary with exit gap.
   Deterministic for a given RNG stream (QA relies on this). No DOM/audio. */

import { PHYS } from '../config/defaults.js';
import { SpatialGrid } from '../core/grid.js';

const TAU = Math.PI * 2;

export function createPhys(settings, ballR, rng) {
  return {
    maxSpeed: PHYS.maxSpeedBySpeed[settings.speed] || 780,
    restitution: Math.max(0.6, Math.min(1, Number(settings.collision) || 0.95)),
    jitter: PHYS.jitter,
    ballR,
    grid: new SpatialGrid(ballR * 2),
    stormT: rng.range(PHYS.stormEvery[0], PHYS.stormEvery[1]),
  };
}

function collideBalls(a, b, phys, events) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const rr = a.r + b.r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= rr * rr || d2 === 0) return;
  const d = Math.sqrt(d2);
  const nx = dx / d;
  const ny = dy / d;
  const ma = a.r * a.r;
  const mb = b.r * b.r;
  const msum = ma + mb;

  // positional correction (prevents permanent overlap / sinking)
  const overlap = rr - d;
  const ca = overlap * (mb / msum) * 0.85;
  const cb = overlap * (ma / msum) * 0.85;
  a.x -= nx * ca; a.y -= ny * ca;
  b.x += nx * cb; b.y += ny * cb;

  // impulse
  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const rel = rvx * nx + rvy * ny;
  if (rel < 0) {
    const j = (-(1 + phys.restitution) * rel) / (1 / ma + 1 / mb);
    a.vx -= (j * nx) / ma; a.vy -= (j * ny) / ma;
    b.vx += (j * nx) / mb; b.vy += (j * ny) / mb;
    const impact = -rel;
    // spin from tangential slip
    const tvx = rvx - rel * nx;
    const tvy = rvy - rel * ny;
    const tv = Math.hypot(tvx, tvy);
    if (tv > 1) {
      a.spin += (tv / a.r) * 0.12;
      b.spin -= (tv / b.r) * 0.12;
    }
    if (events) events.onCollision?.(a, b, impact, (a.x + b.x) / 2, (a.y + b.y) / 2);
  }
}

/**
 * Circular wall with a single gap. Returns the ball if it fully exited
 * through the gap (elimination), else null. Never lets balls through the
 * closed sections (project + reflect), so escapes only happen via the gap.
 */
function resolveWall(b, arena, phys, events) {
  const dx = b.x - arena.cx;
  const dy = b.y - arena.cy;
  const d = Math.hypot(dx, dy);
  if (d < 1) return null;
  const inGap = events ? b._inGap ?? arena.isInGap(b.x, b.y) : arena.isInGap(b.x, b.y);
  if (!inGap) {
    const lim = arena.R - b.r;
    if (d > lim) {
      const nx = dx / d;
      const ny = dy / d;
      b.x = arena.cx + nx * lim;
      b.y = arena.cy + ny * lim;
      const vr = b.vx * nx + b.vy * ny;
      if (vr > 0) {
        const e = PHYS.wallRestitution;
        b.vx -= (1 + e) * vr * nx;
        b.vy -= (1 + e) * vr * ny;
        b.spin += ((-b.vy * nx + b.vx * ny) / arena.R) * 0.08;
        if (events) events.onWallHit?.(b, vr);
      }
    }
    return null;
  }
  // inside the gap: free to leave; eliminated once fully outside
  if (d > arena.R + b.r * 0.95) return b;
  return null;
}

/**
 * One fixed physics substep. Mutates balls in place.
 * events: { onCollision, onWallHit, onEliminate(b) } (all optional)
 */
export function stepSubstep(balls, arena, phys, dt, events, rng) {
  // --- storm: periodic random push keeps the arena alive (fair: affects all)
  phys.stormT -= dt;
  if (phys.stormT <= 0) {
    const ang = rng.next() * TAU;
    const mag = PHYS.stormImpulse * (0.7 + rng.next() * 0.6);
    const sx = Math.cos(ang) * mag;
    const sy = Math.sin(ang) * mag;
    for (const b of balls) {
      if (!b.eliminated) { b.vx += sx; b.vy += sy; }
    }
    events?.onStorm?.(ang);
    phys.stormT = rng.range(PHYS.stormEvery[0], PHYS.stormEvery[1]);
  }

  // --- jitter + integrate
  const ms = phys.maxSpeed;
  for (const b of balls) {
    if (b.eliminated) continue;
    const a = rng.next() * TAU;
    b.vx += Math.cos(a) * phys.jitter * dt;
    b.vy += Math.sin(a) * phys.jitter * dt;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > ms) {
      const k = ms / sp;
      b.vx *= k; b.vy *= k;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.angle += b.spin * dt;
    b.spin *= 0.995;
  }

  // --- ball-ball (spatial hash broad phase)
  const grid = phys.grid;
  grid.clear();
  for (const b of balls) if (!b.eliminated) grid.insert(b);
  grid.forPairs((a, b) => collideBalls(a, b, phys, events));

  // --- boundary / exit gap
  for (const b of balls) {
    if (b.eliminated) continue;
    const ex = resolveWall(b, arena, phys, events);
    if (ex) {
      b.eliminated = true;
      events?.onEliminate?.(b);
    }
  }
}

/** Average speed of live balls — used by the anti-stuck guard. */
export function avgSpeed(balls) {
  let n = 0, s = 0;
  for (const b of balls) {
    if (b.eliminated) continue;
    s += Math.hypot(b.vx, b.vy);
    n++;
  }
  return n ? s / n : 0;
}
