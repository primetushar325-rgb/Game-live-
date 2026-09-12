/* App-wide defaults & constants. All times in seconds. */

export const DESIGN_W = 1080;
export const DESIGN_H = 1920;

export const ARENA = {
  cx: 540,
  cy: 1075,
  radiusBySize: { S: 360, M: 420, L: 470 },
};

export const PHYS = {
  substep: 1 / 120,          // physics substep
  maxFrameDt: 0.125,         // clamp (allows time-accelerated QA)
  wallRestitution: 0.92,
  maxSpeedBySpeed: { LOW: 520, NORMAL: 780, HIGH: 1080 },
  startSpeedBySpeed: { LOW: 150, NORMAL: 240, HIGH: 340 },
  jitter: 240,               // random accel units/s^2 keeps tokens lively
  stormEvery: [7, 14],       // random interval
  stormImpulse: 95,
  antiStuckCheck: 0.5,       // seconds between checks
  antiStuckMinSpeed: 12,     // if avg speed below this -> boost
};

export const QUALITY = {
  LOW: { particles: 80, sparkBurst: 0, labels: false, glowPasses: 2 },
  MEDIUM: { particles: 280, sparkBurst: 2, labels: true, glowPasses: 3 },
  HIGH: { particles: 700, sparkBurst: 5, labels: true, glowPasses: 3 },
};

export const DEFAULT_SETTINGS = {
  // match
  ballCount: 195,
  customCount: 195,
  speed: 'NORMAL',
  collision: 0.95,
  arenaSize: 'M',
  gapSize: 42,          // degrees
  gapRotate: true,
  gapSpeed: 6,          // deg/sec
  matchDuration: 45 * 60,
  countdown: 3,
  winnerDuration: 12,
  ctaDuration: 8,
  intermission: 7,
  // tournament preset: 'FULL' (195->70->30->10->1) | 'SCALE' (proportional) | 'SINGLE'
  tournamentPreset: 'FULL',
  // audio
  musicOn: true,
  musicVolume: 55,
  musicMode: 'AUTO',   // AUTO | RANDOM | OFF
  sfxOn: true,
  sfxVolume: 80,
  voiceOn: true,
  voiceVolume: 100,
  voiceRate: 1.05,
  announceEliminations: true,
  // visuals
  particles: true,
  quality: 'HIGH',
  autoQuality: true,
  watermark: true,
  // live
  autoLive: false,
  supportSim: true,
  cta: '8',
  intermissionSec: 7,
};

export const COUNT_PRESETS = [20, 30, 50, 70, 100, 195];

/* Tournament round templates: start -> [qualify per round] */
export const TOURNAMENT_FULL = { start: 195, qualifies: [70, 30, 10, 1] };

export const CATEGORIES = ['countries', 'youtubers', 'football', 'social', 'games', 'celebrities', 'custom'];

export const CATEGORY_META = {
  countries: { title: 'COUNTRY FLAG BATTLE', short: 'COUNTRY', unit: 'FLAGS', banner: 'COUNTRY FLAG BATTLE' },
  youtubers: { title: 'YOUTUBER BATTLE', short: 'YOUTUBER', unit: 'STREAMERS', banner: 'YOUTUBER BATTLE' },
  football: { title: 'FOOTBALL BATTLE', short: 'FOOTBALL', unit: 'PLAYERS', banner: 'FOOTBALL BATTLE' },
  social: { title: 'SOCIAL MEDIA BATTLE', short: 'SOCIAL', unit: 'APPS', banner: 'SOCIAL MEDIA BATTLE' },
  games: { title: 'GAMING BATTLE', short: 'GAMING', unit: 'GAMES', banner: 'GAMING BATTLE' },
  celebrities: { title: 'CELEBRITY BATTLE', short: 'CELEBRITY', unit: 'STARS', banner: 'CELEBRITY BATTLE' },
  custom: { title: 'CUSTOM BATTLE', short: 'CUSTOM', unit: 'BATTLE', banner: 'CUSTOM BATTLE' },
  quick: { title: 'QUICK BATTLE', short: 'QUICK', unit: 'PLAYERS', banner: 'QUICK BATTLE' },
  random: { title: 'RANDOM BATTLE', short: 'RANDOM', unit: 'PLAYERS', banner: 'RANDOM BATTLE' },
};

export const VERSION = '1.0.0';
