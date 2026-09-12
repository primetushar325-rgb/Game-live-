/* Stream mode: keep screen awake, detect active screen-share, gesture exit. */

let lock = null;

export function enableWakeLock() {
  async function acquire() {
    try {
      if ('wakeLock' in navigator) lock = await navigator.wakeLock.request('screen');
    } catch { /* not supported — fine */ }
  }
  const onVis = () => { if (document.visibilityState === 'visible') acquire(); };
  document.addEventListener('visibilitychange', onVis);
  acquire();
  return () => {
    document.removeEventListener('visibilitychange', onVis);
    try { lock?.release(); } catch { /* ignore */ }
    lock = null;
  };
}

/** Best-effort: true when this page is being captured (screen sharing). */
export function detectStream() {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) return false;
    return navigator.mediaDevices
      .enumerateDevices()
      .then((ds) => ds.some((d) => (d.kind === 'audiooutput' && d.label) || d.label === 'Default - Screen Capture'))
      .catch(() => false);
  } catch { return false; }
}

/** Triple-tap detector in a screen region (used to unhide controls). */
export function tripleTap(el, onTriple, region = { x1: 0.7, y1: 0, x2: 1, y2: 0.18 }) {
  let taps = [];
  const h = (e) => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    if (px < region.x1 || px > region.x2 || py < region.y1 || py > region.y2) return;
    const now = performance.now();
    taps = taps.filter((t) => now - t < 1400);
    taps.push(now);
    if (taps.length >= 3) {
      taps = [];
      onTriple();
    }
  };
  el.addEventListener('pointerdown', h);
  return () => el.removeEventListener('pointerdown', h);
}
