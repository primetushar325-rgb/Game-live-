/* Splash + Home + pre-match setup modal. */

import { logoFull, logoIcon } from './logo.js';
import { icon } from './icons.js';
import { CATEGORIES, CATEGORY_META, COUNT_PRESETS, SPEED_PRESETS, COLLISION_POWER, VERSION } from '../config/defaults.js';

export function renderSplash(app) {
  app.clearRoot();
  const el = document.createElement('div');
  el.className = 'splash';
  el.innerHTML = `
    <div class="sp-logo">${logoFull(300)}</div>
    <div class="sp-tag">WHO WILL SURVIVE?</div>
    <div class="sp-bar"><i></i></div>
  `;
  app.root.appendChild(el);
  setTimeout(() => renderHome(app), 1700);
}

const HOME_BTNS = [
  { id: 'quick', label: 'QUICK BATTLE', ic: 'bolt', cat: 'quick' },
  { id: 'countries', label: 'COUNTRY BATTLE', ic: 'globe', cat: 'countries' },
  { id: 'youtubers', label: 'YOUTUBER BATTLE', ic: 'youtube', cat: 'youtubers' },
  { id: 'football', label: 'FOOTBALL BATTLE', ic: 'football', cat: 'football' },
  { id: 'social', label: 'SOCIAL MEDIA', ic: 'phone', cat: 'social' },
  { id: 'games', label: 'GAMING', ic: 'gamepad', cat: 'games' },
  { id: 'custom', label: 'CUSTOM BATTLE', ic: 'userplus', cat: 'custom' },
  { id: 'random', label: 'RANDOM BATTLE', ic: 'shuffle', cat: 'random' },
  { id: 'tournament', label: 'TOURNAMENT', ic: 'trophy', cat: 'tournament' },
  { id: 'stream', label: 'STREAM MODE', ic: 'live', cat: 'stream', hot: true },
  { id: 'content', label: 'CONTENT MANAGER', ic: 'folder' },
  { id: 'settings', label: 'SETTINGS', ic: 'gear' },
];

export function renderHome(app) {
  app.clearRoot();
  const el = document.createElement('div');
  el.className = 'screen home';
  const hist = app.history.list();
  el.innerHTML = `
    <div class="home-top">
      ${logoFull(250)}
    </div>
    <div class="home-grid">
      ${HOME_BTNS.map((b) => `
        <button class="hbtn ${b.hot ? 'hot' : ''}" data-id="${b.id}">
          <span class="hicon">${icon(b.ic, 17)}</span>${b.label}
          ${b.hot ? '<span class="live-dot"></span>' : ''}
        </button>`).join('')}
    </div>
    <div class="home-foot">
      <button class="linkbtn" data-id="history">${icon('history', 13)} MATCH HISTORY${hist.length ? ` (${hist.length})` : ''}</button>
      <span class="ver">v${VERSION}</span>
      <button class="linkbtn" data-id="test">${icon('flask', 13)} TEST MODE</button>
    </div>
  `;
  app.root.appendChild(el);

  el.querySelectorAll('[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => onHomeBtn(app, btn.dataset.id));
  });
}

function onHomeBtn(app, id) {
  const { settings } = app;
  const s = settings.get();
  switch (id) {
    case 'quick':
      showSetup(app, { category: 'quick', preset: 'SINGLE' });
      break;
    case 'countries': case 'youtubers': case 'football': case 'social': case 'games': case 'custom':
      showSetup(app, { category: id, preset: s.tournamentPreset === 'SINGLE' ? 'SINGLE' : 'FULL' });
      break;
    case 'random':
      showSetup(app, { category: 'random', preset: 'SINGLE' });
      break;
    case 'tournament':
      showSetup(app, { category: 'countries', preset: 'FULL', tournament: true });
      break;
    case 'stream':
      showSetup(app, { category: 'countries', stream: true, preset: 'SINGLE' });
      break;
    case 'content':
      app.navigate('content');
      break;
    case 'settings':
      app.navigate('settings');
      break;
    case 'history':
      app.navigate('history');
      break;
    case 'test':
      app.navigate('test');
      break;
  }
}

