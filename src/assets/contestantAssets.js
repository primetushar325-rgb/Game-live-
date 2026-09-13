/*
 * Contestant asset registry and preload cache.
 *
 * This is deliberately local-first: bundled flags, user-imported data URLs and
 * explicitly configured direct URLs are the only primary sources. It never
 * searches/scrapes the web. Every normalized contestant has a generated,
 * offline SVG fallback so a token can never render as an empty circle.
 */

const cache = new Map(); // source -> { status, image, promise }
const PALETTE = ['#38b6ff', '#8b5cf6', '#22e584', '#ff3d71', '#ffcf4d', '#22d3ee'];

function escXml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function initials(name) {
  const words = String(name || '?').trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? `${words[0][0]}${words[1][0]}` : words[0]?.slice(0, 3) || '?').toUpperCase();
}

function hash(value) {
  let h = 2166136261;
  for (const char of String(value || 'battleloop')) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return h >>> 0;
}

function categoryLabel(category) {
  const labels = {
    countries: 'FLAG', country: 'FLAG',
    youtubers: 'VIDEO', youtuber: 'VIDEO',
    football: 'SPORT', social: 'SOCIAL', games: 'GAME',
    celebrities: 'STAR', custom: 'CUSTOM',
  };
  return labels[category] || 'BATTLE';
}

/** A compact identity-card fallback, encoded as a local image rather than text UI. */
export function makeFallbackImage({ id, name, category, color } = {}) {
  const tone = color || PALETTE[hash(id || name) % PALETTE.length];
  const label = categoryLabel(category);
  const monogram = initials(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${tone}"/><stop offset="1" stop-color="#101831"/></linearGradient></defs>
    <rect width="256" height="256" rx="32" fill="#080c1e"/><circle cx="128" cy="128" r="117" fill="url(#g)"/>
    <circle cx="128" cy="128" r="104" fill="none" stroke="white" stroke-opacity=".34" stroke-width="4"/>
    <text x="128" y="139" text-anchor="middle" font-family="Arial,sans-serif" font-size="82" font-weight="800" fill="white">${escXml(monogram)}</text>
    <rect x="48" y="174" width="160" height="29" rx="14" fill="#050712" fill-opacity=".58"/>
    <text x="128" y="194" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="700" letter-spacing="2" fill="white">${escXml(label)}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Returns the common contestant contract used by content, physics, UI and
 * history. Existing V1 records are upgraded in memory without losing fields.
 */
export function normalizeContestant(record = {}, category = null) {
  const resolvedCategory = record.category || record.kind || category || 'custom';
  const name = String(record.name || 'UNNAMED CONTESTANT');
  const id = String(record.id || `${resolvedCategory}_${hash(name).toString(36)}`);
  const metadata = {
    ...(record.metadata && typeof record.metadata === 'object' ? record.metadata : {}),
    ...(record.country ? { country: record.country } : {}),
    ...(record.sub ? { subtitle: record.sub } : {}),
    ...(record.code ? { code: record.code } : {}),
  };
  return {
    ...record,
    id,
    name,
    shortName: record.shortName || record.tag || initials(name),
    category: resolvedCategory,
    image: record.image || null,
    fallbackImage: record.fallbackImage || makeFallbackImage({ id, name, category: resolvedCategory, color: record.color }),
    enabled: record.enabled !== false,
    metadata,
  };
}

function hasDomImage() {
  return typeof Image !== 'undefined';
}

/** Load one source once. A failure is remembered so the application does not retry it every frame. */
export function loadImageAsset(source, { timeout = 4500 } = {}) {
  if (!source || !hasDomImage()) return Promise.resolve(null);
  const existing = cache.get(source);
  if (existing?.promise) return existing.promise;
  if (existing?.status === 'ready') return Promise.resolve(existing.image);
  if (existing?.status === 'failed') return Promise.resolve(null);

  const item = { status: 'loading', image: null, promise: null };
  item.promise = new Promise((resolve) => {
    let done = false;
    const finish = (image, status) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      item.status = status;
      item.image = image;
      resolve(image);
    };
    const image = new Image();
    image.decoding = 'async';
    image.onload = async () => {
      // decode lets Canvas reliably use cached images on Android WebView too.
      try { await image.decode?.(); } catch { /* loaded images can still be drawn */ }
      finish(image.naturalWidth > 0 ? image : null, image.naturalWidth > 0 ? 'ready' : 'failed');
    };
    image.onerror = () => finish(null, 'failed');
    const timer = setTimeout(() => finish(null, 'failed'), Math.max(250, timeout));
    image.src = source;
  });
  cache.set(source, item);
  return item.promise;
}

/** Primary image first, then the local fallback. Always resolves; never throws into gameplay. */
export async function loadContestantAsset(record, opts = {}) {
  const contestant = normalizeContestant(record);
  const primary = await loadImageAsset(contestant.image, opts);
  if (primary) return primary;
  return loadImageAsset(contestant.fallbackImage, opts);
}

/** Preload a match roster before it enters the arena. */
export async function preloadContestantAssets(records, opts = {}) {
  const all = Array.isArray(records) ? records : [];
  const loaded = await Promise.all(all.map(async (record) => {
    const contestant = normalizeContestant(record);
    const image = await loadContestantAsset(contestant, opts);
    return { id: contestant.id, image, contestant };
  }));
  return loaded;
}

/** Ready-only lookup, useful to render an immediate frame without waiting. */
export function cachedContestantAsset(record) {
  const contestant = normalizeContestant(record);
  for (const source of [contestant.image, contestant.fallbackImage]) {
    const entry = source ? cache.get(source) : null;
    if (entry?.status === 'ready' && entry.image) return entry.image;
  }
  return null;
}

export function clearAssetCache() {
  cache.clear();
}
