/* Background music: generative WebAudio loops per game state
   (NORMAL / SUSPENSE / FINAL / VICTORY / CTA), plus optional user-imported
   royalty-free tracks (stored in IndexedDB, played with crossfade).
   No copyrighted audio is bundled. */

import { audioCtx, muteState } from './audioManager.js';

const B = {
  NORMAL:   { bpm: 96,  kind: 'normal' },
  SUSPENSE: { bpm: 72,  kind: 'suspense' },
  FINAL:    { bpm: 132, kind: 'final' },
  VICTORY:  { bpm: 116, kind: 'victory' },
  CTA:      { bpm: 90,  kind: 'cta' },
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

/* schedule one 16th-note step of the given generative state */
function scheduleStep(kind, step, when, c, out) {
  const s = step % 32;
  if (kind === 'normal') {
    const bassSeq = [A2, A2, A2, A2, C3, C3, C3, C3, F2, F2, F2, F2, E2, E2, G2, G2];
    if (s % 2 === 0) noteAt(c, { f: bassSeq[s / 2], t: 0.16, type: 'sawtooth', g: 0.055, when, dest: out });
    if (s === 0) padAt(c, [220, 261.63, 329.63], 2 * 60 / 96 / 4 * 15, 0.028, when, out);
    if (s === 16) padAt(c, [174.61, 220, 261.63], 2 * 60 / 96 / 4 * 15, 0.028, when, out);
    if (s % 4 === 2) {
      const pent = [440, 523.25, 587.33, 659.25, 880];
      noteAt(c, { f: pent[(s >> 1) % 5], t: 0.09, type: 'sine', g: 0.05, when, dest: out });
    }
    if (s % 4 === 3) hatAt(c, when, out);
  } else if (kind === 'suspense') {
    if (s % 4 === 0) noteAt(c, { f: D1, f1: 32, t: 0.32, type: 'sine', g: 0.11, when, dest: out });
    if (s === 0) padAt(c, [D2, G2, 233.08], 3 * 60 / 72 / 4 * 10, 0.03, when, out);
    if (s % 8 === 6) noteAt(c, { f: 1568, t: 0.22, type: 'sine', g: 0.02, when, dest: out });
  } else if (kind === 'final') {
    const bass16 = [A2, A2, E2, A2, A2, E2, A2, E2];
    if (s % 1 === 0 && s % 2 === 0) noteAt(c, { f: bass16[(s / 2) % 8], t: 0.11, type: 'sawtooth', g: 0.05, when, dest: out });
    const arp = [440, 523.25, 659.25, 880, 659.25, 523.25];
    noteAt(c, { f: arp[s % 6], t: 0.07, type: 'square', g: 0.028, when, dest: out });
    if (s % 4 === 2) hatAt(c, when, out);
    if (s === 0) padAt(c, [220, 261.63], 60 / 132 / 4 * 30, 0.02, when, out);
  } else if (kind === 'victory') {
    const chordByBar = [[261.63, 329.63, 392], [196, 246.94, 293.66], [220, 261.63, 329.63], [261.63, 329.63, 392]];
    if (s % 4 === 0) noteAt(c, { f: chordByBar[(s / 4) % 4][0] / 2, t: 0.2, type: 'triangle', g: 0.09, when, dest: out });
    if (s % 4 === 0) padAt(c, chordByBar[(s / 4) % 4], 60 / 116 / 4 * 7, 0.026, when, out);
    if (s % 2 === 0) {
      const up = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 1046.5, 1318.5];
      noteAt(c, { f: up[(s / 2) % 8], t: 0.1, type: 'triangle', g: 0.04, when, dest: out });
    }
    if (s % 4 === 2) hatAt(c, when, out);
  } else if (kind === 'cta') {
    const chord = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]];
    if (s === 0 || s === 16) padAt(c, chord[(s / 16) % 4], 60 / 90 / 4 * 15, 0.03, when, out);
    if (s === 4 || s === 20) noteAt(c, { f: 523.25, t: 0.3, type: 'sine', g: 0.05, when, dest: out });
    if (s === 12 || s === 28) noteAt(c, { f: 659.25, t: 0.3, type: 'sine', g: 0.045, when, dest: out });
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
    return s.musicOn ? Math.pow(s.musicVolume / 100, 1.4) * 0.9 : 0;
  }
  function applyVol() {
    const c = audioCtx();
    if (c && outGain) outGain.gain.setTargetAtTime(vol(), c.currentTime, 0.1);
  }

  function tick() {
    const c = audioCtx();
    if (!c || !outGain) return;
    const cfg = B[state];
    if (!cfg) return;
    const spb = 60 / cfg.bpm / 4;
    while (nextT < c.currentTime + 0.14) {
      if (nextT > c.currentTime - 0.02) scheduleStep(cfg.kind, step, nextT, c, outGain);
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
    state = st;
    step = 0;
    nextT = c.currentTime + 0.08;
    if (!timer) timer = setInterval(tick, 30);
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
