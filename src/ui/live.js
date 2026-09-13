/* LIVE screen: canvas + HUD (9:16) + overlays + control layer.
 * Stream mode: minimal controls (pause/stop/mute), auto-advancing matches,
 * no result screens, no manual "next match" — designed for 24/7 YouTube Live. */

import { M } from '../engine/match.js';
import { phaseLabel } from '../engine/tournament.js';
import { fmtTime, fmtNum } from '../audio/audioManager.js';
import { tripleTap, enableWakeLock } from '../stream/streamMode.js';
import { icon } from './icons.js';

export function createLiveView(app) {
  const { root, match, bus, settings, content, toast: showToast, history } = app;
  const imageMap = new Map(); // contestantId -> HTMLImageElement

  const el = document.createElement('div');
  el.className = 'live';
  el.innerHTML = `
    <canvas id="cv" width="1080" height="1920"></canvas>
    <div class="hud">
      <div class="hud-top">
        <div class="panel qual">
          <h3>${icon('trophy', 11)} QUALIFIED FOR FINAL</h3>
          <div class="qual-scroll" id="qualScroll"></div>
          <div class="pcount" id="qualCount">0</div>
        </div>
        <div class="hud-center">
          <div class="tlabel">ELIMINATIONS IN</div>
          <div class="timer" id="timer">--:--</div>
          <div class="qualbar" id="qualBar">0 / 0 QUALIFIED</div>
        </div>
        <div class="panel sup">
          <h3>${icon('star', 11)} TOP SUPPORTERS</h3>
          <ol id="supList"></ol>
        </div>
      </div>
      <div class="banner" id="banner">
        <div class="bt" id="bannerTitle">BATTLE</div>
        <div class="bp" id="bannerPhase"></div>
        <div class="bl" id="bannerLeft">0 LEFT</div>
      </div>
      <div id="popups"></div>
      <div class="winners" id="winners"></div>
      <div class="cstrip" id="cstrip"></div>
      <div class="hud-bottom"><span id="matchInfo"></span></div>
    </div>
    <div id="controls" class="controls"></div>
    <div id="overlay"></div>
  `;
  root.appendChild(el);

  const $ = (s) => el.querySelector(s);
  const canvas = $('#cv');
  const overlay = $('#overlay');
  const popups = $('#popups');
  const matchRef = { current: null };

  const renderer = app.makeRenderer({ canvas, imageMap, matchRef });
  matchRef.current = match;

  let stream = !!app._streamMode;
  let muted = false;
  let lastRoundEnd = null;
  let lastWinner = null;
  let lastCta = null;
  let lastCtaSeq = null;
  let lastInter = null;
  let lastMatchStart = null;
  let ctaStepIdx = 0;
  let supTimer = 0;
  let releaseWake = null;
  let untripletap = null;

  el.classList.toggle('stream', stream);

  /* ---------- image preloading (flags / imports / custom) ---------- */
  function preloadImages() {
    imageMap.clear();
    if (!match.cfg) return;
    const pool = content.getPool(match.cfg.category, { battleId: match.cfg.battleId });
    for (const c of pool) {
      if (c.image) {
        const im = new Image();
        im.src = c.image;
        imageMap.set(c.id, im);
      }
    }
  }

  /* ---------- bus wiring ---------- */
  const offs = [
    bus.on('match:start', (info) => {
      lastMatchStart = info;
      lastRoundEnd = null;
      lastWinner = null;
      lastCta = null;
      lastCtaSeq = null;
      lastInter = null;
      ctaStepIdx = 0;
      preloadImages();
      overlay.innerHTML = '';
      popups.innerHTML = '';
      renderQual([]);
      renderStrip();
      renderWinners();
      renderSupporters();
      el.classList.toggle('auto-live', !!info.autoLive);
    }),
    bus.on('eliminated', (e) => {
      addPopup(e);
      const out = $('#cstrip').querySelector('.tile:not(.out):not(.more)');
      if (out) out.classList.add('out');
    }),
    bus.on('round:end', (d) => {
      lastRoundEnd = d;
      renderQual(d.qualified);
      if (d.isFinal) markStripWinners(d.winners || (d.winner ? [d.winner] : []));
      renderWinners();
    }),
    bus.on('winner:show', (d) => { lastWinner = d.winner; }),
    bus.on('cta:start', (d) => {
      lastCta = d.cta;
      lastCtaSeq = d.seq && d.seq.length ? d.seq : [d.cta];
      ctaStepIdx = 0;
    }),
    bus.on('cta:step', (d) => { lastCta = d.cta; ctaStepIdx = d.index; }),
    bus.on('intermission:start', (d) => { lastInter = d; }),
  ];

  /* ---------- avatars / qualified list ---------- */
  function avatarHtml(c, cls = 'qav') {
    if (c?.image) return `<img class="${cls}" src="${c.image}" alt="">`;
    if (c?.emoji) return `<span class="${cls} em">${c.emoji}</span>`;
    return `<span class="${cls} ini">${esc(String(c?.name || '?').slice(0, 2).toUpperCase())}</span>`;
  }

  function renderQual(list) {
    const q = $('#qualScroll');
    const qc = $('#qualCount');
    if (!list || !list.length) {
      q.innerHTML = '<span class="qempty">— none yet —</span>';
      qc.textContent = '0';
      return;
    }
    q.innerHTML = list.slice(0, 30)
      .map((c) => `<span class="qchip" title="${esc(c.name)}">${avatarHtml(c)}<i>${esc(shorten(c.name, 9))}</i></span>`)
      .join('');
    qc.textContent = String(list.length);
  }

  /* ---------- recent winners (persistent, newest first) ---------- */
  function renderWinners() {
    const s = settings.get();
    const n = s.stream?.winnerHistoryCount || 5;
    const rows = (history.list() || []).slice(0, n).filter((h) => h.winner);
    const w = $('#winners');
    if (!rows.length) { w.innerHTML = ''; return; }
    w.innerHTML = rows.map((h) =>
      `<span class="wrow" title="MATCH #${h.id}">${icon('trophy', 10)}${avatarHtml(h.winner, 'wav')}<b>${esc(h.winner.name)}</b></span>`
    ).join('');
  }

  function renderSupporters() {
    const list = [...content.getSupporters()].sort((a, b) => b.count - a.count).slice(0, 5);
    $('#supList').innerHTML = list
      .map((p, i) => `<li><span class="rk">${i + 1}</span><span class="sn" style="color:${p.color || '#9fb4ff'}">${esc(p.name)}</span><span class="sc">${fmtNum(p.count)}</span></li>`)
      .join('');
  }

  /* ---------- elimination popup (with image) ---------- */
  function addPopup(e) {
    const d = document.createElement('div');
    d.className = 'popup';
    d.innerHTML = `<div class="pop-t">ELIMINATED</div>
      <div class="pop-b">${avatarHtml({ image: e.image, emoji: e.emoji, name: e.name }, 'pav')}
      <span class="pop-n">${esc(e.name)}</span></div>`;
    popups.appendChild(d);
    while (popups.children.length > 4) popups.removeChild(popups.firstChild);
    setTimeout(() => d.remove(), 1900);
  }

  /* ---------- bottom contestant strip (image tiles + status) ---------- */
  function renderStrip() {
    const strip = $('#cstrip');
    const balls = match.balls || [];
    const MAXT = 70;
    const shown = balls.slice(0, MAXT);
    strip.innerHTML = shown
      .map((b) => `<span class="tile">${avatarHtml(b.c, 'tav')}${b.c.name.length <= 9 ? `<em>${esc(b.c.name)}</em>` : ''}</span>`)
      .join('') + (balls.length > MAXT ? `<span class="tile more">+${balls.length - MAXT}</span>` : '');
  }

  function markStripWinners(winners) {
    const names = new Set(winners.map((w) => w?.name));
    $('#cstrip').querySelectorAll('.tile:not(.more)').forEach((t) => {
      const name = t.querySelector('em')?.textContent;
      if (name && names.has(name)) t.classList.add('win');
      else if (!t.classList.contains('out')) t.classList.add('qual');
    });
  }
  /* ---------- overlays (state driven) ---------- */
  function tokenHtml(c, size = 150) {
    return `<div class="token" style="--tk:${c?.color || '#38b6ff'};width:${size}px;height:${size}px">${avatarHtml(c, 'tki')}</div>`;
  }

  function syncOverlay() {
    const st = match.state;
    let html = null;
    let key = st;
    const auto = match.cfg?.autoLive || stream;
    if (st === M.COUNTDOWN) {
      const n = Math.ceil(match.countdownT);
      const title = auto ? (lastInter?.nextTitle || lastMatchStart?.categoryTitle || 'NEXT MATCH') : 'GET READY';
      html = `<div class="ov cd"><div class="cd-t">${esc(title)}</div><div class="cd-num">${n >= 1 ? n : 'GO'}</div></div>`;
      key += n;
    } else if (st === M.ROUND_RESULT && lastRoundEnd) {
      const d = lastRoundEnd;
      const list = d.qualified.slice(0, 12);
      html = `
        <div class="ov rr">
          <div class="rr-t">${d.isFinal ? 'FINAL OVER' : `ROUND ${d.round} COMPLETE`}</div>
          <div class="rr-s">${d.isFinal ? 'SURVIVORS REMAIN' : `${d.qualified.length} QUALIFIED`}</div>
          <div class="rr-list">${list.map((c) => `<span class="rr-chip">${avatarHtml(c, 'rri')}${esc(shorten(c.name, 12))}</span>`).join('')}${d.qualified.length > 12 ? `<span class="rr-chip dim">+${d.qualified.length - 12}</span>` : ''}</div>
        </div>`;
    } else if (st === M.WINNER && lastWinner) {
      const w = lastWinner;
      const podium = (match.winners && match.winners.length > 1) ? match.winners.slice(1, 6) : [];
      html = `
        <div class="ov win">
          <div class="win-crown">${icon('trophy', 26)} WINNER ${icon('trophy', 26)}</div>
          ${tokenHtml(w, 190)}
          <div class="win-name">${esc(w.name)}</div>
          <div class="win-sub">WINS THE ${esc(lastMatchStart?.categoryTitle || 'BATTLE')}!</div>
          ${podium.length ? `<div class="win-podium">${podium.map((p) => `<span class="pchip">${avatarHtml(p, 'pi')}${esc(shorten(p.name, 10))}</span>`).join('')}</div>` : ''}
          <div class="win-matches">MATCH #${lastMatchStart?.id ?? ''}${match.rounds.length > 1 ? ` • ${match.rounds.length} ROUNDS` : ''}</div>
        </div>`;
    } else if (st === M.CTA && lastCta) {
      key += ctaStepIdx;
      const c = lastCta;
      const seq = lastCtaSeq || [];
      const dots = seq.length > 1 ? `<div class="cta-dots">${seq.map((_, i) => `<i class="${i === ctaStepIdx ? 'on' : ''}"></i>`).join('')}</div>` : '';
      html = `
        <div class="ov cta ${c.anim}" style="--cta:${c.color}">
          <div class="cta-icon">${icon(c.icon || 'comment', 74)}</div>
          <div class="cta-text">${esc(c.text)}</div>
          <div class="cta-sub">${esc(c.sub)}</div>
          ${dots}
        </div>`;
    } else if (st === M.INTERMISSION) {
      html = `
        <div class="ov inter">
          <div class="inter-t">${auto ? 'NEXT MATCH' : 'MATCH COMPLETE'}</div>
          ${auto ? `<div class="inter-cd">${fmtTime(match.stateT)}</div>` : ''}
          ${lastInter?.nextTitle ? `<div class="inter-next">${esc(lastInter.nextTitle)}</div>` : ''}
          <div class="inter-tag">WHO WILL SURVIVE?</div>
          ${auto ? '' : `<div class="inter-btns"><button id="ovNext" class="btn">${icon('next', 15)} NEXT MATCH</button><button id="ovHome" class="btn ghost">${icon('home', 15)} HOME</button></div>`}
        </div>`;
    } else if (st === M.PAUSED) {
      html = `<div class="ov pause"><div class="pause-t">${icon('pause', 34)} PAUSED</div><div class="pause-s">Tap ${icon('play', 12)} to resume</div></div>`;
    } else {
      html = null;
    }
    const prev = overlay.dataset.key;
    if (html === null) {
      if (overlay.innerHTML) overlay.innerHTML = '';
      overlay.dataset.key = '';
      return;
    }
    if (prev !== key) {
      overlay.innerHTML = html;
      overlay.dataset.key = key;
      overlay.classList.add('show');
      overlay.querySelector('#ovNext')?.addEventListener('click', () => match.nextMatch());
      overlay.querySelector('#ovHome')?.addEventListener('click', () => app.exitLive());
    } else {
      // in-place timer updates (countdown number / intermission clock)
      if (st === M.COUNTDOWN) {
        const n = Math.ceil(match.countdownT);
        const num = overlay.querySelector('.cd-num');
        if (num && num.textContent !== String(n >= 1 ? n : 'GO')) num.textContent = n >= 1 ? n : 'GO';
      } else if (st === M.INTERMISSION) {
        const cd = overlay.querySelector('.inter-cd');
        if (cd) cd.textContent = fmtTime(match.stateT);
      }
    }
  }

  /* ---------- HUD tick (every frame) ---------- */
  function hudTick(dt) {
    const s = settings.get();
    if (match.state === M.BATTLE || match.state === M.COUNTDOWN) {
      $('#timer').textContent = fmtTime(match.timer);
    }
    $('#qualBar').textContent = `${match.left <= match.target ? match.target : 0} / ${match.target} QUALIFIED`;
    const m = lastMatchStart;
    $('#bannerTitle').textContent = m?.categoryTitle || 'BATTLE';
    $('#bannerPhase').textContent = phaseLabel(match.roundIndex, match.rounds.length || 1);
    $('#bannerLeft').textContent = `${match.left} ${m?.unit || 'PLAYERS'} LEFT`;
    $('#matchInfo').textContent = m
      ? `MATCH #${m.id} • ${m.gapCount || 1} EXIT${(m.gapCount || 1) > 1 ? 'S' : ''} • SEED ${m.seed}${m.autoLive ? ' • AUTO LIVE' : ''}`
      : '';
    if (s.supportSim && match.isRunning()) {
      supTimer -= dt;
      if (supTimer <= 0) {
        supTimer = 3 + Math.random() * 4;
        const list = content.getSupporters();
        if (list.length) {
          const p = list[Math.floor(Math.random() * list.length)];
          p.count += 1 + Math.floor(Math.random() * 4);
          renderSupporters();
        }
      }
    }
    syncOverlay();
  }

  /* ---------- controls ---------- */
  function renderControls() {
    const c = $('#controls');
    if (stream) {
      c.innerHTML = `
        <button data-act="pause" title="Pause/Resume">${match.state === M.PAUSED ? icon('play', 18) : icon('pause', 18)}</button>
        <button data-act="mute" title="Mute">${muted ? icon('mute', 18) : icon('volume', 18)}</button>
        <button data-act="stop" class="stop" title="Stop stream mode">${icon('stop', 18)}</button>`;
    } else {
      c.innerHTML = `
        <button data-act="pause" title="Pause/Resume">${match.state === M.PAUSED ? icon('play', 18) : icon('pause', 18)}</button>
        <button data-act="next" title="Next match">${icon('next', 18)}</button>
        <button data-act="restart" title="Restart match">${icon('restart', 18)}</button>
        <button data-act="mute" title="Mute">${muted ? icon('mute', 18) : icon('volume', 18)}</button>
        <button data-act="auto" class="small">${match.cfg?.autoLive ? 'AUTO:ON' : 'AUTO:OFF'}</button>
        <button data-act="stream" class="small">STREAM</button>
        <button data-act="home" title="Exit to home">${icon('home', 18)}</button>`;
    }
    c.querySelector('[data-act="pause"]')?.addEventListener('click', () => { match.togglePause(); renderControls(); });
    c.querySelector('[data-act="next"]')?.addEventListener('click', () => { match.nextMatch(); renderControls(); });
    c.querySelector('[data-act="restart"]')?.addEventListener('click', () => { match.restart(); renderControls(); });
    c.querySelector('[data-act="mute"]')?.addEventListener('click', () => {
      muted = !muted;
      app.setMuted(muted);
      renderControls();
    });
    c.querySelector('[data-act="auto"]')?.addEventListener('click', () => {
      const on = !match.cfg?.autoLive;
      if (match.cfg) match.cfg.autoLive = on;
      settings.set({ autoLive: on });
      showToast(on ? 'AUTO LIVE ON — matches loop forever' : 'AUTO LIVE OFF — stops after current match');
      renderControls();
    });
    c.querySelector('[data-act="stream"]')?.addEventListener('click', () => toggleStream(true));
    c.querySelector('[data-act="stop"]')?.addEventListener('click', stopStream);
    c.querySelector('[data-act="home"]')?.addEventListener('click', () => app.exitLive());
  }

  function toggleStream(on) {
    stream = on ?? !stream;
    el.classList.toggle('stream', stream);
    if (stream) {
      // Stream mode: match must keep running automatically, same category forever
      if (match.cfg) match.cfg.autoLive = true;
      settings.set({ autoLive: true });
      el.classList.add('auto-live');
      releaseWake = enableWakeLock();
      untripletap = tripleTap(el, () => toggleStream(false), { x1: 0.68, y1: 0, x2: 1, y2: 0.16 });
      showToast('STREAM MODE — triple-tap top-right corner for controls', 3500);
    } else {
      releaseWake?.();
      releaseWake = null;
      untripletap?.();
      untripletap = null;
    }
    renderControls();
  }

  function stopStream() {
    if (stream) {
      toggleStream(false);
      app.exitLive();
    } else {
      app.exitLive();
    }
  }

  renderControls();
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  /* ---------- api ---------- */
  return {
    el,
    frame(dt) {
      renderer.frame(dt);
      hudTick(dt);
    },
    setQuality(key) {
      renderer.setQuality(key);
    },
    destroy() {
      for (const off of offs) off();
      releaseWake?.();
      untripletap?.();
      el.remove();
      overlay.dataset.key = '';
    },
    hideControls() {
      $('#controls').style.display = 'none';
    },
    get stream() { return stream; },
  };
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function shorten(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
