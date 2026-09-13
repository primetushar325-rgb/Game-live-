/* Background music: generative WebAudio loops per game state
   (NORMAL / SUSPENSE / FINAL / VICTORY / CTA), plus optional user-imported
   royalty-free tracks (stored in IndexedDB, played with crossfade).
   No copyrighted audio is bundled. */

import { audioCtx, muteState } from './audioManager.js';

/* Multiple generative variants per state (NORMAL 1-4, SUSPENSE 1-3,
   FINAL 1-3, VICTORY 1-3, CTA 1-2). All original, synthesized live.
   roots = 8-step bass line, arps = melodic pool, pads = chord sets. */
const B = {
  NORMAL: [
    { bpm: 96,  roots: [110, 110, 130.81, 130.81, 87.31, 87.31, 98, 98], arps: [440, 523.25, 587.33, 659.25, 880], pads: [[220, 261.63, 329.63], [174.61, 220, 261.63]], hat: 3 },
    { bpm: 104, roots: [146.83, 146.83, 174.61, 174.61, 130.81, 130.81, 164.81, 164.81], arps: [587.33, 698.46, 783.99, 880, 1046.5], pads: [[293.66, 349.23, 440], [261.63, 293.66, 392]], hat: 3 },
    { bpm: 88,  roots: [82.41, 82.41, 98, 98, 110, 110, 87.31, 87.31], arps: [329.63, 392, 440, 523.25, 659.25], pads: [[196, 246.94, 329.63], [174.61, 220, 261.63]], hat: 7 },
    { bpm: 110, roots: [130.81, 130.81, 164.81, 164.81, 174.61, 174.61, 146.83, 146.83], arps: [523.25, 659.25, 783.99, 880, 1046.5], pads: [[261.63, 329.63, 392], [246.94, 311.13, 392]], hat: 3 },
  ],
  SUSPENSE: [
    { bpm: 72,  roots: [36.71, 36.71, 36.71, 36.71, 39.2, 39.2, 36.71, 36.71], arps: [1568], pads: [[73.42, 98, 116.54]], hat: 7 },
    { bpm: 64,  roots: [32.7, 32.7, 34.65, 34.65, 32.7, 32.7, 29.63, 29.63], arps: [1318.5], pads: [[65.41, 98, 130.81]], hat: 7 },
    { bpm: 80,  roots: [36.71, 49, 36.71, 49, 43.65, 43.65, 36.71, 43.65], arps: [880, 1046.5], pads: [[73.42, 110, 146.83]], hat: 3 },
  ],
  FINAL: [
    { bpm: 132, roots: [110, 110, 82.41, 110, 110, 82.41, 110, 82.41], arps: [440, 523.25, 659.25, 880, 659.25, 523.25], pads: [[220, 261.63]], hat: 3 },
    { bpm: 144, roots: [123.47, 123.47, 146.83, 123.47, 123.47, 146.83, 110, 110], arps: [493.88, 587.33, 740, 987.77, 740, 587.33], pads: [[246.94, 293.66]], hat: 3 },
    { bpm: 120, roots: [82.41, 82.41, 110, 110, 87.31, 87.31, 116.54, 116.54], arps: [392, 466.16, 587.33, 783.99, 587.33, 466.16], pads: [[196, 246.94]], hat: 7 },
  ],
  VICTORY: [
    { bpm: 116, roots: [130.81, 98, 110, 130.81], arps: [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 1046.5, 1318.5], pads: [[261.63, 329.63, 392], [196, 246.94, 293.66], [220, 261.63, 329.63], [261.63, 329.63, 392]], hat: 3 },
    { bpm: 124, roots: [146.83, 110, 130.81, 146.83], arps: [587.33, 740, 880, 1174.66, 880, 740, 1174.66, 1479.98], pads: [[293.66, 369.99, 440], [220, 277.18, 329.63], [261.63, 329.63, 392], [293.66, 369.99, 440]], hat: 3 },
    { bpm: 108, roots: [110, 130.81, 98, 130.81], arps: [440, 523.25, 659.25, 880, 659.25, 523.25, 880, 1046.5], pads: [[220, 261.63, 329.63], [261.63, 329.63, 392], [196, 246.94, 293.66], [261.63, 329.63, 392]], hat: 7 },
  ],
  CTA: [
    { bpm: 90, roots: [220], arps: [523.25, 659.25], pads: [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]], hat: 0 },
    { bpm: 96, roots: [196], arps: [493.88, 587.33], pads: [[196, 246.94, 329.63], [220, 277.18, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66]], hat: 7 },
  ],
};

