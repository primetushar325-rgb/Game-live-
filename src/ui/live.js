/* LIVE screen: canvas + HUD (9:16) + overlays + minimal control layer. */

import { M } from '../engine/match.js';
import { phaseLabel } from '../engine/tournament.js';
import { fmtTime, fmtNum } from '../audio/audioManager.js';
import { tripleTap, enableWakeLock, detectStream } from '../stream/streamMode.js';

export function createLiveView(app) {
  const { root, match, bus, settings, content, toast: showToast } = app;
  const imageMap = new Map(); // contestantId -> HTMLImageElement

  const el = document.createElement('div');
  el.className = 'live';
  el.innerHTML = `
    <canvas id="cv" width="1080" height="1920"></canvas>
    <div class="hud">
      <div class="hud-top">
        <div class="panel qual">
          <h3>QUALIFIED FOR FINAL</h3>
          <ul id="qualList"><li class="dim">— none yet —</li></ul>
          <div class="pcount" id="qualCount">0</div>
        </div>
        <div class="hud-center">
          <div class="tlabel">ELIMINATIONS IN</div>
          <div class="timer" id="timer">--:--</div>
          <div class="qualbar" id="qualBar">0 / 0 QUALIFIED</div>
        </div>
        <div class="panel sup">
          <h3>TOP SUPPORTERS</h3>
          <ol id="supList"></ol>
        </div>
      </div>
      <div class="banner" id="banner">
        <div class="bt" id="bannerTitle">BATTLE</div>
        <div class="bp" id="bannerPhase"></div>
        <div class="bl" id="bannerLeft">0 LEFT</div>
      </div>
      <div id="popups"></div>
      <div class="hud-bottom"><span id="matchInfo"></span></div>
    </div>
    <div id="controls" class="controls"></div>
    <div id="overlay"></div>
    <div id="watermark" class="watermark"></div>
  `;
  root.appendChild(el);

  const $ = (s) => el.querySelector(s);
  const canvas = $('#cv');
  const overlay = $('#overlay');
  const popups = $('#popups');
  const matchRef = { current: null };

  const renderer = app.makeRenderer({ canvas, imageMap, matchRef });
  matchRef.current = match;

  let stream = false;
  let muted = false;
  let lastRoundEnd = null;
  let lastWinner = null;
  let lastCta = null;
  let lastInter = null;
  let lastMatchStart = null;
  let supTimer = 0;
  let releaseWake = null;
  let untripletap = null;

  /* ---------- image preloading ---------- */
  function preloadImages() {
    imageMap.clear();
    if (!match.cfg) return;
    const pool = content.getPool(match.cfg.category, { battleId: match.cfg.battleId });
    for (const c of pool) {
      if (c.image) {
        const im = new Image();
        im.onload = () => { /* map filled */ };
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
      lastInter = null;
      preloadImages();
      overlay.innerHTML = '';
      popups.innerHTML = '';
      renderQual([]);
      const s = settings.get();
      renderSupporters();
      el.classList.toggle('auto-live', !!info.autoLive);
    }),
    bus.on('eliminated', (e) => {
      addPopup(e);
      const ql = $('#qualList');
      // live "flags left" handled by hudTick
    }),
    bus.on('round:end', (d) => { lastRoundEnd = d; renderQual(d.qualified); }),
    bus.on('winner:show', (d) => { lastWinner = d.winner; }),
    bus.on('cta:start', (d) => { lastCta = d.cta; }),
    bus.on('intermission:start', (d) => { lastInter = d; }),
  ];

  function renderQual(list) {
    const ql = $('#qualList');
    const qc = $('#qualCount');
    if (!list || !list.length) {
      ql.innerHTML = '<li class="dim">— none yet —</li>';
      qc.textContent = '0';
      return;
    }
    const shown = list.slice(0, 9);
    ql.innerHTML = shown
      .map((c) => `<li>${c.emoji ? `<span class="em">${c.emoji}</span>` : ''}<span class="qn">${esc(c.name)}</span></li>`)
      .join('');
    qc.textContent = String(list.length);
  }

  function renderSupporters() {
    const s = settings.get();
    const list = [...content.getSupporters()].sort((a, b) => b.count - a.count).slice(0, 5);
    $('#supList').innerHTML = list
      .map((p, i) => `<li><span class="rk">${i + 1}</span><span class="sn" style="color:${p.color || '#9fb4ff'}">${esc(p.name)}</span><span class="sc">${fmtNum(p.count)}</span></li>`)
      .join('');
    void s;
  }

  function addPopup(e) {
    const d = document.createElement('div');
    d.className = 'popup';
    d.innerHTML = `<div class="pop-t">ELIMINATED</div><div class="pop-n">${e.emoji ? `<span class="em">${e.emoji}</span>` : ''}${esc(e.name)}</div>`;
    popups.appendChild(d);
    while (popups.children.length > 4) popups.removeChild(popups.firstChild);
    setTimeout(() => d.remove(), 1900);
  }

  /* ---------- overlays (state driven) ---------- */
  function tokenHtml(c, size = 150) {
    const color = c?.color || '#38b6ff';
    const inner = c?.image
      ? `<img src="${c.image}" alt="">`
      : c?.emoji
        ? `<span class="tk-em" style="font-size:${size * 0.52}px">${c.emoji}</span>`
        : `<span class="tk-ini" style="font-size:${size * 0.3}px">${esc(String(c?.name || '?').slice(0, 3).toUpperCase())}</span>`;
    return `<div class="token" style="--tk:${color};width:${size}px;height:${size}px">${inner}</div>`;
  }

  function syncOverlay() {
    const st = match.state;
    let html = null;
    let key = st;
    if (st === M.COUNTDOWN) {
      const n = Math.ceil(match.countdownT);
      html = `<div class="ov cd"><div class="cd-num" key="${n}">${n >= 1 ? n : 'GO'}</div></div>`;
      key += n;
    } else if (st === M.ROUND_RESULT && lastRoundEnd) {
      const d = lastRoundEnd;
      const list = d.qualified.slice(0, 12);
      html = `
        <div class="ov rr">
          <div class="rr-t">${d.isFinal ? 'FINAL OVER' : `ROUND ${d.round} COMPLETE`}</div>
          <div class="rr-s">${d.isFinal ? 'ONE SURVIVOR REMAINS' : `${d.qualified.length} QUALIFIED`}</div>
          <div class="rr-list">${list.map((c) => `<span class="rr-chip">${c.emoji ? `<i>${c.emoji}</i>` : ''}${esc(shorten(c.name, 12))}</span>`).join('')}${d.qualified.length > 12 ? `<span class="rr-chip dim">+${d.qualified.length - 12}</span>` : ''}</div>
        </div>`;
    } else if (st === M.WINNER && lastWinner) {
      const w = lastWinner;
      html = `
        <div class="ov win">
          <div class="win-crown">🏆 WINNER 🏆</div>
          ${tokenHtml(w, 170)}
          <div class="win-name">${esc(w.name)}</div>
          <div class="win-sub">WINS THE ${esc(lastMatchStart?.categoryTitle || 'BATTLE')}!</div>
          <div class="win-matches">MATCH #${lastMatchStart?.id ?? ''} • ${match.rounds.length} ROUND${match.rounds.length > 1 ? 'S' : ''}</div>
        </div>`;
    } else if (st === M.CTA && lastCta) {
      const c = lastCta;
      html = `
        <div class="ov cta ${c.anim}" style="--cta:${c.color}">
          <div class="cta-icon">${c.icon}</div>
          <div class="cta-text">${esc(c.text)}</div>
          <div class="cta-sub">${esc(c.sub)}</div>
        </div>`;
    } else if (st === M.INTERMISSION) {
      const auto = match.cfg?.autoLive;
      html = `
        <div class="ov inter">
          <div class="inter-t">${auto ? 'NEXT MATCH IN' : 'MATCH COMPLETE'}</div>
          ${auto ? `<div class="inter-cd">${fmtTime(match.stateT)}</div>` : ''}
          ${lastInter?.nextTitle ? `<div class="inter-next">${esc(lastInter.nextTitle)}</div>` : ''}
          <div class="inter-tag">WHO WILL SURVIVE?</div>
          ${auto ? '' : `<div class="inter-btns"><button id="ovNext" class="btn">NEXT MATCH</button><button id="ovHome" class="btn ghost">HOME</button></div>`}
        </div>`;
    } else if (st === M.PAUSED) {
      html = `<div class="ov pause"><div class="pause-t">PAUSED</div><div class="pause-s">Tap ⏸ to resume</div></div>`;
    } else if (st === M.IDLE) {
      html = null;
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
      const nx = overlay.querySelector('#ovNext');
      nx?.addEventListener('click', () => match.nextMatch());
      const hm = overlay.querySelector('#ovHome');
      hm?.addEventListener('click', () => app.exitLive());
    } else {
      // in-place timer updates (countdown number / intermission clock)
      if (st === M.COUNTDOWN) {
        const n = Math.ceil(match.countdownT);
        const num = overlay.querySelector('.cd-num');
        if (num && num.textContent !== String(n)) num.textContent = n >= 1 ? n : 'GO';
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
    const qualifiedNow = match.rounds.length && match.left <= match.target ? match.target : 0;
    $('#qualBar').textContent = `${qualifiedNow} / ${match.target} QUALIFIED`;
    const m = lastMatchStart;
    $('#bannerTitle').textContent = m?.categoryTitle || 'BATTLE';
    $('#bannerPhase').textContent = phaseLabel(match.roundIndex, match.rounds.length || 1);
    $('#bannerLeft').textContent = `${match.left} ${m?.unit || 'PLAYERS'} LEFT`;
    $('#matchInfo').textContent = m
      ? `MATCH #${m.id} • SEED ${m.seed}${m.autoLive ? ' • AUTO LIVE' : ''}${s.watermark ? '' : ''}`
      : '';
    // supporters simulation
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
    c.innerHTML = `
      <button data-act="pause" title="Pause/Resume">⏸</button>
      <button data-act="next" title="Next match">⏭</button>
      <button data-act="restart" title="Restart match">↻</button>
      <button data-act="mute" title="Mute">${muted ? '🔇' : '🔊'}</button>
      <button data-act="auto" class="small">${match.cfg?.autoLive ? 'AUTO:ON' : 'AUTO:OFF'}</button>
      <button data-act="stream" class="small">STREAM</button>
      <button data-act="hide" class="small">HIDE</button>
      <button data-act="home" title="Exit to home">⌂</button>
    `;
    c.querySelector('[data-act="pause"]').addEventListener('click', () => {
      match.togglePause();
      renderControls();
    });
    c.querySelector('[data-act="next"]').addEventListener('click', () => {
      match.nextMatch();
      renderControls();
    });
    c.querySelector('[data-act="restart"]').addEventListener('click', () => {
      match.restart();
      renderControls();
    });
    c.querySelector('[data-act="mute"]').addEventListener('click', () => {
      muted = !muted;
      app.setMuted(muted);
      renderControls();
    });
    c.querySelector('[data-act="auto"]').addEventListener('click', () => {
      const on = !match.cfg?.autoLive;
      if (match.cfg) match.cfg.autoLive = on;
      settings.set({ autoLive: on });
      showToast(on ? 'AUTO LIVE ON — matches loop forever' : 'AUTO LIVE OFF — stops after current match');
      renderControls();
    });
    c.querySelector('[data-act="stream"]').addEventListener('click', toggleStream);
    c.querySelector('[data-act="hide"]').addEventListener('click', toggleStream);
    c.querySelector('[data-act="home"]').addEventListener('click', () => app.exitLive());
  }

  function toggleStream() {
    stream = !stream;
    el.classList.toggle('stream', stream);
    if (stream) {
      releaseWake = enableWakeLock();
      detectStream().then((on) => {
        if (on) showToast('Stream detected — 9:16 clean mode active', 3500);
      });
      untripletap = tripleTap(el, () => toggleStream(), { x1: 0.68, y1: 0, x2: 1, y2: 0.16 });
      showToast('STREAM MODE — triple-tap top-right corner to bring back controls', 3500);
    } else {
      releaseWake?.();
      releaseWake = null;
      untripletap?.();
      untripletap = null;
    }
    renderControls();
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
