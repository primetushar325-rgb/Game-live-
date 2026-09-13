/* Small reusable effect pool for Cutter Road impacts. Coordinates are in the
 * 1080×1920 design space; particles have no DOM nodes. A fixed pool prevents
 * burst-heavy mobile runs from continually allocating short-lived objects. */

export function createCutterParticles(limit = 150) {
  const active = [];
  const available = Array.from({ length: Math.max(1, limit) }, () => ({}));

  function burst(x, y, color, count = 10, kind = 'fragment') {
    for (let i = 0; i < count; i++) {
      const p = available.pop();
      if (!p) break;
      const angle = Math.random() * Math.PI * 2;
      const velocity = 90 + Math.random() * 250;
      p.x = x; p.y = y;
      p.vx = Math.cos(angle) * velocity;
      p.vy = Math.sin(angle) * velocity - 70;
      p.color = color;
      p.t = 0;
      p.life = .35 + Math.random() * .4;
      p.size = 3 + Math.random() * 7;
      p.kind = kind;
      active.push(p);
    }
  }

  function releaseAt(index) {
    const p = active[index];
    active[index] = active[active.length - 1];
    active.pop();
    available.push(p);
  }

  function update(dt) {
    for (let i = active.length - 1; i >= 0; i--) {
      const p = active[i];
      p.t += dt;
      if (p.t >= p.life) { releaseAt(i); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 430 * dt;
      p.vx *= .985;
    }
  }

  function draw(g) {
    for (const p of active) {
      const alpha = 1 - p.t / p.life;
      g.globalAlpha = alpha;
      g.fillStyle = p.color;
      if (p.kind === 'spark') {
        g.strokeStyle = p.color;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.lineTo(p.x - p.vx * .035, p.y - p.vy * .035);
        g.stroke();
      } else {
        g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    g.globalAlpha = 1;
  }

  function clear() {
    while (active.length) available.push(active.pop());
  }

  return {
    burst,
    update,
    draw,
    clear,
    get size() { return active.length; },
    get capacity() { return limit; },
  };
}
