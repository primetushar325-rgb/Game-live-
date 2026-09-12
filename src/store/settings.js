import { DEFAULT_SETTINGS } from '../config/defaults.js';

const KEY = 'battleloop.settings.v1';

export function createSettings(storage) {
  let s = { ...DEFAULT_SETTINGS };
  const raw = storage.get(KEY);
  if (raw) {
    try { s = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }; } catch { /* keep defaults */ }
  }
  return {
    get() { return s; },
    set(patch) {
      Object.assign(s, patch);
      const ok = storage.set(KEY, JSON.stringify(s));
      if (ok === false) throw new Error('Settings could not be saved (storage full?)');
    },
    reset() {
      s = { ...DEFAULT_SETTINGS };
      storage.set(KEY, JSON.stringify(s));
    },
  };
}
