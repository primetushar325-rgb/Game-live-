/* CUTTER ROAD 3D persistence. Uses the existing storage adapter, is namespaced
 * away from BattleLoop match data, and recovers safely from corrupt saves. */

import { CUTTER_DEFAULT_SAVE, CUTTER_MODES, UPGRADE_DEFS } from './config.js';

const KEY = 'battleloop.cutter-road.v1';

function clean(raw) {
  const base = structuredCloneSafe(CUTTER_DEFAULT_SAVE);
  if (!raw || typeof raw !== 'object') return base;
  for (const key of ['coins', 'scrap', 'bestScore', 'bestCombo', 'totalCuts', 'runs']) {
    const value = Number(raw[key]);
    if (Number.isFinite(value) && value >= 0) base[key] = Math.floor(value);
  }
  const allowed = new Set(CUTTER_MODES.map((mode) => mode.id));
  if (Array.isArray(raw.unlockedModes)) {
    base.unlockedModes = [...new Set(raw.unlockedModes.filter((id) => allowed.has(id)))];
    for (const id of CUTTER_DEFAULT_SAVE.unlockedModes) if (!base.unlockedModes.includes(id)) base.unlockedModes.push(id);
  }
  if (raw.upgrades && typeof raw.upgrades === 'object') {
    for (const key of Object.keys(UPGRADE_DEFS)) {
      const level = Number(raw.upgrades[key]);
      if (Number.isFinite(level)) base.upgrades[key] = Math.max(0, Math.min(UPGRADE_DEFS[key].max, Math.floor(level)));
    }
  }
  return base;
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value));
}

export function upgradeCost(key, level) {
  const def = UPGRADE_DEFS[key];
  if (!def) return Infinity;
  return Math.round(def.baseCost * Math.pow(def.costScale, Math.max(0, level)));
}

export function upgradeValue(key, level) {
  const def = UPGRADE_DEFS[key];
  if (!def) return 0;
  return Number((def.start + def.step * Math.max(0, level)).toFixed(key === 'critical' ? 3 : 2));
}

export function createCutterSave(storage) {
  let state;
  try { state = clean(JSON.parse(storage.get(KEY))); } catch { state = clean(null); }

  function persist() {
    try { storage.set(KEY, JSON.stringify(state)); } catch { /* gameplay continues in memory */ }
  }
  function snapshot() { return structuredCloneSafe(state); }
  function unlockProgress() {
    for (const mode of CUTTER_MODES) {
      if (state.totalCuts >= mode.unlock && !state.unlockedModes.includes(mode.id)) state.unlockedModes.push(mode.id);
    }
  }

  return {
    get: snapshot,
    isUnlocked(id) { return state.unlockedModes.includes(id); },
    upgradeValue(key) { return upgradeValue(key, state.upgrades[key] || 0); },
    upgradeCost(key) { return upgradeCost(key, state.upgrades[key] || 0); },
    buyUpgrade(key) {
      const def = UPGRADE_DEFS[key];
      if (!def) return { ok: false, reason: 'Unknown upgrade' };
      const level = state.upgrades[key] || 0;
      if (level >= def.max) return { ok: false, reason: 'MAX LEVEL' };
      const cost = upgradeCost(key, level);
      if (state.coins < cost) return { ok: false, reason: `Need ${cost - state.coins} more coins`, cost };
      state.coins -= cost;
      state.upgrades[key] = level + 1;
      persist();
      return { ok: true, cost, level: state.upgrades[key], value: upgradeValue(key, state.upgrades[key]) };
    },
    addRun(result = {}) {
      const coins = Math.max(0, Math.floor(Number(result.coins) || 0));
      const scrap = Math.max(0, Math.floor(Number(result.scrap) || 0));
      state.coins += coins;
      state.scrap += scrap;
      state.bestScore = Math.max(state.bestScore, Math.max(0, Math.floor(Number(result.score) || 0)));
      state.bestCombo = Math.max(state.bestCombo, Math.max(0, Math.floor(Number(result.bestCombo) || 0)));
      state.totalCuts += Math.max(0, Math.floor(Number(result.cuts) || 0));
      state.runs++;
      unlockProgress();
      persist();
      return snapshot();
    },
    reset() { state = structuredCloneSafe(CUTTER_DEFAULT_SAVE); persist(); },
  };
}
