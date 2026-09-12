/* Splash + Home + pre-match setup modal. */

import { logoFull, logoIcon, LOGO_ICON_FILE } from './logo.js';
import { CATEGORIES, CATEGORY_META, COUNT_PRESETS, VERSION } from '../config/defaults.js';

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
  { id: 'quick', label: 'QUICK BATTLE', icon: '⚡', cat: 'quick' },
  { id: 'countries', label: 'COUNTRY BATTLE', icon: '🌐', cat: 'countries' },
  { id: 'youtubers', label: 'YOUTUBER BATTLE', icon: '▶', cat: 'youtubers' },
  { id: 'football', label: 'FOOTBALL BATTLE', icon: '⚽', cat: 'football' },
  { id: 'social', label: 'SOCIAL MEDIA', icon: '📱', cat: 'social' },
  { id: 'games', label: 'GAMING', icon: '🎮', cat: 'games' },
  { id: 'custom', label: 'CUSTOM BATTLE', icon: '✚', cat: 'custom' },
  { id: 'random', label: 'RANDOM BATTLE', icon: '🎲', cat: 'random' },
  { id: 'tournament', label: 'TOURNAMENT', icon: '🏆', cat: 'tournament' },
  { id: 'autolive', label: 'AUTO LIVE', icon: '🔴', cat: 'autolive', hot: true },
  { id: 'content', label: 'CONTENT MANAGER', icon: '🗂' },
  { id: 'settings', label: 'SETTINGS', icon: '⚙' },
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
          <span class="hicon">${b.icon}</span>${b.label}
          ${b.hot ? '<span class="live-dot"></span>' : ''}
        </button>`).join('')}
    </div>
    <div class="home-foot">
      <button class="linkbtn" data-id="history">MATCH HISTORY${hist.length ? ` (${hist.length})` : ''}</button>
      <span class="ver">v${VERSION}</span>
      <button class="linkbtn" data-id="test">TEST MODE</button>
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
    case 'autolive':
      showSetup(app, { category: 'random', preset: s.tournamentPreset, autoLive: true });
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

export function showSetup(app, { category, preset, autoLive = false, tournament = false }) {
  const { settings, content, root } = app;
  const s = settings.get();
  // random stays random (no category picker); quick/categorized battles get a picker
  const catChoices = category === 'random'
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
      <div class="m-head">${logoIcon(40)}<span id="mTitle">SETUP</span></div>
      <div class="m-body">
        ${catChoices.length > 1 ? `
        <div class="m-row">
          <label>CATEGORY</label>
          <select id="mCat">${catChoices.map((c) => `<option value="${c}" ${c === category ? 'selected' : ''}>${CATEGORY_META[c].banner}</option>`).join('')}</select>
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
        ${autoLive ? `<div class="m-warn">🔴 AUTO LIVE will run matches forever until you stop it.</div>` : ''}
      </div>
      <div class="m-foot">
        <button class="btn ghost" id="mCancel">CANCEL</button>
        <button class="btn primary" id="mStart">${autoLive ? 'START AUTO LIVE' : tournament ? 'START TOURNAMENT' : 'START BATTLE'}</button>
      </div>
    </div>
  `;
  root.appendChild(modal);

  const $ = (sel) => modal.querySelector(sel);
  let selCat = category;
  let selCount = defaultCount;
  let selPreset = preset;
  let useCustom = false;

  function update() {
    $('#mTitle').textContent =
      selCat === 'random' ? 'RANDOM BATTLE' :
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
      $('#mPool').textContent += '  ⚠ over 250 contestants may reduce FPS on low-end devices';
      $('#mPool').classList.add('warn');
    } else $('#mPool').classList.remove('warn');
  }

  $('#mCat')?.addEventListener('change', (e) => {
    selCat = e.target.value;
    update();
  });
  $('#mCount').querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => {
      useCustom = false;
      $('#mCount').querySelectorAll('button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      selCount = Number(b.dataset.n);
    });
  });
  $('#mCustom').addEventListener('input', (e) => {
    useCustom = true;
    selCount = Number(e.target.value) || 0;
    $('#mCount').querySelectorAll('button').forEach((x) => x.classList.remove('on'));
  });
  $('#mPreset').querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => {
      selPreset = b.dataset.p;
      $('#mPreset').querySelectorAll('button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
    });
  });
  update();

  $('#mCancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  $('#mStart').addEventListener('click', () => {
    modal.remove();
    const cfg = {
      category: selCat,
      count: selCount,
      preset: selPreset,
      autoLive,
    };
    if (selCat === 'custom') cfg.battleId = $('#mBattle')?.value || content.listBattles()[0]?.id;
    app.startBattle(cfg);
  });
}

export { LOGO_ICON_FILE };
