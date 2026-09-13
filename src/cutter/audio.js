/* Procedural Cutter Road audio. All cues are synthesised with Web Audio;
 * there are no missing files or online/copyright dependencies. */

import { audioCtx, muteState } from '../audio/audioManager.js';

export function createCutterAudio(settings) {
  let output = null;
  let lastIdle = 0;
  let lastCut = 0;

  function volume() {
    const s = settings.get();
    if (muteState.on || !s.sfxOn) return 0;
    return Math.pow((s.sfxVolume || 0) / 100, 1.35) * ((s.masterVolume ?? 90) / 100);
  }
  function out(context) {
    if (!output) {
      output = context.createGain();
      output.connect(context.destination);
    }
    output.gain.value = volume();
    return output;
  }
  function tone({ f = 220, to = null, duration = 0.15, gain = 0.18, type = 'triangle', delay = 0 }) {
    const context = audioCtx();
    if (!context || !volume()) return;
    const t = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const amp = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, f), t);
    if (to != null) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + duration);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain * volume()), t + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    oscillator.connect(amp).connect(out(context));
    oscillator.start(t); oscillator.stop(t + duration + 0.04);
  }
  function hiss({ duration = 0.08, gain = 0.12, frequency = 1500, delay = 0 }) {
    const context = audioCtx();
    if (!context || !volume()) return;
    const buffer = context.createBuffer(1, Math.max(16, Math.floor(context.sampleRate * duration)), context.sampleRate);
    const bytes = buffer.getChannelData(0);
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.random() * 2 - 1;
    const source = context.createBufferSource(); const filter = context.createBiquadFilter(); const amp = context.createGain();
    filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = 0.9;
    const t = context.currentTime + delay;
    amp.gain.setValueAtTime(gain * volume(), t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    source.buffer = buffer; source.connect(filter).connect(amp).connect(out(context));
    source.start(t); source.stop(t + duration + 0.02);
  }
  function play(type, intensity = 1) {
    const now = performance.now();
    if (type === 'idle') {
      if (now - lastIdle < 520) return;
      lastIdle = now;
      tone({ f: 72 + intensity * 18, to: 63, duration: 0.25, gain: 0.045, type: 'sawtooth' });
      return;
    }
    if (['cut', 'food', 'wood', 'metal', 'plastic', 'treasure', 'future'].includes(type)) {
      if (now - lastCut < 45) return;
      lastCut = now;
    }
    switch (type) {
      case 'food': tone({ f: 260, to: 150, duration: .12, gain: .16 }); hiss({ duration: .06, gain: .05, frequency: 900 }); break;
      case 'wood': tone({ f: 160, to: 70, duration: .16, gain: .2, type: 'triangle' }); hiss({ duration: .1, gain: .11, frequency: 620 }); break;
      case 'metal': tone({ f: 1050, to: 390, duration: .14, gain: .16, type: 'square' }); hiss({ duration: .12, gain: .14, frequency: 3300 }); break;
      case 'plastic': tone({ f: 480, to: 180, duration: .1, gain: .13 }); hiss({ duration: .05, gain: .07, frequency: 1800 }); break;
      case 'treasure': tone({ f: 880, to: 1760, duration: .25, gain: .16 }); tone({ f: 1320, duration: .18, gain: .1, delay: .09 }); break;
      case 'future': tone({ f: 420, to: 1350, duration: .2, gain: .15, type: 'sine' }); hiss({ duration: .08, gain: .07, frequency: 4200 }); break;
      case 'heavy': tone({ f: 105, to: 45, duration: .34, gain: .28, type: 'sawtooth' }); hiss({ duration: .2, gain: .16, frequency: 420 }); break;
      case 'coin': tone({ f: 1180, to: 1760, duration: .15, gain: .12 }); break;
      case 'combo': tone({ f: 440 + intensity * 50, to: 780 + intensity * 55, duration: .16, gain: .12 }); break;
      case 'perfect': tone({ f: 980, duration: .12, gain: .14 }); tone({ f: 1470, duration: .18, gain: .1, delay: .06 }); break;
      case 'critical': tone({ f: 220, to: 1240, duration: .28, gain: .2, type: 'sawtooth' }); break;
      case 'super': tone({ f: 150, to: 900, duration: .5, gain: .22, type: 'sine' }); tone({ f: 900, to: 1700, duration: .36, gain: .16, delay: .1 }); break;
      case 'upgrade': tone({ f: 523, duration: .12, gain: .12 }); tone({ f: 659, duration: .12, gain: .12, delay: .1 }); tone({ f: 784, duration: .24, gain: .14, delay: .2 }); break;
      case 'start': tone({ f: 660, duration: .1, gain: .16 }); tone({ f: 880, duration: .22, gain: .18, delay: .1 }); break;
      case 'countdown': tone({ f: 460, duration: .12, gain: .13 }); break;
      case 'gameover': tone({ f: 300, to: 62, duration: .5, gain: .2, type: 'sawtooth' }); break;
      case 'button': tone({ f: 640, duration: .07, gain: .09 }); break;
      default: tone({ f: 300, to: 180, duration: .1, gain: .1 });
    }
  }
  return { play, applyVolume: () => { if (output) output.gain.value = volume(); }, destroy() { try { output?.disconnect(); } catch {} output = null; } };
}
