/* Local content manager: all battle categories, custom battles, supporters.
   Countries use a built-in 195-entry dataset with only overrides persisted.
   Other categories persist full editable lists. Images are data-URLs
   (downscaled by the UI) so everything works fully offline. */

import { COUNTRIES } from '../data/countries.js';
import { YOUTUBERS } from '../data/youtubers.js';
import { SOCIAL } from '../data/social.js';
import { FOOTBALL } from '../data/football.js';
import { GAMES } from '../data/games.js';
import { CELEBRITIES } from '../data/celebrities.js';

const KEY = 'battleloop.content.v1';
const SUPPORTERS_KEY = 'battleloop.supporters.v1';

const DEFAULTS = {
  youtubers: YOUTUBERS,
  football: FOOTBALL,
  social: SOCIAL,
  games: GAMES,
  celebrities: CELEBRITIES,
};

export const DEFAULT_SUPPORTERS = [
  { name: 'BLASTZONE_21', count: 482100, color: '#38b6ff' },
  { name: 'TigerKingBD', count: 355700, color: '#8b5cf6' },
  { name: 'NoScopeNadia', count: 298450, color: '#ff3d71' },
  { name: 'LootLord', count: 241900, color: '#22e584' },
  { name: 'HeadshotHero', count: 187300, color: '#ffcf4d' },
  { name: 'ArenaQueen', count: 143800, color: '#f472b6' },
  { name: 'PixelPanther', count: 98600, color: '#22d3ee' },
  { name: 'GapWalker77', count: 76450, color: '#a3e635' },
  { name: 'FinalFlourish', count: 54120, color: '#ff8a3d' },
  { name: 'TheUnderdog', count: 31275, color: '#60a5fa' },
];

const COUNTRY_BY_NAME = new Map(COUNTRIES.map((c) => [c.name.toLowerCase(), c]));

export function createContent(storage) {
  let data = null;
  let supporters = null;

  function load() {
    if (data) return;
    try { data = JSON.parse(storage.get(KEY)); } catch { data = null; }
    if (!data || typeof data !== 'object') data = {};
    data.countries = data.countries || {};
    data.battles = Array.isArray(data.battles) ? data.battles : [];
    if (!Array.isArray(supporters)) {
      try { supporters = JSON.parse(storage.get(SUPPORTERS_KEY)); } catch { supporters = null; }
      if (!Array.isArray(supporters)) supporters = DEFAULT_SUPPORTERS.map((s) => ({ ...s }));
    }
  }
  const save = () => { try { storage.set(KEY, JSON.stringify(data)); } catch (e) { console.warn('[content] save failed', e); } };
  const saveSupporters = () => { try { storage.set(SUPPORTERS_KEY, JSON.stringify(supporters)); } catch { /* ignore */ } };

  function countryEmoji(name) {
    const c = COUNTRY_BY_NAME.get(String(name || '').toLowerCase());
    return c ? c.emoji : '🌍';
  }

  function materialize(cat) {
    load();
    if (DEFAULTS[cat] && data[cat] == null) data[cat] = DEFAULTS[cat].map((x) => ({ ...x }));
  }

  function decorate(e) {
    let emoji = e.emoji || null;
    if (!emoji && e.country) emoji = countryEmoji(e.country);
    return { ...e, emoji, color: e.color || null };
  }

  function entries(cat) {
    load();
    if (cat === 'countries') {
      return COUNTRIES.map((c) => decorate({ ...c, ...(data.countries[c.id] || {}) }));
    }
    materialize(cat);
    return (data[cat] || []).map(decorate);
  }

  return {
    countryEmoji,
    entries,
    list(cat) { return entries(cat); },

    getPool(cat, opts = {}) {
      load();
      if (cat === 'custom') {
        const b = data.battles.find((x) => x.id === opts.battleId) || data.battles[0];
        if (!b) return [];
        return b.contestants.filter((e) => e.enabled !== false).map(decorate);
      }
      return entries(cat).filter((e) => e.enabled !== false);
    },

    countEnabled(cat) { return this.getPool(cat).length; },

    setFlag(cat, id, patch) {
      load();
      if (cat === 'countries') {
        data.countries[id] = { ...(data.countries[id] || {}), ...patch };
      } else {
        materialize(cat);
        const it = (data[cat] || []).find((x) => x.id === id);
        if (!it) throw new Error('Contestant not found: ' + id);
        Object.assign(it, patch);
      }
      save();
      return this.list(cat).find((x) => x.id === id) || null;
    },

    add(cat, fields = {}) {
      load();
      materialize(cat);
      const item = {
        id: `${cat}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`,
        kind: cat,
        name: fields.name || 'New',
        sub: fields.sub || '',
        country: fields.country || null,
        url: fields.url || null,
        subs: fields.subs || null,
        emoji: fields.emoji || null,
        image: fields.image || null,
        color: fields.color || null,
        enabled: true,
        index: (data[cat] || []).length,
      };
      data[cat].push(item);
      save();
      return this.list(cat).find((x) => x.id === item.id);
    },

    remove(cat, id) {
      load();
      if (cat === 'countries') { delete data.countries[id]; save(); return; }
      materialize(cat);
      data[cat] = (data[cat] || []).filter((x) => x.id !== id);
      save();
    },

    resetCategory(cat) {
      load();
      if (cat === 'countries') data.countries = {};
      else data[cat] = null;
      save();
    },

    /* ---- custom battles ---- */
    listBattles() { load(); return data.battles; },
    getBattle(id) { load(); return data.battles.find((b) => b.id === id) || null; },
    createBattle(name) {
      load();
      const b = { id: 'b_' + Date.now().toString(36), name: name || 'NEW BATTLE', contestants: [] };
      data.battles.push(b);
      save();
      return b;
    },
    renameBattle(id, name) {
      load();
      const b = data.battles.find((x) => x.id === id);
      if (b) { b.name = name; save(); }
      return b;
    },
    deleteBattle(id) {
      load();
      data.battles = data.battles.filter((b) => b.id !== id);
      save();
    },
    addBattleContestant(battleId, { name, image, color } = {}) {
      load();
      const b = data.battles.find((x) => x.id === battleId);
      if (!b) throw new Error('Battle not found');
      b.contestants.push({
        id: `bc_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`,
        kind: 'custom', name: name || `FIGHTER ${b.contestants.length + 1}`, sub: '',
        emoji: null, image: image || null, color: color || null, enabled: true, index: b.contestants.length,
      });
      save();
      return b;
    },
    setBattleContestant(battleId, id, patch) {
      load();
      const b = data.battles.find((x) => x.id === battleId);
      if (!b) throw new Error('Battle not found');
      const it = b.contestants.find((x) => x.id === id);
      if (!it) throw new Error('Contestant not found');
      Object.assign(it, patch);
      save();
      return b;
    },
    removeBattleContestant(battleId, id) {
      load();
      const b = data.battles.find((x) => x.id === battleId);
      if (!b) return;
      b.contestants = b.contestants.filter((x) => x.id !== id);
      save();
    },

    /* ---- supporters ---- */
    getSupporters() { load(); return supporters; },
    saveSupporters(list) {
      supporters = list || [];
      saveSupporters();
    },
  };
}
