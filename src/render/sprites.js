/* Contestant token sprites — pre-rendered offscreen (texture caching).
   One canvas per contestant+style; the per-frame cost is a single drawImage. */

const TAU = Math.PI * 2;
const cache = new Map();
const MAX_CACHE = 600;

function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name || '?').slice(0, 3).toUpperCase();
}

export function getSprite(c, img, ballR) {
  const bucket = ballR < 19 ? 0 : ballR < 28 ? 1 : 2;
  const key = `${c.id}|${img ? 1 : 0}|${c.emoji || ''}|${c.color || ''}|${bucket}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = bucket === 0 ? 128 : bucket === 1 ? 128 : 160;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const cx = size / 2;

  // disc
  const grad = g.createRadialGradient(cx, size * 0.4, size * 0.08, cx, cx, size * 0.5);
  grad.addColorStop(0, '#252d55');
  grad.addColorStop(1, '#0a0d20');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(cx, cx, size * 0.48, 0, TAU);
  g.fill();

  // ring
  const ring = c.color || '#38b6ff';
  g.strokeStyle = ring;
  g.lineWidth = size * 0.042;
  g.shadowColor = ring;
  g.shadowBlur = size * 0.12;
  g.beginPath();
  g.arc(cx, cx, size * 0.452, 0, TAU);
  g.stroke();
  g.shadowBlur = 0;

  // content
  g.save();
  g.beginPath();
  g.arc(cx, cx, size * 0.375, 0, TAU);
  g.clip();
  if (img && img.complete && img.naturalWidth > 0) {
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    const dw = size * 0.75;
    g.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, cx - dw / 2, cx - dw / 2, dw, dw);
  } else if (c.emoji) {
    g.font = `${size * 0.5}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(c.emoji, cx, cx + size * 0.015);
  } else {
    g.font = `800 ${size * 0.3}px system-ui, "Segoe UI", Roboto, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#f4f7ff';
    g.shadowColor = 'rgba(0,0,0,0.6)';
    g.shadowBlur = 4;
    g.fillText(initials(c.name), cx, cx + size * 0.02);
    g.shadowBlur = 0;
  }
  g.restore();

  // shine
  g.fillStyle = 'rgba(255,255,255,0.07)';
  g.beginPath();
  g.ellipse(cx, cx - size * 0.22, size * 0.3, size * 0.16, 0, 0, TAU);
  g.fill();

  cache.set(key, cv);
  if (cache.size > MAX_CACHE) {
    const first = cache.keys().next().value;
    cache.delete(first);
  }
  return cv;
}

export function clearSpriteCache() {
  cache.clear();
}
