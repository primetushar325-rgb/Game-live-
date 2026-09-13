/* CUTTER ROAD 3D UI integration. This is intentionally a separate set of
 * screens/views: BattleLoop's existing arena, navigation and history remain
 * untouched while Cutter Road gets its own save-backed progression. */

import { CUTTER_MODES, UPGRADE_DEFS } from '../cutter/config.js';
import { CutterGame, C } from '../cutter/engine.js';
import { createCutterRenderer } from '../cutter/renderer.js';
import { createCutterAudio } from '../cutter/audio.js';
import { icon } from './icons.js';
import { logoIcon } from './logo.js';

export function renderCutterMenu(app) {
  app.clearRoot();
  const profile = app.cutterSave.get();
  const el = document.createElement('div');
  el.className = 'screen cutter-menu';
  el.innerHTML = `
    <div class="s-head"><button class="btn ghost back" id="crBack">${icon('back', 16)}</button><h1>CUTTER ROAD 3D</h1><span></span></div>
    <div class="cutter-hero">
      <div class="cutter-hero-saw">${icon('cutter', 70)}</div>
      <div><b>ENDLESS CUTTING RUN</b><span>Swipe lanes • cut objects • build your cutter</span></div>
    </div>
    <div class="cutter-wallet"><span>${icon('coin', 17)} <b>${num(profile.coins)}</b> COINS</span><span>${icon('grid', 17)} <b>${num(profile.scrap)}</b> SCRAP</span><span>${icon('trophy', 17)} BEST <b>${num(profile.bestScore)}</b></span></div>
    <div class="cutter-menu-actions"><button class="btn primary" id="crUpgrade">${icon('cutter', 15)} UPGRADES</button><span>${num(profile.totalCuts)} OBJECTS CUT</span></div>
    <div class="cutter-mode-grid" id="crModes">
      ${CUTTER_MODES.map((mode) => {
        const unlocked = app.cutterSave.isUnlocked(mode.id);
        return `<button class="cutter-mode ${unlocked ? '' : 'locked'}" data-mode="${mode.id}" ${unlocked ? '' : 'disabled'} style="--mode:${mode.color}">
          <i>${icon(mode.icon, 28)}</i><b>${mode.name}</b><small>${unlocked ? mode.description : `UNLOCK: ${mode.unlock} OBJECTS CUT`}</small>
          <em>${unlocked ? 'PLAY' : 'LOCKED'}</em>
        </button>`;
      }).join('')}
    </div>
    <div class="cutter-menu-note">${logoIcon(26)} CUTTER ROAD is a separate offline mode. Your BattleLoop matches and history stay unchanged.</div>
  `;
  app.root.appendChild(el);
  el.querySelector('#crBack').addEventListener('click', () => app.navigate('home'));
  el.querySelector('#crUpgrade').addEventListener('click', () => app.navigate('cutter-upgrades'));
  el.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => app.startCutter(button.dataset.mode)));
}

export function renderCutterUpgrades(app) {
  app.clearRoot();
  const el = document.createElement('div');
  el.className = 'screen cutter-upgrades';
  app.root.appendChild(el);
  function draw() {
    const profile = app.cutterSave.get();
    el.innerHTML = `
      <div class="s-head"><button class="btn ghost back" id="cuBack">${icon('back', 16)}</button><h1>CUTTER UPGRADES</h1><span></span></div>
      <div class="upgrade-wallet">${icon('coin', 18)} <b>${num(profile.coins)}</b> AVAILABLE COINS</div>
      <div class="upgrade-list">
        ${Object.entries(UPGRADE_DEFS).map(([key, def]) => {
          const level = profile.upgrades[key] || 0;
          const current = app.cutterSave.upgradeValue(key);
          const next = level < def.max ? Number((def.start + def.step * (level + 1)).toFixed(key === 'critical' ? 3 : 2)) : current;
          const cost = app.cutterSave.upgradeCost(key);
          const maxed = level >= def.max;
          return `<section class="upgrade-card ${maxed ? 'maxed' : ''}">
            <div class="upgrade-icon">${icon(def.icon, 23)}</div><div class="upgrade-info"><b>${def.label}</b><small>${def.description}</small><span>LEVEL ${level}/${def.max} • ${labelValue(key, current)} → ${labelValue(key, next)}</span></div>
            <button class="btn small ${maxed ? 'ghost' : 'primary'}" data-upgrade="${key}" ${maxed ? 'disabled' : ''}>${maxed ? 'MAX' : `${icon('coin', 12)} ${num(cost)}`}</button>
          </section>`;
        }).join('')}
      </div>
      <div class="cutter-menu-note">Upgrades are saved locally and affect the real Cutter Road simulation.</div>`;
    el.querySelector('#cuBack').addEventListener('click', () => app.navigate('cutter'));
    el.querySelectorAll('[data-upgrade]').forEach((button) => button.addEventListener('click', () => {
      const outcome = app.cutterSave.buyUpgrade(button.dataset.upgrade);
      if (outcome.ok) { app.sfx?.cta?.(); app.toast(`${UPGRADE_DEFS[button.dataset.upgrade].label} upgraded`); }
      else app.toast(outcome.reason);
      draw();
    }));
  }
  draw();
}

