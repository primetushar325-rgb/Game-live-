/* CUTTER ROAD 3D — isolated mode configuration.
 * The renderer uses a lightweight Canvas pseudo-3D scene so no external model,
 * texture or online asset is required on Android/WebView. */

export const CUTTER_MODES = [
  { id: 'food', name: 'FOOD MODE', material: 'food', color: '#ff6b57', icon: 'apple', unlock: 0, description: 'Soft objects, fast combos' },
  { id: 'sports', name: 'SPORTS MODE', material: 'sports', color: '#38b6ff', icon: 'football', unlock: 0, description: 'Balls, bats and trophies' },
  { id: 'toys', name: 'TOY MODE', material: 'plastic', color: '#a879ff', icon: 'gamepad', unlock: 0, description: 'Light plastic breakables' },
  { id: 'wood', name: 'WOOD MODE', material: 'wood', color: '#c8874b', icon: 'grid', unlock: 0, description: 'Planks, logs and crates' },
  { id: 'metal', name: 'METAL MODE', material: 'metal', color: '#94a7c8', icon: 'gear', unlock: 80, description: 'Sparks and heavy rewards' },
  { id: 'treasure', name: 'TREASURE MODE', material: 'treasure', color: '#ffcf4d', icon: 'trophy', unlock: 180, description: 'Rare, valuable targets' },
  { id: 'future', name: 'FUTURE MODE', material: 'future', color: '#2df7e2', icon: 'zap', unlock: 320, description: 'High-tech cutting challenge' },
  { id: 'random', name: 'ENDLESS RANDOM', material: 'random', color: '#f472b6', icon: 'shuffle', unlock: 450, description: 'A fair mix of unlocked materials' },
];

export const UPGRADE_DEFS = {
  power: { label: 'BLADE POWER', icon: 'cutter', start: 1, step: 0.55, max: 12, baseCost: 80, costScale: 1.55, description: 'Cuts stronger objects.' },
  speed: { label: 'BLADE SPEED', icon: 'waves', start: 1, step: 0.12, max: 12, baseCost: 70, costScale: 1.5, description: 'Raises cutter rotation and road pace.' },
  size: { label: 'BLADE SIZE', icon: 'target', start: 1, step: 0.07, max: 10, baseCost: 90, costScale: 1.6, description: 'Widens the automatic cutting zone.' },
  critical: { label: 'CRITICAL CHANCE', icon: 'star', start: 0.04, step: 0.025, max: 10, baseCost: 110, costScale: 1.65, description: 'More powerful critical cuts.' },
  coins: { label: 'COIN MULTIPLIER', icon: 'coin', start: 1, step: 0.15, max: 10, baseCost: 100, costScale: 1.62, description: 'Earn more coins per cut.' },
  combo: { label: 'COMBO POWER', icon: 'fire', start: 1, step: 0.18, max: 10, baseCost: 120, costScale: 1.65, description: 'Improves score multipliers.' },
  energy: { label: 'ENERGY CAPACITY', icon: 'bolt', start: 100, step: 18, max: 10, baseCost: 95, costScale: 1.58, description: 'Extends Super Cut energy.' },
};

export const CUTTER_DEFAULT_SAVE = {
  version: 1,
  coins: 0,
  scrap: 0,
  bestScore: 0,
  bestCombo: 0,
  totalCuts: 0,
  runs: 0,
  unlockedModes: ['food', 'sports', 'toys', 'wood'],
  upgrades: Object.fromEntries(Object.keys(UPGRADE_DEFS).map((key) => [key, 0])),
};

export const CUTTER_TUNING = {
  lanes: [-1, 0, 1],
  spawnZ: 1.18,
  cutterZ: 0.115,
  passZ: -0.1,
  maxObjects: 38,
  maxParticles: 150,
  startSpeed: 0.17,
  maxSpeed: 0.38,
  countdown: 3,
  baseHealth: 3,
};