const A2 = 110, C3 = 130.81, E2 = 82.41, G2 = 98, F2 = 87.31, D2 = 73.42, D1 = 36.71;

function noteAt(c, { f, f1, t = 0.2, type = 'sine', g = 0.1, when, dest }) {
  if (!c) return;
  const t0 = Math.max(when, c.currentTime);
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f1 != null) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + t * 0.9);
  const gn = c.createGain();
  gn.gain.setValueAtTime(0.0001, t0);
  gn.gain.exponentialRampToValueAtTime(Math.max(0.0002, g), t0 + Math.min(0.04, t * 0.2));
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
  o.connect(gn).connect(dest);
  o.start(t0);
  o.stop(t0 + t + 0.06);
}

function padAt(c, freqs, t, g, when, dest) {
  if (!c) return;
  const t0 = Math.max(when, c.currentTime);
  const gn = c.createGain();
  gn.gain.setValueAtTime(0.0001, t0);
  gn.gain.exponentialRampToValueAtTime(g, t0 + Math.min(0.5, t * 0.3));
  gn.gain.setValueAtTime(g, t0 + t * 0.7);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
  gn.connect(dest);
  for (const f of freqs) {
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    o.detune.value = (Math.random() - 0.5) * 8;
    o.connect(gn);
    o.start(t0);
    o.stop(t0 + t + 0.06);
  }
}

function hatAt(c, when, dest) {
  if (!c) return;
  const t0 = Math.max(when, c.currentTime);
  const o = c.createOscillator();
  o.type = 'square';
  o.frequency.value = 6200;
  const gn = c.createGain();
  gn.gain.setValueAtTime(0.02, t0);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03);
  o.connect(gn).connect(dest);
  o.start(t0);
  o.stop(t0 + 0.05);
}

/* schedule one 16th-note step of the given generative state+variant */
function scheduleStep(st, v, step, when, c, out) {
  const s = step % 32;
  const spb = 60 / v.bpm / 4;
  if (st === 'NORMAL') {
    if (s % 2 === 0) noteAt(c, { f: v.roots[(s / 2) % 8], t: 0.16, type: 'sawtooth', g: 0.055, when, dest: out });
    if (s === 0) padAt(c, v.pads[0], spb * 15, 0.028, when, out);
    if (s === 16) padAt(c, v.pads[1] || v.pads[0], spb * 15, 0.028, when, out);
    if (s % 4 === 2) noteAt(c, { f: v.arps[(s >> 1) % v.arps.length], t: 0.09, type: 'sine', g: 0.05, when, dest: out });
    if (v.hat === 3 && s % 4 === 3) hatAt(c, when, out);
  } else if (st === 'SUSPENSE') {
    if (s % 4 === 0) noteAt(c, { f: v.roots[(s / 4) % 8], f1: Math.max(24, v.roots[(s / 4) % 8] * 0.7), t: 0.34, type: 'sine', g: 0.11, when, dest: out });
    if (s === 0) padAt(c, v.pads[0], spb * 10, 0.032, when, out);
    if (s % 8 === 6) noteAt(c, { f: v.arps[0], t: 0.22, type: 'sine', g: 0.02, when, dest: out });
    if (v.hat === 3 && s % 8 === 4) hatAt(c, when, out);
  } else if (st === 'FINAL') {
    if (s % 2 === 0) noteAt(c, { f: v.roots[(s / 2) % 8], t: 0.11, type: 'sawtooth', g: 0.05, when, dest: out });
    noteAt(c, { f: v.arps[s % v.arps.length], t: 0.07, type: 'square', g: 0.028, when, dest: out });
    if (v.hat === 3 && s % 4 === 2) hatAt(c, when, out);
    if (v.hat === 7 && s % 4 === 0) hatAt(c, when, out);
    if (s === 0) padAt(c, v.pads[0], spb * 30, 0.02, when, out);
  } else if (st === 'VICTORY') {
    if (s % 4 === 0) {
      noteAt(c, { f: v.roots[(s / 4) % 4] / 2, t: 0.2, type: 'triangle', g: 0.09, when, dest: out });
      padAt(c, v.pads[(s / 4) % 4], spb * 7, 0.026, when, out);
    }
    if (s % 2 === 0) noteAt(c, { f: v.arps[(s / 2) % v.arps.length], t: 0.1, type: 'triangle', g: 0.04, when, dest: out });
    if (v.hat === 3 && s % 4 === 2) hatAt(c, when, out);
    if (v.hat === 7 && s % 4 === 0) hatAt(c, when, out);
  } else if (st === 'CTA') {
    if (s === 0 || s === 16) padAt(c, v.pads[(s / 16) % 4], spb * 15, 0.03, when, out);
    if (s === 4 || s === 20) noteAt(c, { f: v.arps[0], t: 0.3, type: 'sine', g: 0.05, when, dest: out });
    if (s === 12 || s === 28) noteAt(c, { f: v.arps[1], t: 0.3, type: 'sine', g: 0.045, when, dest: out });
    if (v.hat === 7 && s % 8 === 4) hatAt(c, when, out);
  }
}

