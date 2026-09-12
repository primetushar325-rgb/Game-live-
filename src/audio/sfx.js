/* Procedural sound effects — no audio files needed, fully offline.
   Multiple collision variations are randomly selected per hit. */

import { audioCtx, muteState } from './audioManager.js';

let master = null;
let noiseBuf = null;
let lastHit = 0;

function ensure() {
  const c = audioCtx();
  if (!c) return null;
  if (!master) {
    master = c.createGain();
    master.gain.value = 0.8;
    master.connect(c.destination);
    const len = Math.floor(c.sampleRate * 0.5);
    noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return c;
}

function tone({ f = 440, f1 = null, t = 0.15, type = 'sine', g = 0.3, delay = 0, curve = 2.5 }) {
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f1 != null) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + t);
  const gn = c.createGain();
  gn.gain.setValueAtTime(0.0001, t0);
  gn.gain.exponentialRampToValueAtTime(Math.max(0.0002, g), t0 + 0.008);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
  o.connect(gn).connect(master);
  o.start(t0);
  o.stop(t0 + t + 0.05);
}

function noise({ t = 0.08, freq = 900, q = 1, g = 0.25, delay = 0, type = 'bandpass' }) {
  const c = ensure();
  if (!c || !noiseBuf) return;
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const gn = c.createGain();
  gn.gain.setValueAtTime(g, t0);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
  src.connect(f).connect(gn).connect(master);
  src.start(t0, Math.random() * 0.2);
  src.stop(t0 + t + 0.05);
}

function vol(settings) {
  if (muteState.on) return 0;
  const s = settings.get();
  return s.sfxOn ? Math.pow(s.sfxVolume / 100, 1.4) : 0;
}

export function createSfx(settings) {
  return {
    collision(impact) {
      const v = vol(settings);
      if (!v) return;
      const t = performance.now();
      if (t - lastHit < 50) return; // throttle
      lastHit = t;
      const k = Math.min(1, impact / 500) * v;
      if (k < 0.02) return;
      const variant = Math.floor(Math.random() * 4);
      if (variant === 0) { noise({ t: 0.05, freq: 1900, q: 1.2, g: k * 0.5 }); tone({ f: 190, f1: 140, t: 0.06, g: k * 0.5 }); }
      else if (variant === 1) { tone({ f: 150, f1: 90, t: 0.09, type: 'triangle', g: k * 0.8 }); noise({ t: 0.04, freq: 600, g: k * 0.3 }); }
      else if (variant === 2) { tone({ f: 330, f1: 120, t: 0.07, type: 'square', g: k * 0.35 }); }
      else { tone({ f: 900, f1: 700, t: 0.035, type: 'triangle', g: k * 0.4 }); }
    },
    strong(impact) {
      const v = vol(settings);
      if (!v) return;
      const k = Math.min(1, impact / 700) * v;
      tone({ f: 95, f1: 55, t: 0.18, g: k * 0.9 });
      noise({ t: 0.12, freq: 300, q: 0.8, g: k * 0.5 });
    },
    wall(impact) {
      const v = vol(settings);
      if (!v) return;
      const k = Math.min(1, impact / 900) * v;
      if (k < 0.03) return;
      tone({ f: 110, f1: 70, t: 0.08, g: k * 0.4 });
    },
    eliminated() {
      const v = vol(settings);
      if (!v) return;
      tone({ f: 720, f1: 90, t: 0.32, type: 'sawtooth', g: 0.25 * v });
      noise({ t: 0.3, freq: 500, q: 0.7, g: 0.3 * v, type: 'lowpass' });
    },
    countdown(n) {
      const v = vol(settings);
      if (!v) return;
      if (n >= 1) tone({ f: 440, t: 0.14, g: 0.4 * v });
      else tone({ f: 880, t: 0.34, g: 0.5 * v });
    },
    roundStart() {
      const v = vol(settings);
      if (!v) return;
      [523.25, 659.25, 783.99].forEach((f, i) => tone({ f, t: 0.16, type: 'triangle', g: 0.35 * v, delay: i * 0.09 }));
    },
    final() {
      const v = vol(settings);
      if (!v) return;
      tone({ f: 82, f1: 55, t: 0.5, g: 0.5 * v });
      noise({ t: 0.4, freq: 250, g: 0.3 * v, type: 'lowpass' });
    },
    winner() {
      const v = vol(settings);
      if (!v) return;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone({ f, t: 0.28, type: 'triangle', g: 0.4 * v, delay: i * 0.13 }));
      [523.25, 659.25, 783.99].forEach((f) => tone({ f, t: 1.1, type: 'sine', g: 0.16 * v, delay: 0.52 }));
    },
    cta() {
      const v = vol(settings);
      if (!v) return;
      tone({ f: 1318.5, t: 0.4, type: 'sine', g: 0.25 * v });
      tone({ f: 1760, t: 0.5, type: 'sine', g: 0.18 * v, delay: 0.08 });
    },
  };
}
