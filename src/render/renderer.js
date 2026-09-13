/* Canvas renderer — 1080x1920 design space, premium dark neon look.
   Everything heavy (background, arena floor) is pre-rendered once. */

import { DESIGN_W, DESIGN_H, ARENA, QUALITY } from '../config/defaults.js';
import { getSprite } from './sprites.js';
import { createParticles } from './particles.js';

const TAU = Math.PI * 2;

function makeBackground() {
  const cv = document.createElement('canvas');
  cv.width = DESIGN_W; cv.height = DESIGN_H;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(540, 900, 100, 540, 960, 1500);
  grad.addColorStop(0, '#0b1030');
  grad.addColorStop(0.55, '#060818');
  grad.addColorStop(1, '#02030a');
  g.fillStyle = grad;
  g.fillRect(0, 0, DESIGN_W, DESIGN_H);
  // starfield
  for (let i = 0; i < 130; i++) {
    const x = Math.random() * DESIGN_W;
    const y = Math.random() * DESIGN_H;
    const r = Math.random() * 1.6 + 0.3;
    g.globalAlpha = Math.random() * 0.35 + 0.05;
    g.fillStyle = Math.random() < 0.3 ? '#7fb8ff' : '#cdd8ff';
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
  // vignette
  const vg = g.createRadialGradient(540, 960, 700, 540, 960, 1350);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = vg;
  g.fillRect(0, 0, DESIGN_W, DESIGN_H);
  return cv;
}

function makeFloor(R) {
  const pad = 6;
  const size = (R + pad) * 2;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const c = size / 2;
  const grad = g.createRadialGradient(c, c * 0.92, R * 0.1, c, c, R);
  grad.addColorStop(0, 'rgba(38,48,96,0.5)');
  grad.addColorStop(0.7, 'rgba(16,20,48,0.42)');
  grad.addColorStop(1, 'rgba(8,10,28,0.5)');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(c, c, R, 0, TAU);
  g.fill();
  // concentric guide rings
  g.strokeStyle = 'rgba(120,150,255,0.07)';
  g.lineWidth = 2;
  for (const f of [0.25, 0.5, 0.75]) {
    g.beginPath();
    g.arc(c, c, R * f, 0, TAU);
    g.stroke();
  }
  // subtle radial ticks
  g.strokeStyle = 'rgba(120,150,255,0.05)';
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * TAU;
    g.beginPath();
    g.moveTo(c + Math.cos(a) * R * 0.92, c + Math.sin(a) * R * 0.92);
    g.lineTo(c + Math.cos(a) * R, c + Math.sin(a) * R);
    g.stroke();
  }
  // center dot
  g.fillStyle = 'rgba(140,170,255,0.14)';
  g.beginPath();
  g.arc(c, c, 7, 0, TAU);
  g.fill();
  return cv;
}

