import { PHYS } from '../config/defaults.js';

const TAU = Math.PI * 2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** Ball radius from contestant count + arena radius (keeps 195 tokens packable). */
export function ballRadius(count, R) {
  const r = R / Math.sqrt(1.35 * Math.max(2, count));
  return Math.round(Math.min(34, Math.max(11, r)));
}

/**
 * Phyllotaxis (sunflower) spawn: guarantees dense, non-overlapping start
 * positions with a little jitter, then random initial velocity per token.
 */
export function spawnBalls(pool, count, arena, ballR, settings, rng) {
  const balls = [];
  const R0 = arena.R - 2.8 * ballR;
  const sp = Math.max(0.1, Math.min(2, Number(settings.ballSpeed) || 1));
  const startSpeed = (PHYS.startSpeedBySpeed[settings.speed] || 240) * sp;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    const rad = R0 * Math.sqrt(t) * 0.94;
    const th = i * GOLDEN + rng.range(-0.045, 0.045);
    const va = rng.next() * TAU;
    const vs = startSpeed * rng.range(0.45, 1.0);
    balls.push({
      id: i,
      x: arena.cx + rad * Math.cos(th),
      y: arena.cy + rad * Math.sin(th),
      vx: Math.cos(va) * vs,
      vy: Math.sin(va) * vs,
      r: ballR,
      angle: rng.next() * TAU,
      spin: rng.range(-1.4, 1.4),
      c: pool[i],
      eliminated: false,
      lowT: 0,
    });
  }
  return balls;
}
