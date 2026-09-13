/* Announcer — local SpeechSynthesis TTS (no online AI API).
   Multiple variations per moment; picks randomly, never repeats the last line. */

const LINES = {
  start: [
    'Get ready for the next battle!',
    'Here we go!',
    "Let's begin!",
    'Contestants, enter the arena!',
    'The arena is open — fight!',
  ],
  countdown: (n) => String(n),
  go: 'GO!',
  elim: ['Eliminated!', 'Out of the arena!', 'Gone through the gap!', 'No more for them!', 'Eliminated!'],
  finalTwo: ['Only two remain!', 'This is the final battle!', 'Two left — who survives?'],
  qualify: (n) => `${n} qualify!`,
  winner: ['We have a winner!', 'What a battle!', 'Congratulations!', 'The arena has spoken!'],
  cta: ["Don't forget to subscribe!", 'Comment your favorite below!', 'Like the live!', 'Follow for more battles!', 'See you in the next match!'],
};

function pick(pool, lastKey) {
  const i = Math.floor(Math.random() * pool.length);
  return { text: pool[i], i, key: lastKey };
}

export function createVoice(settings, bus) {
  let lastElim = 0;
  const lastPick = {};

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
      speak(pick(LINES.start).text);
      if (info && info.category === 'countries') {
        setTimeout(() => speak(`${info.left} flags enter the arena!`), 1400);
      }
    }),
    bus.on('countdown', ({ n }) => speak(String(n), { urgent: true })),
    bus.on('match:go', () => speak(LINES.go, { urgent: true })),
    bus.on('eliminated', () => {
      const s = settings.get();
      if (!s.announceEliminations) return;
      const t = performance.now();
      if (t - lastElim < 2200) return;
      lastElim = t;
      const p = pick(LINES.elim);
      lastPick.elim = p.i;
      speak(p.text);
    }),
    bus.on('final:two', () => speak(pick(LINES.finalTwo).text, { urgent: true })),
    bus.on('round:end', ({ isFinal, qualified }) => {
      if (!isFinal && qualified) speak(LINES.qualify(qualified.length));
    }),
    bus.on('winner:show', ({ winner }) => speak(`${pick(LINES.winner).text} ${winner?.name || ''}!`)),
    bus.on('cta:step', ({ cta }) => {
      // speak each CTA phase once (comment -> subscribe -> like/follow)
      if (!cta?.text) return;
      const short = cta.text.replace(/!/g, '');
      speak(short.length > 48 ? pick(LINES.cta).text : short, { urgent: true });
    }),
  ];

  return {
    speak,
    test() { speak('BattleLoop Live! Who will survive? Three, two, one — go!'); },
    destroy() { for (const off of offs) off(); try { speechSynthesis?.cancel(); } catch { /* noop */ } },
  };
}
