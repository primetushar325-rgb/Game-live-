/* Procedural cuttable-object definitions. These are data + draw-shape names,
 * not downloaded models, so Cutter Road is entirely offline/copyright-safe. */

const byMaterial = {
  food: [
    ['Apple', 'apple', '#f0444f', 1, 10], ['Burger', 'burger', '#e8a447', 1.1, 14],
    ['Pizza', 'pizza', '#ffbe3d', 1.15, 16], ['Cake', 'cake', '#f29ab6', 1.25, 20],
    ['Bread', 'bread', '#d89b5a', 1.05, 12], ['Watermelon', 'melon', '#38ba65', 1.4, 25],
    ['Vegetable Crate', 'crate', '#55a95c', 1.35, 24],
  ],
  sports: [
    ['Football', 'football', '#f3f5f6', 1.1, 14], ['Basketball', 'basketball', '#ec7a2f', 1.2, 17],
    ['Tennis Ball', 'tennis', '#d8f34e', 1, 12], ['Baseball', 'baseball', '#f6f0df', 1.15, 15],
    ['Bat', 'bat', '#c68b50', 1.35, 25], ['Helmet', 'helmet', '#3188d3', 1.7, 35],
    ['Cup Trophy', 'trophy', '#ffcf4d', 1.8, 40],
  ],
  plastic: [
    ['Toy Car', 'car', '#ef5c60', 1.2, 15], ['Building Blocks', 'blocks', '#4e9ef7', 1.15, 14],
    ['Toy Ball', 'ball', '#a879ff', 1, 12], ['Puzzle', 'puzzle', '#ffd34d', 1.3, 20],
    ['Toy Robot', 'robot', '#74d9e2', 1.75, 38], ['Plastic Crate', 'crate', '#b884ef', 1.55, 30],
  ],
  wood: [
    ['Wood Block', 'block', '#bd7941', 1.25, 20], ['Wood Plank', 'plank', '#d09253', 1.4, 24],
    ['Log', 'log', '#9c5a31', 1.65, 35], ['Wood Crate', 'crate', '#c5864b', 1.7, 40],
    ['Tree Slice', 'log', '#d8a66a', 1.85, 45],
  ],
  metal: [
    ['Metal Block', 'block', '#8794a8', 2.1, 50], ['Steel Pipe', 'pipe', '#b2c0d3', 2.3, 58],
    ['Gear', 'gear', '#9cadc4', 2.45, 65], ['Metal Plate', 'plate', '#71849b', 2.75, 75],
    ['Machine Part', 'robot', '#b6c6d8', 3, 85],
  ],
  treasure: [
    ['Gold Block', 'block', '#f7c948', 2.5, 85], ['Coin Box', 'crate', '#ffdb58', 2.25, 75],
    ['Crystal', 'crystal', '#55ecff', 2.7, 100], ['Diamond', 'diamond', '#a8ffff', 3, 120],
    ['Treasure Chest', 'chest', '#d89b37', 3.2, 140],
  ],
  future: [
    ['Energy Block', 'block', '#38efe2', 3, 100], ['Robot Core', 'robot', '#9b7dff', 3.25, 115],
    ['Pulse Crate', 'crate', '#2cb9ff', 3.45, 130], ['Plasma Cell', 'crystal', '#e970ff', 3.7, 155],
    ['Drone Shell', 'gear', '#c0d1ea', 3.9, 175],
  ],
};

export const MATERIAL_STYLE = {
  food: { particles: '#ff8068', sound: 'food', scrap: 1 },
  sports: { particles: '#b6e8ff', sound: 'plastic', scrap: 1 },
  plastic: { particles: '#d4a6ff', sound: 'plastic', scrap: 1 },
  wood: { particles: '#db9c5d', sound: 'wood', scrap: 2 },
  metal: { particles: '#f7cf66', sound: 'metal', scrap: 5 },
  treasure: { particles: '#fff19a', sound: 'treasure', scrap: 3 },
  future: { particles: '#65fff2', sound: 'future', scrap: 6 },
};

export function materialForMode(mode) {
  return ({ food: 'food', sports: 'sports', toys: 'plastic', wood: 'wood', metal: 'metal', treasure: 'treasure', future: 'future' })[mode] || 'random';
}

export function availableMaterials(mode, unlocked = []) {
  const requested = materialForMode(mode);
  if (requested !== 'random') return [requested];
  const unlockedSet = new Set(unlocked || []);
  const modeMap = { food: 'food', sports: 'sports', toys: 'plastic', wood: 'wood', metal: 'metal', treasure: 'treasure', future: 'future' };
  return Object.entries(modeMap).filter(([key]) => unlockedSet.has(key)).map(([, value]) => value).filter(Boolean);
}

export function makeObject({ id, material, rng, difficulty = 0 }) {
  const list = byMaterial[material] || byMaterial.food;
  const [name, shape, color, baseDurability, basePoints] = list[rng.int(0, list.length - 1)];
  const rare = rng.next() < Math.min(0.16, 0.025 + difficulty * 0.004);
  const size = rng.range(0.83, rare ? 1.34 : 1.16);
  return {
    id, name: rare ? `RARE ${name}` : name, shape, material, color,
    durability: Number((baseDurability + difficulty * rng.range(0.035, 0.09)).toFixed(2)),
    points: Math.round(basePoints * (rare ? 2 : 1)),
    coinValue: Math.max(1, Math.round(basePoints / 10) + (rare ? 4 : 0)),
    size, rare, lane: rng.pick([-1, 0, 1]), z: 1.18,
    speedFactor: rng.range(0.86, 1.15), kind: 'cuttable', spin: rng.range(-2, 2),
  };
}

export function makeObstacle({ id, rng, difficulty = 0 }) {
  const hard = difficulty > 4 && rng.next() < Math.min(0.28, difficulty * 0.017);
  return {
    id, name: hard ? 'REINFORCED BLOCKER' : (rng.next() < 0.5 ? 'ROAD BARRIER' : 'ROAD GAP'),
    shape: hard ? 'block' : 'barrier', material: hard ? 'metal' : 'hazard',
    color: hard ? '#8898ad' : '#ff5574', durability: hard ? 2.8 + difficulty * 0.12 : 99,
    points: 0, coinValue: 0, size: hard ? 1.35 : 1.25,
    rare: false, lane: rng.pick([-1, 0, 1]), z: 1.18,
    speedFactor: rng.range(0.95, 1.12), kind: hard ? 'tough' : 'obstacle', spin: 0,
  };
}

export function makeGate({ id, rng }) {
  const effects = [
    { type: 'power', value: 0.6, label: '+ POWER', color: '#ff7b5d' },
    { type: 'speed', value: 0.18, label: '+ SPEED', color: '#47c7ff' },
    { type: 'size', value: 0.12, label: '+ SIZE', color: '#a879ff' },
    { type: 'coins', value: 0.35, label: '+ COINS', color: '#ffcf4d' },
    { type: 'combo', value: 0.4, label: '+ COMBO', color: '#f472b6' },
    { type: 'energy', value: 30, label: '+ ENERGY', color: '#2df7e2' },
    { type: 'critical', value: 0.08, label: '+ CRIT', color: '#ffffff' },
  ];
  const left = rng.pick(effects);
  let right = rng.pick(effects);
  while (right.type === left.type) right = rng.pick(effects);
  return {
    id, name: 'CHOICE GATE', kind: 'gate', material: 'future', shape: 'gate', z: 1.18,
    speedFactor: 0.95, choices: [{ ...left, lane: -1 }, { ...right, lane: 1 }], lane: 0,
  };
}