export function createRenderer({ canvas, settings, matchRef, imageMap, bus }) {
  const g = canvas.getContext('2d', { alpha: false });
  canvas.width = DESIGN_W;
  canvas.height = DESIGN_H;

  const bg = makeBackground();
  let floor = null;
  let floorR = -1;
  let quality = settings.get().quality;
  const particles = createParticles(quality);
  const ghosts = [];
  const stormRings = [];

  bus.on('eliminated', (e) => {
    const color = e.color || '#38b6ff';
    particles.burst(e.x, e.y, color, settings.get().particles ? 26 : 0);
    particles.ring(e.x, e.y, color);
    ghosts.push({ x: e.x, y: e.y, r: 18, t: 0, color, sprite: null });
    if (ghosts.length > 24) ghosts.shift();
  });
  bus.on('winner:show', () => {
    if (settings.get().particles) particles.confetti();
  });
  bus.on('fx:storm', ({ ang }) => {
    const m = matchRef.current;
    if (!m || !m.arena) return;
    stormRings.push({ a: ang, t: 0 });
    if (stormRings.length > 3) stormRings.shift();
  });

  function setQuality(key) {
    quality = key;
    particles.setQuality(key);
  }

  /** The closed (solid) arc segments between the gaps. */
function closedSegments(arena) {
  const gaps = [...arena.gaps].sort((a, b) => a.angle - b.angle);
  if (gaps.length <= 1) {
    const gp = gaps[0] || { angle: 0, halfRad: 0.1 };
    return [[gp.angle + gp.halfRad, gp.angle - gp.halfRad + TAU]];
  }
  const segs = [];
  for (let i = 0; i < gaps.length; i++) {
    const a = gaps[i];
    const b = gaps[(i + 1) % gaps.length];
    let start = a.angle + a.halfRad;
    let end = b.angle - b.halfRad;
    if (end <= start) end += TAU; // wraps around 2π
    segs.push([start, end]);
  }
  return segs;
}

function drawChevron(g, cx, cy, R, gapAngle, t, phase) {
    g.save();
    g.translate(cx, cy);
    g.rotate(gapAngle);
    for (let i = 0; i < 3; i++) {
      const off = ((t * 0.9 + phase + i / 3) % 1) * 90;
      const x = R + 26 + off;
      const a = 0.75 * (1 - off / 90);
      g.strokeStyle = `rgba(255,80,120,${a})`;
      g.lineWidth = 7;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x - 16, -18);
      g.lineTo(x + 8, 0);
      g.lineTo(x - 16, 18);
      g.stroke();
    }
    g.restore();
  }

  let t = 0;

  function frame(dt) {
    t += dt;
    const m = matchRef.current;
    g.drawImage(bg, 0, 0);
    if (!m || !m.arena) return;

    const { arena, balls } = m;
    const R = arena.R;
    if (floorR !== R) { floor = makeFloor(R); floorR = R; }
    g.drawImage(floor, arena.cx - floorR, arena.cy - floorR);

    const gl = QUALITY[quality].glowPasses;

    // exit wedges (danger zone beyond each gap)
    g.save();
    const wg = g.createRadialGradient(arena.cx, arena.cy, R * 0.85, arena.cx, arena.cy, R + 90);
    wg.addColorStop(0, 'rgba(255,61,113,0.0)');
    wg.addColorStop(0.55, 'rgba(255,61,113,0.10)');
    wg.addColorStop(1, 'rgba(255,61,113,0.22)');
    g.fillStyle = wg;
    for (const gp of arena.gaps) {
      g.beginPath();
      g.moveTo(arena.cx, arena.cy);
      g.arc(arena.cx, arena.cy, R + 90, gp.angle - gp.halfRad, gp.angle + gp.halfRad);
      g.closePath();
      g.fill();
    }
    g.restore();

    // boundary ring: solid everywhere EXCEPT the gaps (layered strokes = glow)
    const segs = closedSegments(arena);
    const passes = [
      { w: R * 0.055, style: 'rgba(56,182,255,0.10)' },
      { w: R * 0.022, style: 'rgba(56,182,255,0.35)' },
      { w: 3.5, style: 'rgba(190,235,255,0.95)' },
    ].slice(0, gl);
    for (const p of passes) {
      g.strokeStyle = p.style;
      g.lineWidth = p.w;
      g.lineCap = 'round';
      for (const [a0, a1] of segs) {
        g.beginPath();
        g.arc(arena.cx, arena.cy, R, a0, a1);
        g.stroke();
      }
    }
    // glowing edge caps (all gaps)
    for (const e of arena.gapEdgePoints()) {
      const cg = g.createRadialGradient(e.x, e.y, 1, e.x, e.y, 26);
      cg.addColorStop(0, 'rgba(200,240,255,0.95)');
      cg.addColorStop(0.4, 'rgba(56,182,255,0.5)');
      cg.addColorStop(1, 'rgba(56,182,255,0)');
      g.fillStyle = cg;
      g.beginPath();
      g.arc(e.x, e.y, 26, 0, TAU);
      g.fill();
    }
    // exit chevrons (one stream per gap)
    if (quality !== 'LOW') arena.gaps.forEach((gp, i) => drawChevron(g, arena.cx, arena.cy, R, gp.angle, t, i * 0.33));

    // storm wave
    for (let i = stormRings.length - 1; i >= 0; i--) {
      const s = stormRings[i];
      s.t += dt;
      if (s.t > 0.7) { stormRings.splice(i, 1); continue; }
      const rr = (s.t / 0.7) * R;
      g.strokeStyle = `rgba(140,170,255,${0.22 * (1 - s.t / 0.7)})`;
      g.lineWidth = 10;
      g.beginPath();
      g.arc(arena.cx, arena.cy, rr, 0, TAU);
      g.stroke();
    }

    // balls
    const alive = balls.filter((b) => !b.eliminated);
    const labels = QUALITY[quality].labels && alive.length <= 30;
    for (const b of alive) {
      const img = imageMap.get(b.c.id) || null;
      const spr = getSprite(b.c, img, b.r);
      const half = b.r;
      g.save();
      g.translate(b.x, b.y);
      g.rotate(b.angle);
      g.drawImage(spr, -half, -half, half * 2, half * 2);
      g.restore();
      if (labels) {
        g.font = '600 15px system-ui, "Segoe UI", Roboto, sans-serif';
        g.textAlign = 'center';
        g.fillStyle = 'rgba(230,240,255,0.9)';
        g.shadowColor = 'rgba(0,0,0,0.8)';
        g.shadowBlur = 4;
        const label = b.c.name.length > 16 ? b.c.name.slice(0, 15) + '…' : b.c.name;
        g.fillText(label, b.x, b.y + b.r + 19);
        g.shadowBlur = 0;
      }
    }

    // ghosts (fading eliminated tokens)
    for (let i = ghosts.length - 1; i >= 0; i--) {
      const gh = ghosts[i];
      gh.t += dt;
      if (gh.t > 0.45) { ghosts.splice(i, 1); continue; }
      const k = 1 - gh.t / 0.45;
      g.globalAlpha = k * 0.5;
      g.fillStyle = gh.color;
      g.beginPath();
      g.arc(gh.x, gh.y, gh.r * (1 + gh.t * 2), 0, TAU);
      g.fill();
      g.globalAlpha = 1;
    }

    particles.update(dt);
    particles.draw(g);
  }

  return { frame, setQuality, particles, canvas };
}
