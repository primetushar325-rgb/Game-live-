/* App orchestrator: stores, engine, audio, main loop, navigation. */

import { createLocalStorage } from '../store/storage.js';
import { createSettings } from '../store/settings.js';
import { createContent } from '../store/content.js';
import { createHistory } from '../store/history.js';
import { EventBus } from '../core/events.js';
import { Match, M } from '../engine/match.js';
import { CTA_TEMPLATES } from '../data/ctas.js';
import { createSfx } from '../audio/sfx.js';
import { createVoice } from '../audio/voice.js';
import { createMusic } from '../audio/music.js';
import { unlockAudio, muteState } from '../audio/audioManager.js';
import { createRenderer } from '../render/renderer.js';
import { makeToast } from './toast.js';
import { renderSplash, renderHome } from './screens-home.js';
import { renderContent } from './screens-content.js';
import { renderSettings } from './screens-settings.js';
import { renderHistory, renderTest } from './screens-misc.js';
import { createLiveView } from './live.js';

const QUALITY_ORDER = ['LOW', 'MEDIUM', 'HIGH'];

export function createApp(root) {
  const storage = createLocalStorage();
  const settings = createSettings(storage);
  const content = createContent(storage);
  const history = createHistory(storage);
  const bus = new EventBus();
  const toast = makeToast(root);

  const match = new Match({ settings, content, bus, assignId: () => history.nextId() });
  match.setCtaTemplates(CTA_TEMPLATES);

  /* ---------- audio hub ---------- */
  const sfx = createSfx(settings);
  const voice = createVoice(settings, bus);
  const music = createMusic(settings, bus);

  const audioWiring = [
    bus.on('sfx:collision', ({ impact }) => (impact > 320 ? sfx.strong(impact) : sfx.collision(impact))),
    bus.on('sfx:wall', ({ impact }) => sfx.wall(impact)),
    bus.on('eliminated', () => sfx.eliminated()),
    bus.on('countdown', ({ n }) => sfx.countdown(n)),
    bus.on('match:go', () => sfx.countdown(0)),
    bus.on('match:start', () => sfx.roundStart()),
    bus.on('round:start', () => sfx.roundStart()),
    bus.on('final:two', () => sfx.final()),
    bus.on('winner:show', () => sfx.winner()),
    bus.on('cta:start', () => sfx.cta()),
  ];

  // record finished tournaments/matches into history when the winner is decided
  bus.on('round:end', ({ isFinal, winner }) => {
    if (isFinal && winner) {
      try { history.add(match.result()); } catch { /* ignore */ }
    }
  });

  /* ---------- views ---------- */
  let liveView = null;
  function clearRoot() {
    liveView?.destroy();
    liveView = null;
    if (app._testTimer) { clearInterval(app._testTimer); app._testTimer = null; }
    root.innerHTML = '';
  }

  const app = {
    root, settings, content, history, bus, match, toast, sfx, voice, music,
    clearRoot,

    navigate(name) {
      if (name === 'live') return;
      match.abandon();
      clearRoot();
      if (name === 'home') renderHome(app);
      else if (name === 'content') renderContent(app);
      else if (name === 'settings') renderSettings(app);
      else if (name === 'history') renderHistory(app);
      else if (name === 'test') renderTest(app);
      else renderHome(app);
    },

    startBattle(cfg) {
      clearRoot();
      let view;
      try {
        view = createLiveView(app);
      } catch (e) {
        toast('Live screen failed to start: ' + e.message);
        renderHome(app);
        return;
      }
      liveView = view;
      try {
        match.startMatch({
          category: cfg.category,
          count: cfg.count,
          preset: cfg.preset,
          battleId: cfg.battleId || null,
          autoLive: !!cfg.autoLive,
          id: history.nextId(),
        });
      } catch (e) {
        toast(e.message, 5000);
        clearRoot();
        renderHome(app);
        return;
      }
      app.setQuality(settings.get().quality);
    },

    exitLive() {
      match.abandon();
      clearRoot();
      renderHome(app);
    },

    setMuted(b) {
      muteState.on = !!b;
      music.applyVol();
    },

    setQuality(key) {
      app.quality = key;
      liveView?.setQuality?.(key);
    },

    makeRenderer(opts) {
      return createRenderer({
        ...opts,
        settings,
        bus,
        matchRef: opts.matchRef,
      });
    },

    quality: settings.get().quality,
  };

  /* ---------- main loop ---------- */
  let last = performance.now();
  let ema = 16;
  let slowFor = 0;

  function loop(ts) {
    const dt = Math.min(0.1, (ts - last) / 1000);
    last = ts;
    match.update(dt);
    if (liveView) liveView.frame(dt);
    // auto quality (FPS protection)
    if (settings.get().autoQuality) {
      ema = ema * 0.95 + (dt * 1000) * 0.05;
      if (ema > 21.5) slowFor += dt; else slowFor = 0;
      if (slowFor > 2.5) {
        slowFor = 0;
        const idx = QUALITY_ORDER.indexOf(app.quality);
        if (idx > 0) {
          app.quality = QUALITY_ORDER[idx - 1];
          settings.set({ quality: app.quality });
          app.setQuality(app.quality);
          toast(`Auto quality → ${app.quality} (FPS protection)`, 2500);
        }
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* ---------- one-time setup ---------- */
  const unlock = () => {
    unlockAudio();
    music.applyVol();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (match.state === M.BATTLE || match.state === M.COUNTDOWN)) {
      match.pause();
    }
  });

  renderSplash(app);

  return app;
}
