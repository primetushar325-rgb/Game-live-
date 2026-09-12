/* Announcer — local SpeechSynthesis TTS (no online AI API). */

import { CTA_TEMPLATES } from '../data/ctas.js';

const ELIM_LINES = ['Eliminated!', 'Out of the arena!', 'Eliminated!', 'Gone through the gap!'];
const START_LINES = ['Get ready!', 'Get ready for the next battle!', 'Contestants in the arena!'];
const CTA_LINES = ["Don't forget to subscribe!", 'Like the live!', 'Follow for more battles!', 'See you in the next match!'];

export function createVoice(settings, bus) {
  let lastElim = 0;

  function speak(text, { urgent = false } = {}) {
    const s = settings.get();
    if (!s.voiceOn || !s.voiceVolume) return;
    if (typeof speechSynthesis === 'undefined') return;
    try {
      if (urgent) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = s.voiceRate;
      u.pitch = 1;
      u.volume = Math.min(1, s.voiceVolume / 100);
      const vs = speechSynthesis.getVoices();
      const v = vs.find((x) => /^en(-|_)?(US|GB)/i.test(x.lang)) || vs.find((x) => /^en/i.test(x.lang));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch { /* TTS unavailable — game continues silently */ }
  }

  const offs = [
    bus.on('match:start', (info) => {
      speak(START_LINES[Math.floor(Math.random() * START_LINES.length)]);
      if (info && info.category === 'countries') {
        setTimeout(() => speak(`${info.left} flags enter the arena!`), 1400);
      }
    }),
    bus.on('countdown', ({ n }) => speak(String(n), { urgent: true })),
    bus.on('match:go', () => speak('GO!', { urgent: true })),
    bus.on('eliminated', () => {
      const s = settings.get();
      if (!s.announceEliminations) return;
      const t = performance.now();
      if (t - lastElim < 2200) return;
      lastElim = t;
      speak(ELIM_LINES[Math.floor(Math.random() * ELIM_LINES.length)]);
    }),
    bus.on('final:two', () => speak('Final two!', { urgent: true })),
    bus.on('round:end', ({ isFinal, qualified }) => {
      if (!isFinal && qualified) speak(`${qualified.length} qualify!`);
    }),
    bus.on('winner:show', ({ winner }) => speak(`And we have a winner! ${winner?.name || ''}!`)),
    bus.on('cta:start', () => {
      setTimeout(() => speak(CTA_LINES[Math.floor(Math.random() * CTA_LINES.length)]), 600);
    }),
  ];

  return {
    speak,
    test() { speak('BattleLoop Live! Who will survive? Three, two, one — go!'); },
    destroy() { for (const off of offs) off(); try { speechSynthesis?.cancel(); } catch { /* noop */ } },
  };
}
