/* Storage adapters: localStorage in the browser, in-memory for headless QA. */

export function createMemoryStorage() {
  const m = new Map();
  return {
    get(k) { return m.has(k) ? m.get(k) : null; },
    set(k, v) { m.set(k, v); },
    remove(k) { m.delete(k); },
  };
}

export function createLocalStorage() {
  if (typeof localStorage === 'undefined') return createMemoryStorage();
  return {
    get(k) {
      try { return localStorage.getItem(k); } catch { return null; }
    },
    set(k, v) {
      try { localStorage.setItem(k, v); return true; }
      catch (e) { console.warn('[storage] write failed', e); return false; }
    },
    remove(k) {
      try { localStorage.removeItem(k); } catch { /* ignore */ }
    },
  };
}