/* ---------- IndexedDB helper for custom tracks ---------- */
function idb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no idb'));
    const req = indexedDB.open('battleloop', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('tracks');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbAll(store = 'tracks') {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readonly');
    const rq = tx.objectStore(store).getAll();
    rq.onsuccess = () => res(rq.result || []);
    rq.onerror = () => rej(rq.error);
  });
}
async function idbPut(track) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction('tracks', 'readwrite');
    tx.objectStore('tracks').put(track);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}
async function idbDelete(id) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction('tracks', 'readwrite');
    tx.objectStore('tracks').delete(id);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}

export async function listCustomTracks() {
  try {
    const rows = await idbAll();
    return rows.map((r) => ({ id: r.id, state: r.state, name: r.name, type: r.type }));
  } catch { return []; }
}

export function createMusic(settings, bus) {
  let outGain = null;
  let timer = null;
  let step = 0;
  let nextT = 0;
  let state = 'OFF';
  let variant = 0;
  let lastVariant = {}; // state -> last used variant (avoid repeats)
  let buffers = new Map(); // state -> AudioBuffer
  let currentCustom = null; // {source, gain, state}
  let crossfade = null;

  function masterOut(c) {
    if (!outGain) {
      outGain = c.createGain();
      outGain.gain.value = 0;
      outGain.connect(c.destination);
    }
    return outGain;
  }
  function vol() {
    if (muteState.on) return 0;
    const s = settings.get();
    const master = (s.masterVolume ?? 90) / 100;
    return s.musicOn ? Math.pow(s.musicVolume / 100, 1.4) * 0.9 * master : 0;
  }
  function applyVol() {
    const c = audioCtx();
    if (c && outGain) outGain.gain.setTargetAtTime(vol(), c.currentTime, 0.1);
  }

  function tick() {
    const c = audioCtx();
    if (!c || !outGain) return;
    const variants = B[state];
    if (!variants) return;
    const cfg = variants[variant % variants.length];
    const spb = 60 / cfg.bpm / 4;
    while (nextT < c.currentTime + 0.14) {
      if (nextT > c.currentTime - 0.02) scheduleStep(state, cfg, step, nextT, c, outGain);
      step = (step + 1) % 32;
      nextT += spb;
    }
  }

  function stopGenerative(fade = 0.4) {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function startGenerative(st) {
    const c = audioCtx();
    if (!c) return;
    const variants = B[st];
    if (!variants) return;
    // pick a variant different from the last one used for this state
    const prev = lastVariant[st];
    let v;
    if (variants.length > 1) {
      do { v = Math.floor(Math.random() * variants.length); } while (v === prev);
    } else v = 0;
    lastVariant[st] = v;
    variant = v;
    state = st;
    step = 0;
    nextT = c.currentTime + 0.08;
    if (!timer) timer = setInterval(tick, 30);
  }

  /** short dip so state changes crossfade instead of cutting */
  function dip() {
    const c = audioCtx();
    if (!c || !outGain) return;
    const v = vol();
    outGain.gain.cancelScheduledValues(c.currentTime);
    outGain.gain.setTargetAtTime(Math.max(0.0002, v * 0.25), c.currentTime, 0.08);
    outGain.gain.setTargetAtTime(v, c.currentTime + 0.22, 0.12);
  }

  function stopCustom(fade = 0.4) {
    if (!currentCustom) return;
    const cc = currentCustom;
    currentCustom = null;
    try {
      const c = audioCtx();
      cc.gain.gain.setTargetAtTime(0.0001, c.currentTime, fade / 3);
      cc.source.stop(c.currentTime + fade + 0.2);
    } catch { /* ignore */ }
  }

  function startCustom(buf, st) {
    const c = audioCtx();
    if (!c || !buf) return;
    stopGenerative();
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = c.createGain();
    g.gain.value = 0.0001;
    g.gain.setTargetAtTime(vol(), c.currentTime, 0.25);
    src.connect(g).connect(masterOut(c));
    src.start();
    currentCustom = { source: src, gain: g, state: st };
    state = st;
  }

  function pickCustom(st) {
    const mode = settings.get().musicMode;
    const all = [...buffers.values()].map((b, i) => b);
    if (!buffers.size) return null;
    if (mode === 'RANDOM') {
      const list = [...buffers.entries()];
      return list[Math.floor(Math.random() * list.length)][1];
    }
    return buffers.get(st) || null;
  }

  function setMusicState(st) {
    const c = audioCtx();
    if (!c) return;
    masterOut(c);
    applyVol();
    if (st === 'OFF') {
      stopGenerative();
      stopCustom();
      state = 'OFF';
      return;
    }
    if (!B[st]) return;
    const custom = pickCustom(st);
    if (custom && (state === 'OFF' || currentCustom?.state !== st)) {
      if (currentCustom?.state !== st) stopCustom(0.3);
      if (!currentCustom) startCustom(custom, st);
      return;
    }
    stopCustom(0.3);
    if (state !== 'OFF') dip();
    startGenerative(st);
  }

  const offs = [
    bus.on('music:state', ({ state: st }) => {
      setMusicState(st);
    }),
    bus.on('match:start', () => applyVol()),
  ];

  async function addCustomTrack(stateKey, file) {
    const c = audioCtx();
    if (!c) throw new Error('audio unavailable');
    const ab = await file.arrayBuffer();
    const buf = await c.decodeAudioData(ab);
    const id = `t_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`;
    await idbPut({ id, state: stateKey, name: file.name, type: file.type, blob: file });
    buffers.set(stateKey, buf);
    setMusicState(state); // re-apply in case this state is active
    return { id, state: stateKey, name: file.name, type: file.type };
  }

  async function loadAllCustomTracks() {
    const rows = await listCustomTracks();
    const c = audioCtx();
    if (!c) return rows;
    for (const r of rows) {
      try {
        const ab = await r.blob.arrayBuffer();
        buffers.set(r.state, await c.decodeAudioData(ab));
      } catch { /* skip bad file */ }
    }
    return rows;
  }

  async function removeCustomTrack(id) {
    await idbDelete(id);
    for (const [k, v] of buffers) {
      const row = (await listCustomTracks()).find((r) => r.id === id);
      if (row && row.state === k) buffers.delete(k);
    }
    applyVol();
  }

  return {
    setMusicState,
    applyVol,
    addCustomTrack,
    removeCustomTrack,
    loadAllCustomTracks,
    buffers: () => [...buffers.keys()],
    destroy() {
      for (const off of offs) off();
      stopGenerative();
      stopCustom(0.1);
    },
  };
}
