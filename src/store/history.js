/* Match history — local, offline, capped at 300 entries. */

const KEY = 'battleloop.history.v1';
const CAP = 300;

export function createHistory(storage) {
  let items = [];
  let counter = 0;
  try {
    const raw = JSON.parse(storage.get(KEY));
    if (raw && Array.isArray(raw.items)) items = raw.items;
    if (raw && Number.isFinite(raw.counter)) counter = raw.counter;
  } catch { /* fresh */ }

  const save = () => {
    try { storage.set(KEY, JSON.stringify({ items, counter })); } catch { /* ignore */ }
  };

  return {
    list() { return items; },
    nextId() { return counter + 1; },
    add(entry) {
      items.unshift(entry);
      if (items.length > CAP) items.length = CAP;
      counter = Math.max(counter, entry.id);
      save();
      return entry;
    },
    clear() {
      items = [];
      save();
    },
  };
}