export function showSetup(app, { category, preset, autoLive = false, tournament = false, stream = false }) {
  const { settings, content, root } = app;
  const s = settings.get();
  const sm = s.stream || {};
  // stream: user picks ONE category (or random) and it loops forever in that category
  const catChoices = stream
    ? [...CATEGORIES.filter((c) => c !== 'custom' || content.listBattles().length > 0), 'random']
    : category === 'random'
      ? []
      : category === 'custom'
        ? ['custom']
        : CATEGORIES;

  const battles = category === 'custom' || catChoices.includes('custom') ? content.listBattles() : [];
  const defaultCount = category === 'countries'
    ? 195
    : COUNT_PRESETS.includes(s.ballCount) ? s.ballCount : 50;

  const modal = document.createElement('div');
  modal.className = 'modal-wrap';
  modal.innerHTML = `
    <div class="modal">
      <div class="m-head">${logoIcon(40)}<span id="mTitle">SETUP</span>${stream ? `<span class="m-live">${icon('live', 12)} STREAM</span>` : ''}</div>
      <div class="m-body">
        ${catChoices.length > 1 ? `
        <div class="m-row">
          <label>CATEGORY</label>
          <select id="mCat">${catChoices.map((c) => `<option value="${c}" ${c === category ? 'selected' : ''}>${CATEGORY_META[c]?.banner || c.toUpperCase()}</option>`).join('')}</select>
        </div>` : ''}
        <div id="mBattleRow" style="display:none">
          <div class="m-row"><label>BATTLE</label>
            <select id="mBattle">${battles.map((b) => `<option value="${b.id}">${b.name} (${b.contestants.length})</option>`).join('')}</select>
          </div>
        </div>
        <div class="m-row">
          <label>CONTESTANTS</label>
          <div class="seg" id="mCount">
            ${COUNT_PRESETS.map((n) => `<button data-n="${n}" class="${n === defaultCount ? 'on' : ''}">${n}</button>`).join('')}
          </div>
          <div class="m-row"><label>CUSTOM</label>
            <input type="number" id="mCustom" min="2" max="250" value="${s.customCount}">
          </div>
        </div>
        <div class="m-note" id="mPool">AVAILABLE: —</div>
        <div class="m-row">
          <label>MODE</label>
          <div class="seg" id="mPreset">
            <button data-p="FULL" class="${preset === 'FULL' ? 'on' : ''}">TOURNAMENT</button>
            <button data-p="SCALE" class="${preset === 'SCALE' ? 'on' : ''}">SCALED</button>
            <button data-p="SINGLE" class="${preset === 'SINGLE' ? 'on' : ''}">1 WINNER</button>
          </div>
        </div>
        <div class="m-row">
          <label>WINNER COUNT</label>
          <div class="seg" id="mWinners">
            ${[1, 5, 10].map((w) => `<button data-w="${w}" class="${(s.winnerCount || 1) === w ? 'on' : ''}">${w} WINNER${w > 1 ? 'S' : ''}</button>`).join('')}
          </div>
        </div>
        <div class="m-row">
          <label>BALL SPEED</label>
          <div class="seg" id="mSpeed">
            ${Object.entries(SPEED_PRESETS).map(([k, v]) => `<button data-v="${k}" data-pct="${Math.round(v * 100)}" class="${s.ballSpeed === v ? 'on' : ''}">${k}</button>`).join('')}
          </div>
          <div class="m-row"><label>FINE TUNE</label>
            <div class="volrow"><input type="range" id="mSpeedPct" min="10" max="200" step="5" value="${Math.round((s.ballSpeed || 1) * 100)}"><output id="mSpeedPctO">${Math.round((s.ballSpeed || 1) * 100)}%</output></div>
          </div>
        </div>
        <div class="m-row">
          <label>COLLISION POWER</label>
          <div class="seg" id="mColl">
            ${Object.keys(COLLISION_POWER).map((k) => `<button data-v="${k}" class="${(s.collisionPower || 'NORMAL') === k ? 'on' : ''}">${k}</button>`).join('')}
          </div>
        </div>
        <div class="m-row">
          <label>EXIT GAPS</label>
          <div class="seg" id="mGaps">
            ${[1, 2, 3, 4].map((n) => `<button data-n="${n}" class="${(s.gapCount || 1) === n ? 'on' : ''}">${n} GAP${n > 1 ? 'S' : ''}</button>`).join('')}
          </div>
          <div class="seg" id="mGapPos">
            ${['FIXED', 'RANDOM MATCH', 'RANDOM ROUND'].map((p) => `<button data-v="${p.replace(' ', '_')}" class="${(s.gapPosition || 'RANDOM_MATCH') === p.replace(' ', '_') ? 'on' : ''}">${p}</button>`).join('')}
          </div>
        </div>
        <div class="m-row">
          <label>ARENA / TIME</label>
          <div class="mrow2">
            <select id="mArena">${['S', 'M', 'L'].map((a) => `<option value="${a}" ${a === s.arenaSize ? 'selected' : ''}>ARENA ${a}</option>`).join('')}</select>
            <select id="mDur">${[5, 10, 15, 30, 45].map((d) => `<option value="${d}" ${Math.round(s.matchDuration / 60) === d ? 'selected' : ''}>${d} MIN</option>`).join('')}</select>
          </div>
        </div>
        <div class="m-row">
          <label>STREAM OPTIONS</label>
          <div class="mrow2 swrow">
            <span class="switem">${icon('timer', 13)} COUNTDOWN <select id="mCd">${[3, 5, 10].map((c) => `<option value="${c}" ${Number(sm.streamCountdown || 3) === c ? 'selected' : ''}>${c}s</option>`).join('')}</select></span>
            <span class="switem">${icon('comment', 13)} COMMENT CTA <button class="tswitch ${sm.commentCta !== false ? 'on' : ''}" id="mCtaCmt"></button></span>
            <span class="switem">${icon('youtube', 13)} SUBSCRIBE CTA <button class="tswitch ${sm.subscribeCta !== false ? 'on' : ''}" id="mCtaSub"></button></span>
            <span class="switem">${icon('trophy', 13)} HISTORY <select id="mWinN">${[5, 10, 20].map((n) => `<option value="${n}" ${Number(sm.winnerHistoryCount || 5) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></span>
          </div>
        </div>
        ${stream || autoLive ? `<div class="m-warn">${icon('live', 14)} ${stream ? 'STREAM MODE runs matches automatically, forever, in the selected category. Stop it with the STOP button (or triple-tap top-right).' : 'AUTO LIVE will run matches forever until you stop it.'}</div>` : ''}
      </div>
      <div class="m-foot">
        <button class="btn ghost" id="mCancel">${icon('close', 14)} CANCEL</button>
        <button class="btn primary" id="mStart">${stream ? `${icon('live', 15)} START STREAM` : autoLive ? 'START AUTO LIVE' : tournament ? 'START TOURNAMENT' : 'START BATTLE'}</button>
      </div>
    </div>
  `;
  root.appendChild(modal);

  const $ = (sel) => modal.querySelector(sel);
  let selCat = category;
  let selCount = defaultCount;
  let selPreset = preset;
  let selWinners = s.winnerCount || 1;
  let useCustom = false;

  function segOn(sel, btn) {
    $(sel).querySelectorAll('button').forEach((x) => x.classList.remove('on'));
    btn.classList.add('on');
  }
  function update() {
    $('#mTitle').textContent =
      selCat === 'random' ? (stream ? 'STREAM — RANDOM BATTLE' : 'RANDOM BATTLE') :
      selCat === 'quick' ? 'QUICK BATTLE' :
      CATEGORY_META[selCat]?.banner || 'BATTLE';
    const battleRow = $('#mBattleRow');
    if (selCat === 'custom') {
      battleRow.style.display = '';
      if (!$('#mBattle').children.length) {
        battleRow.innerHTML = '<div class="m-note warn">No custom battles yet — create one in the CONTENT MANAGER.</div>';
      }
    } else battleRow.style.display = 'none';
    const pool = selCat === 'random' || selCat === 'quick' ? 'varies per match' : String(content.countEnabled(selCat));
    $('#mPool').textContent = `AVAILABLE: ${pool}`;
    if (Number.isFinite(selCount) && selCount > 250) {
      $('#mPool').textContent += '  over 250 contestants may reduce FPS on low-end devices';
      $('#mPool').classList.add('warn');
    } else $('#mPool').classList.remove('warn');
  }

  $('#mCat')?.addEventListener('change', (e) => { selCat = e.target.value; update(); });
  $('#mCount').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    useCustom = false;
    segOn('#mCount', b);
    selCount = Number(b.dataset.n);
  }));
  $('#mCustom').addEventListener('input', (e) => {
    useCustom = true;
    selCount = Number(e.target.value) || 0;
    $('#mCount').querySelectorAll('button').forEach((x) => x.classList.remove('on'));
  });
  $('#mPreset').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    selPreset = b.dataset.p;
    segOn('#mPreset', b);
  }));
  $('#mWinners').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    selWinners = Number(b.dataset.w);
    segOn('#mWinners', b);
  }));
  $('#mSpeed').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    segOn('#mSpeed', b);
    const pct = Number(b.dataset.pct);
    $('#mSpeedPct').value = pct;
    $('#mSpeedPctO').textContent = pct + '%';
  }));
  $('#mSpeedPct').addEventListener('input', (e) => {
    $('#mSpeedPctO').textContent = e.target.value + '%';
    $('#mSpeed').querySelectorAll('button').forEach((x) => x.classList.toggle('on', Number(x.dataset.pct) === Number(e.target.value)));
  });
  $('#mColl').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => segOn('#mColl', b)));
  $('#mGaps').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => segOn('#mGaps', b)));
  $('#mGapPos').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => segOn('#mGapPos', b)));
  $('#mCtaCmt')?.addEventListener('click', () => $('#mCtaCmt').classList.toggle('on'));
  $('#mCtaSub')?.addEventListener('click', () => $('#mCtaSub').classList.toggle('on'));
  update();

  $('#mCancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  $('#mStart').addEventListener('click', () => {
    modal.remove();
    // persist gameplay-affecting choices
    try {
      settings.set({
        winnerCount: selWinners,
        ballSpeed: Number($('#mSpeedPct').value) / 100,
        collisionPower: $('#mColl').querySelector('button.on')?.dataset.v || 'NORMAL',
        gapCount: Number($('#mGaps').querySelector('button.on')?.dataset.n || 1),
        gapPosition: $('#mGapPos').querySelector('button.on')?.dataset.v || 'RANDOM_MATCH',
        arenaSize: $('#mArena')?.value || 'M',
        matchDuration: Number($('#mDur')?.value || 45) * 60,
        ballCount: selCount,
        tournamentPreset: selPreset,
        stream: {
          ...(s.stream || {}),
          streamCountdown: Number($('#mCd')?.value || 3),
          commentCta: !$('#mCtaCmt')?.classList.contains('on') ? false : true,
          subscribeCta: !$('#mCtaSub')?.classList.contains('on') ? false : true,
          winnerHistoryCount: Number($('#mWinN')?.value || 5),
        },
      });
    } catch (e) { /* storage full — continue with in-memory values */ }
    const cfg = {
      category: selCat,
      count: selCount,
      preset: stream ? 'SINGLE' : selPreset,
      autoLive: autoLive || stream,
      streamMode: stream,
      winnerCount: selWinners,
    };
    if (selCat === 'custom') cfg.battleId = $('#mBattle')?.value || content.listBattles()[0]?.id;
    app.startBattle(cfg);
  });
}
