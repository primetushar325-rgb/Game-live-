/* Match History + Test Mode screens. */

import { fmtTime } from '../audio/audioManager.js';
import { CTA_TEMPLATES } from '../data/ctas.js';
import { M } from '../engine/match.js';

export function renderHistory(app) {
  app.clearRoot();
  const { root, history } = app;
  const el = document.createElement('div');
  el.className = 'screen history';
  const items = history.list();
  el.innerHTML = `
    <div class="s-head"><button class="btn ghost back" id="hBack">←</button><h1>MATCH HISTORY</h1><span></span></div>
    <div class="s-scroll">
      ${items.length ? '' : '<div class="c-empty">No matches yet — run a battle first!</div>'}
      ${items.map((h) => `
        <div class="hrow">
          <div class="h-main">
            <div class="h-id">MATCH #${h.id}</div>
            <div class="h-title">${esc(h.title || h.category)}${h.rounds > 1 ? ` • ${h.rounds} ROUNDS` : ''}</div>
          </div>
          <div class="h-win">${h.winner ? `${h.winner.emoji ? h.winner.emoji + ' ' : ''}<b>${esc(h.winner.name)}</b>` : '—'}</div>
          <div class="h-meta">${h.count} players • ${fmtTime(h.duration)} • ${new Date(h.date).toLocaleDateString()}</div>
        </div>`).join('')}
      <div class="s-reset"><button class="btn ghost danger" id="hClear">CLEAR HISTORY</button></div>
    </div>`;
  root.appendChild(el);
  el.querySelector('#hBack').addEventListener('click', () => app.navigate('home'));
  el.querySelector('#hClear').addEventListener('click', () => {
    history.clear();
    app.toast('History cleared');
    renderHistory(app);
  });
}

export function renderTest(app) {
  app.clearRoot();
  const { root, match, bus, toast } = app;
  if (app._testTimer) { clearInterval(app._testTimer); app._testTimer = null; }
  const el = document.createElement('div');
  el.className = 'screen test';
  el.innerHTML = `
    <div class="s-head"><button class="btn ghost back" id="tBack">←</button><h1>TEST MODE</h1><span></span></div>
    <div class="s-scroll">
      <div class="t-status" id="tStatus"></div>
      <div class="t-grid">
        <button class="tbtn" data-t="spawn10">SPAWN 10 BALLS</button>
        <button class="tbtn" data-t="spawn20">SPAWN 20 BALLS</button>
        <button class="tbtn" data-t="spawn50">SPAWN 50 BALLS</button>
        <button class="tbtn" data-t="spawn100">SPAWN 100 BALLS</button>
        <button class="tbtn" data-t="elim">FORCE ELIMINATION</button>
        <button class="tbtn" data-t="winner">FORCE WINNER</button>
        <button class="tbtn" data-t="countdown">TEST COUNTDOWN</button>
        <button class="tbtn" data-t="cta">TEST CTA</button>
        <button class="tbtn" data-t="voice">TEST VOICE</button>
        <button class="tbtn" data-t="music">TEST MUSIC</button>
        <button class="tbtn" data-t="coll">TEST COLLISION SOUND</button>
        <button class="tbtn" data-t="next">TEST NEXT MATCH</button>
        <button class="tbtn hot" data-t="loop">TEST AUTO LOOP (5 MATCHES)</button>
      </div>
      <div class="m-note">Physics tests run headless via: npm run qa — 55+ auto matches, invariants, leak checks.</div>
    </div>`;
  root.appendChild(el);
  el.querySelector('#tBack').addEventListener('click', () => app.navigate('home'));

  function status() {
    const st = el.querySelector('#tStatus');
    const m = match;
    st.innerHTML = m.cfg
      ? `STATE: <b>${m.state.toUpperCase()}</b> • ${m.cfg.category.toUpperCase()} • ${m.left} LEFT / TARGET ${m.target} • ROUND ${m.roundIndex + 1}/${m.rounds.length} • SEED ${m.cfg.seed}`
      : 'STATE: IDLE (no active match)';
  }
  status();
  app._testTimer = setInterval(status, 500);

  el.querySelectorAll('.tbtn').forEach((b) => {
    b.addEventListener('click', () => {
      const t = b.dataset.t;
      const running = match.isRunning();
      switch (t) {
        case 'spawn10': case 'spawn20': case 'spawn50': case 'spawn100': {
          const n = Number(t.slice(5));
          match.abandon();
          app.startBattle({ category: 'countries', count: n, preset: 'SINGLE', autoLive: false });
          toast(`Spawned ${n} balls — watch the arena`);
          break;
        }
        case 'elim':
          if (!running || match.state !== M.BATTLE) { toast('Start a match first (SPAWN n BALLS)'); break; }
          match.forceEliminate();
          toast('Forced elimination');
          break;
        case 'winner':
          if (!running) { toast('Start a match first'); break; }
          match.forceWinner();
          toast('Winner forced');
          break;
        case 'countdown':
          [3, 2, 1].forEach((n, i) => setTimeout(() => bus.emit('countdown', { n }), i * 900));
          setTimeout(() => bus.emit('match:go', {}), 2700);
          toast('Countdown playing');
          break;
        case 'cta': {
          const cta = CTA_TEMPLATES[Math.floor(Math.random() * CTA_TEMPLATES.length)];
          bus.emit('cta:start', { cta, t: 5 });
          toast('CTA test (state must be CTA to persist — shown briefly)');
          break;
        }
        case 'voice':
          app.voice.speak('BattleLoop Live! This is a voice test. Get ready!');
          toast('Voice test — if silent, enable device TTS');
          break;
        case 'music':
          ['NORMAL', 'SUSPENSE', 'FINAL', 'VICTORY', 'CTA'].forEach((st, i) => {
            setTimeout(() => { app.music.setMusicState(st); toast(`Music: ${st}`); }, i * 2500);
          });
          toast('Music cycle started (5 states × 2.5s)');
          break;
        case 'coll':
          bus.emit('sfx:collision', { impact: 260, x: 0, y: 0 });
          setTimeout(() => bus.emit('sfx:collision', { impact: 420, x: 0, y: 0 }), 220);
          setTimeout(() => bus.emit('sfx:collision', { impact: 620, x: 0, y: 0 }), 440);
          break;
        case 'next':
          if (!match.cfg) { toast('Start a match first'); break; }
          match.nextMatch();
          toast('Next match started');
          break;
        case 'loop': {
          // 5 quick matches back-to-back to validate the auto loop UI path
          match.abandon();
          app.startBattle({ category: 'random', count: 20, preset: 'SINGLE', autoLive: true });
          toast('AUTO LOOP running — 5-match stress via controls (AUTO:OFF to stop)');
          break;
        }
      }
      status();
    });
  });
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