export function createCutterLiveView(app, mode) {
  const { root, settings } = app;
  const audio = createCutterAudio(settings);
  const el = document.createElement('div');
  el.className = 'cutter-live';
  el.innerHTML = `
    <canvas id="crCanvas" width="1080" height="1920"></canvas>
    <div class="cutter-hud">
      <div class="cr-hud-top"><div class="cr-stat"><small>SCORE</small><b id="crScore">0</b></div><div class="cr-stat coin"><small>${icon('coin', 11)} COINS</small><b id="crCoins">0</b></div><button id="crPause" title="Pause">${icon('pause', 18)}</button></div>
      <div class="cr-combo" id="crCombo">COMBO x1</div>
      <div class="cr-health" id="crHealth" aria-label="Cutter integrity"></div>
      <div class="cr-energy"><span>${icon('bolt', 13)} SUPER CUT</span><div><i id="crEnergy"></i></div><b id="crEnergyText">0%</b></div>
      <button class="cr-super" id="crSuper" disabled>${icon('zap', 20)} SUPER</button>
      <div class="cr-feedback" id="crFeedback"></div>
      <div class="cr-hint" id="crHint">SWIPE LEFT OR RIGHT TO CHANGE LANE</div>
    </div>
    <div class="cr-overlay" id="crOverlay"></div>`;
  root.appendChild(el);
  const canvas = el.querySelector('#crCanvas');
  const renderer = createCutterRenderer(canvas);
  const feedback = el.querySelector('#crFeedback');
  const overlay = el.querySelector('#crOverlay');
  const game = new CutterGame({ mode, save: app.cutterSave, onEvent });
  let destroyed = false;
  let pointerX = null;
  let feedbackTimer = 0;

  function onEvent(type, data) {
    if (destroyed) return;
    if (['cut', 'damage', 'gate', 'super'].includes(type)) renderer.effect(type, data, game);
    const sound = { start: 'start', countdown: 'countdown', go: 'start', idle: 'idle', food: 'food', wood: 'wood', metal: 'metal', plastic: 'plastic', treasure: 'treasure', future: 'future', heavy: 'heavy', combo: 'combo', perfect: 'perfect', critical: 'critical', super: 'super', gameover: 'gameover' }[type];
    if (sound) audio.play(sound, type === 'combo' ? data.multiplier : 1);
    if (type === 'cut') {
      const tag = data.critical ? 'CRITICAL CUT' : data.perfect ? 'PERFECT CUT' : `+${data.points}`;
      showFeedback(`${tag}  +${data.points}`, data.critical ? '#ffcf4d' : data.perfect ? '#ffffff' : '#66e7ff');
    } else if (type === 'combo') showFeedback(`COMBO x${data.multiplier}`, '#ff76c5');
    else if (type === 'gate') showFeedback(data.choice.label, data.choice.color);
    else if (type === 'damage') showFeedback('BLOCKER HIT — INTEGRITY DOWN', '#ff5472');
    else if (type === 'super') showFeedback('SUPER CUT ACTIVE', '#51fff0');
    else if (type === 'gameover') showGameOver(data.result, data.profile);
  }
  function showFeedback(text, color) {
    feedback.textContent = text; feedback.style.color = color; feedback.classList.remove('show');
    requestAnimationFrame(() => feedback.classList.add('show'));
    feedbackTimer = 1.2;
  }
  function sync() {
    const state = game.snapshot();
    el.querySelector('#crScore').textContent = num(state.score);
    el.querySelector('#crCoins').textContent = num(state.coins);
    const combo = el.querySelector('#crCombo');
    combo.textContent = state.combo >= 25 ? `SUPER COMBO x${state.multiplier}` : `COMBO x${state.multiplier}`;
    combo.classList.toggle('hot', state.combo >= 3);
    el.querySelector('#crEnergy').style.width = `${Math.round(state.energy / state.energyCapacity * 100)}%`;
    el.querySelector('#crEnergyText').textContent = `${Math.round(state.energy / state.energyCapacity * 100)}%`;
    const superButton = el.querySelector('#crSuper');
    superButton.disabled = !game.superReady;
    superButton.classList.toggle('ready', game.superReady || state.superT > 0);
    el.querySelector('#crHealth').innerHTML = [0, 1, 2].map((n) => `<i class="${n < state.health ? 'on' : ''}"></i>`).join('');
    if (game.state === C.COUNTDOWN) renderCountdown(Math.max(1, Math.ceil(game.countdownT)));
    else if (game.state === C.RUNNING && overlay.dataset.kind === 'countdown') overlay.innerHTML = '';
    if (game.state === C.PAUSED) renderPause();
  }
  function renderCountdown(number) {
    if (overlay.dataset.kind === `countdown-${number}`) return;
    overlay.dataset.kind = `countdown-${number}`;
    overlay.innerHTML = `<div class="cr-count"><b>READY</b><strong>${number}</strong><span>CUT THE ROAD</span></div>`;
  }
  function renderPause() {
    if (overlay.dataset.kind === 'pause') return;
    overlay.dataset.kind = 'pause';
    overlay.innerHTML = `<div class="cr-dialog"><h2>${icon('pause', 25)} PAUSED</h2><button class="btn primary" id="crResume">${icon('play', 15)} RESUME</button><button class="btn" id="crRetry">${icon('restart', 15)} RESTART</button><button class="btn ghost" id="crExit">${icon('home', 15)} CUTTER MENU</button></div>`;
    overlay.querySelector('#crResume').addEventListener('click', () => { game.resume(); overlay.innerHTML = ''; overlay.dataset.kind = ''; });
    overlay.querySelector('#crRetry').addEventListener('click', () => app.startCutter(mode));
    overlay.querySelector('#crExit').addEventListener('click', () => app.exitCutter());
  }
  function showGameOver(result, profile) {
    overlay.dataset.kind = 'gameover';
    overlay.innerHTML = `<div class="cr-dialog gameover"><h2>RUN COMPLETE</h2><div class="cr-final-score">${num(result.score)}</div><span>FINAL SCORE</span><div class="cr-results"><b>${icon('coin', 13)} +${num(result.coins)} COINS</b><b>${icon('cutter', 13)} ${num(result.cuts)} CUT</b><b>${icon('fire', 13)} x${result.bestCombo} BEST COMBO</b></div><small>BEST SCORE: ${num(profile?.bestScore || result.score)}</small><button class="btn primary" id="crRetry">${icon('restart', 15)} RETRY</button><button class="btn" id="crUpgrades">${icon('cutter', 15)} UPGRADES</button><button class="btn ghost" id="crExit">${icon('home', 15)} CUTTER MENU</button></div>`;
    overlay.querySelector('#crRetry').addEventListener('click', () => app.startCutter(mode));
    overlay.querySelector('#crUpgrades').addEventListener('click', () => app.navigate('cutter-upgrades'));
    overlay.querySelector('#crExit').addEventListener('click', () => app.exitCutter());
  }
  function onPointerDown(event) { pointerX = event.clientX; }
  function onPointerUp(event) {
    if (pointerX == null) return;
    const delta = event.clientX - pointerX; pointerX = null;
    if (Math.abs(delta) > 28) game.move(delta > 0 ? 1 : -1);
  }
  function onKey(event) {
    if (event.key === 'ArrowLeft' || event.key === 'a') game.move(-1);
    if (event.key === 'ArrowRight' || event.key === 'd') game.move(1);
    if (event.key === ' ') { event.preventDefault(); game.activateSuper(); }
  }
  canvas.addEventListener('pointerdown', onPointerDown); canvas.addEventListener('pointerup', onPointerUp);
  window.addEventListener('keydown', onKey);
  el.querySelector('#crPause').addEventListener('click', () => { game.togglePause(); if (game.state !== C.PAUSED) { overlay.innerHTML = ''; overlay.dataset.kind = ''; } });
  el.querySelector('#crSuper').addEventListener('click', () => game.activateSuper());
  game.start(); sync();

  return {
    game,
    frame(dt) { if (destroyed) return; game.update(dt); renderer.frame(game, dt); feedbackTimer -= dt; if (feedbackTimer <= 0) feedback.classList.remove('show'); sync(); },
    finish() { game.exit(); },
    destroy() { if (destroyed) return; destroyed = true; canvas.removeEventListener('pointerdown', onPointerDown); canvas.removeEventListener('pointerup', onPointerUp); window.removeEventListener('keydown', onKey); renderer.destroy(); audio.destroy(); el.remove(); },
  };
}

function labelValue(key, value) {
  if (key === 'critical') return `${Math.round(value * 100)}%`;
  if (key === 'speed' || key === 'size' || key === 'coins' || key === 'combo') return `x${value}`;
  if (key === 'energy') return `${value} ENERGY`;
  return value;
}
function num(value) { return Math.round(Number(value) || 0).toLocaleString(); }
