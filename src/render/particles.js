/* Pooled particle system: sparks, expanding rings, confetti. */

import { Pool } from '../core/pool.js';
import { QUALITY } from '../config/defaults.js';

const TAU = Math.PI * 2;

export function createParticles(qualityKey) {
  let q = QUALITY[qualityKey] || QUALITY.HIGH;
  const pool = new Pool(
    () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 4, color: '#fff', type: 0, rot: 0, vr: 0 }),
    (p) => { p.life = 0; p.type = 0; },
    q.particles + 50
  );

  function spawn(type, x, y, color, n) {
    for (let i = 0; i < n; i++) {
      if (pool.count >= q.particles) break;
      const p = pool.spawn();
      p.type = type;
      p.x = x; p.y = y;
      const a = Math.random() * TAU;
      if (type === 0) { // spark
        const sp = 60 + Math.random() * 260;
        p.vx = Math.cos(a) * sp;
        p.vy = Math.sin(a) * sp;
        p.max = p.life = 0.35 + Math.random() * 0.4;
        p.size = 2.5 + Math.random() * 4;
        p.color = color;
      } else if (type === 1) { // ring
        p.max = p.life = 0.5;
        p.size = 10;
        p.color = color;
        p.vx = 0; p.vy = 0;
      } else { // confetti
        p.x = x + (Math.random() - 0.5) * 700;
        p.y = y - 200 - Math.random() * 400;
        p.vx = (Math.random() - 0.5) * 120;
        p.vy = 60 + Math.random() * 120;
        p.max = p.life = 2.2 + Math.random() * 1.6;
        p.size = 6 + Math.random() * 7;
        p.color = color;
        p.rot = Math.random() * TAU;
        p.vr = (Math.random() - 0.5) * 8;
      }
    }
  }

  function update(dt) {
    pool.releaseWhere((p) => {
      p.life -= dt;
      if (p.life <= 0) return true;
      if (p.type === 0) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.92; p.vy *= 0.92;
      } else if (p.type === 1) {
        p.size += 520 * dt;
      } else {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += 160 * dt;
        p.rot += p.vr * dt;
      }
      return false;
    });
  }

  function draw(g) {
    g.save();
    for (const p of pool.active) {
      const k = p.life / p.max;
      if (p.type === 0) {
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = k;
        g.fillStyle = p.color;
        g.beginPath();
        g.arc(p.x, p.y, p.size * (0.5 + k * 0.5), 0, TAU);
        g.fill();
      } else if (p.type === 1) {
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = k * 0.8;
        g.strokeStyle = p.color;
        g.lineWidth = 3 + 6 * k;
        g.beginPath();
        g.arc(p.x, p.y, p.size, 0, TAU);
        g.stroke();
      } else {
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = Math.min(1, k * 2);
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.fillStyle = p.color;
        g.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        g.restore();
      }
    }
    g.restore();
  }

  return {
    burst(x, y, color, n = 24) { spawn(0, x, y, color, Math.min(n, q.sparkBurst || 20)); },
    ring(x, y, color) { spawn(1, x, y, color, 1); },
    confetti(colors) {
      const cs = colors || ['#38b6ff', '#8b5cf6', '#ff3d71', '#ffcf4d', '#22e584'];
      for (let i = 0; i < 90; i++) spawn(2, 540, 620, cs[i % cs.length], 1);
    },
    update,
    draw,
    setQuality(key) { q = QUALITY[key] || QUALITY.HIGH; },
    get count() { return pool.count; },
  };
}
