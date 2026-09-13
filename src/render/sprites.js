/* Contestant token sprites — pre-rendered offscreen (texture caching).
   One canvas per contestant+style; the per-frame cost is a single drawImage.
   Fallback chain (never a blank ball):
     1. image (user import / bundled flag) — cover or contain by aspect
     2. emoji (content glyphs like flags/platform marks)
     3. initials tile */

const TAU = Math.PI * 2;
const cache = new Map();
const MAX_CACHE = 800;

function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name || '?').slice(0, 3).toUpperCase();
}

export function getSprite(c, img, ballR) {
  const bucket = ballR < 19 ? 0 : ballR < 28 ? 1 : 2;
  const imgReady = img && img.complete && img.naturalWidth > 0 ? 1 : 0;
  // Include the source fingerprint: Content Manager may replace an image for
  // an existing contestant id, and a stale texture must never survive that edit.
  const imageKey = imgReady ? sourceFingerprint(img.currentSrc || img.src || '') : 'pending';
  const key = `${c.id}|${imgReady}|${imageKey}|${c.emoji || ''}|${c.color || ''}|${bucket}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = bucket === 0 ? 128 : bucket === 1 ? 128 : 160;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const cx = size / 2;

  // soft outer glow (category color)
  const ring = c.color || '#38b6ff';
  const halo = g.createRadialGradient(cx, cx, size * 0.4, cx, cx, size * 0.52);
  halo.addColorStop(0, hexA(ring, 0));
  halo.addColorStop(0.8, hexA(ring, 0.22));
  halo.addColorStop(1, hexA(ring, 0));
  g.fillStyle = halo;
  g.fillRect(0, 0, size, size);

  // disc
  const grad = g.createRadialGradient(cx, size * 0.38, size * 0.06, cx, cx, size * 0.5);
  grad.addColorStop(0, '#2a3158');
  grad.addColorStop(1, '#090c1e');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(cx, cx, size * 0.46, 0, TAU);
  g.fill();

  // content (circularly masked)
  g.save();
  g.beginPath();
  g.arc(cx, cx, size * 0.395, 0, TAU);
  g.clip();
  if (imgReady) {
    drawFitted(g, img, cx, cx, size * 0.79);
  } else if (c.emoji) {
    g.font = `${size * 0.52}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(c.emoji, cx, cx + size * 0.015);
  } else {
    // initials tile with subtle category-tinted backdrop
    const bg = g.createLinearGradient(0, cx - size * 0.3, 0, cx + size * 0.3);
    bg.addColorStop(0, hexA(ring, 0.28));
    bg.addColorStop(1, 'rgba(5,7,20,0.4)');
    g.fillStyle = bg;
    g.fillRect(0, 0, size, size);
    g.font = `800 ${size * 0.3}px system-ui, "Segoe UI", Roboto, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#f4f7ff';
    g.shadowColor = 'rgba(0,0,0,0.65)';
    g.shadowBlur = 5;
    g.fillText(initials(c.name), cx, cx + size * 0.02);
    g.shadowBlur = 0;
  }
  g.restore();

  // crisp ring border
  g.strokeStyle = ring;
  g.lineWidth = size * 0.045;
  g.shadowColor = ring;
  g.shadowBlur = size * 0.1;
  g.beginPath();
  g.arc(cx, cx, size * 0.455, 0, TAU);
  g.stroke();
  g.shadowBlur = 0;

  // inner keyline + shine
  g.strokeStyle = 'rgba(255,255,255,0.14)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(cx, cx, size * 0.385, 0, TAU);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.08)';
  g.beginPath();
  g.ellipse(cx, cx - size * 0.23, size * 0.28, size * 0.14, 0, 0, TAU);
  g.fill();

  cache.set(key, cv);
  if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
  return cv;
}

/** Draw an image centered in a box of `box` px: cover when nearly square,
 *  contain (no stretch, aspect preserved) for wide flags / tall portraits. */
function drawFitted(g, img, cx, cy, box) {
  const w = img.naturalWidth, h = img.naturalHeight;
  const ratio = w / h;
  let dw, dh;
  if (ratio >= 0.8 && ratio <= 1.25) {
    dw = dh = box; // cover (center square crop)
  } else if (ratio > 1.25) {
    dw = box; dh = box / ratio; // wide (flags): fit width
  } else {
    dh = box; dw = box * ratio; // tall: fit height
  }
  const sw = ratio > 1.25 ? w : ratio < 0.8 ? h * 1 : (ratio > 1.25 ? w : h);
  // source rect: for cover take the centered square
  let sx = 0, sy = 0, ss;
  if (ratio >= 0.8 && ratio <= 1.25) {
    ss = Math.min(w, h);
    sx = (w - ss) / 2; sy = (h - ss) / 2;
  } else {
    ss = 1; sx = 0; sy = 0;
  }
  void sw;
  g.drawImage(img, sx, sy, (ratio >= 0.8 && ratio <= 1.25) ? ss : w, (ratio >= 0.8 && ratio <= 1.25) ? ss : h,
    cx - dw / 2, cy - dh / 2, dw, dh);
}

function sourceFingerprint(source) {
  let h = 2166136261;
  for (let i = 0; i < source.length; i++) h = Math.imul(h ^ source.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

function hexA(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return `rgba(56,182,255,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function clearSpriteCache() {
  cache.clear();
}
