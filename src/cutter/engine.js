/* CUTTER ROAD 3D game manager.
 * Pure simulation/state: rendering, DOM and WebAudio are injected separately.
 * This keeps the feature isolated from the existing BattleLoop arena engine. */

import { RNG, randomSeed } from '../core/rng.js';
import { CUTTER_TUNING, CUTTER_MODES } from './config.js';
import { MATERIAL_STYLE, availableMaterials, makeGate, makeObject, makeObstacle } from './data.js';

export const C = Object.freeze({ READY: 'ready', COUNTDOWN: 'countdown', RUNNING: 'running', PAUSED: 'paused', GAMEOVER: 'gameover', EXITED: 'exited' });

const LANE_EPSILON = 0.42;

export class CutterGame {
  constructor({ mode = 'food', save, onEvent = null, seed = randomSeed() } = {}) {
    this.save = save;
    this.onEvent = onEvent || (() => {});
    this.mode = CUTTER_MODES.find((m) => m.id === mode)?.id || 'food';
    this.seed = seed >>> 0;
    this.rng = new RNG(this.seed);
    this.state = C.READY;
    this.objects = [];
    this.effects = [];
    this.objectId = 0;
    this.elapsed = 0;
    this.distance = 0;
    this.score = 0;
    this.coins = 0;
    this.scrap = 0;
    this.cuts = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.energy = 0;
    this.superT = 0;
    this.health = CUTTER_TUNING.baseHealth;
    this.lane = 0;
    this.laneTarget = 0;
    this.cutterAngle = 0;
    this.cameraShake = 0;
    this.spawnT = 0.72;
    this.gateT = 9;
    this.obstacleT = 7;
    this.countdownT = CUTTER_TUNING.countdown;
    this.lastHud = null;
    this.runBuff = { power: 0, speed: 0, size: 0, coins: 0, combo: 0, critical: 0 };
    this.completed = false;
  }

  get profile() { return this.save?.get?.() || { upgrades: {}, unlockedModes: [] }; }
  get modeInfo() { return CUTTER_MODES.find((m) => m.id === this.mode) || CUTTER_MODES[0]; }
  get difficulty() { return Math.min(30, this.elapsed / 12); }
  get speed() {
    const level = this.profile.upgrades?.speed || 0;
    return Math.min(CUTTER_TUNING.maxSpeed, CUTTER_TUNING.startSpeed + this.difficulty * .004 + level * .009 + this.runBuff.speed);
  }
  get power() { return 1 + (this.profile.upgrades?.power || 0) * .55 + this.runBuff.power + (this.superT > 0 ? 4.2 : 0); }
  get size() { return 1 + (this.profile.upgrades?.size || 0) * .07 + this.runBuff.size + (this.superT > 0 ? .16 : 0); }
  get criticalChance() { return Math.min(.6, .04 + (this.profile.upgrades?.critical || 0) * .025 + this.runBuff.critical); }
  get coinMultiplier() { return 1 + (this.profile.upgrades?.coins || 0) * .15 + this.runBuff.coins; }
  get comboPower() { return 1 + (this.profile.upgrades?.combo || 0) * .18 + this.runBuff.combo; }
  get energyCapacity() { return 100 + (this.profile.upgrades?.energy || 0) * 18; }
  get superReady() { return this.energy >= this.energyCapacity && this.superT <= 0; }

  start({ skipCountdown = false } = {}) {
    if (this.state === C.EXITED) return false;
    this.state = skipCountdown ? C.RUNNING : C.COUNTDOWN;
    this.countdownT = skipCountdown ? 0 : CUTTER_TUNING.countdown;
    this.emit('start', { mode: this.mode, seed: this.seed });
    if (skipCountdown) this.emit('go', {});
    return true;
  }

  pause() {
    if (this.state !== C.RUNNING && this.state !== C.COUNTDOWN) return false;
    this.previousState = this.state;
    this.state = C.PAUSED;
    this.emit('pause', {});
    return true;
  }
  resume() {
    if (this.state !== C.PAUSED) return false;
    this.state = this.previousState || C.RUNNING;
    this.emit('resume', {});
    return true;
  }
  togglePause() { return this.state === C.PAUSED ? this.resume() : this.pause(); }
  move(direction) {
    if (![C.RUNNING, C.COUNTDOWN].includes(this.state)) return false;
    const next = Math.max(-1, Math.min(1, this.laneTarget + Math.sign(direction)));
    if (next === this.laneTarget) return false;
    this.laneTarget = next;
    this.emit('move', { lane: next });
    return true;
  }
  setLane(lane) {
    this.laneTarget = Math.max(-1, Math.min(1, Math.round(lane)));
  }
  activateSuper() {
    if (!this.superReady || this.state !== C.RUNNING) return false;
    this.energy = 0;
    this.superT = 4.5 + (this.profile.upgrades?.energy || 0) * .24;
    this.cameraShake = Math.max(this.cameraShake, .65);
    this.emit('super', { duration: this.superT });
    return true;
  }

  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0 || this.state === C.PAUSED || this.state === C.GAMEOVER || this.state === C.EXITED) return;
    dt = Math.min(.1, dt);
    this.cameraShake = Math.max(0, this.cameraShake - dt * 1.8);
    this.cutterAngle += dt * (9 + this.speed * 20 + (this.superT > 0 ? 12 : 0));
    this.lane += (this.laneTarget - this.lane) * Math.min(1, dt * 11);

    if (this.state === C.COUNTDOWN) {
      const before = Math.ceil(this.countdownT);
      this.countdownT -= dt;
      const after = Math.ceil(this.countdownT);
      if (after !== before && after > 0) this.emit('countdown', { n: after });
      if (this.countdownT <= 0) { this.state = C.RUNNING; this.emit('go', {}); }
      this.emitHud();
      return;
    }
    if (this.state !== C.RUNNING) return;

    this.elapsed += dt;
    this.distance += this.speed * dt;
    this.superT = Math.max(0, this.superT - dt);
    this.spawnT -= dt;
    this.gateT -= dt;
    this.obstacleT -= dt;
    if (this.spawnT <= 0) this.spawnObject();
    if (this.gateT <= 0) this.spawnGate();
    if (this.obstacleT <= 0) this.spawnObstacle();

    const speed = this.speed;
    for (const object of this.objects) {
      object.z -= speed * object.speedFactor * dt;
      object.spin = (object.spin || 0) + dt * (object.kind === 'gate' ? .8 : 2.5);
    }
    this.resolveApproaches();
    this.objects = this.objects.filter((object) => object.z > CUTTER_TUNING.passZ && !object.removed).slice(0, CUTTER_TUNING.maxObjects);
    this.emit('idle', { intensity: speed });
    this.emitHud();
  }

  spawnObject() {
    const materials = availableMaterials(this.mode, this.profile.unlockedModes);
    const material = this.rng.pick(materials.length ? materials : ['food']);
    const object = makeObject({ id: `o_${++this.objectId}`, material, rng: this.rng, difficulty: this.difficulty });
    // Tough targets only enter after the player has enough time to understand lanes.
    if (this.elapsed < 35) object.durability = Math.min(object.durability, 1.55);
    this.objects.push(object);
    this.spawnT = Math.max(.36, 1.16 - this.difficulty * .024) * this.rng.range(.78, 1.22);
    this.emit('spawn', { object });
  }
  spawnGate() {
    if (this.objects.length < CUTTER_TUNING.maxObjects - 2) this.objects.push(makeGate({ id: `g_${++this.objectId}`, rng: this.rng }));
    this.gateT = this.rng.range(10, 16);
  }
  spawnObstacle() {
    if (this.elapsed < 25 || this.objects.length >= CUTTER_TUNING.maxObjects - 2) { this.obstacleT = 5; return; }
    this.objects.push(makeObstacle({ id: `x_${++this.objectId}`, rng: this.rng, difficulty: this.difficulty }));
    this.obstacleT = Math.max(4.5, this.rng.range(7.5, 13) - this.difficulty * .09);
  }

  resolveApproaches() {
    for (const object of this.objects) {
      if (object.removed || object.z > CUTTER_TUNING.cutterZ) continue;
      if (object.kind === 'gate') {
        // Gates have left/right doors. Staying in the centre deliberately
        // passes between them, while a lane choice applies one clear upgrade.
        if (object.z <= CUTTER_TUNING.cutterZ && Math.abs(this.lane) > .35) {
          const choice = this.lane < 0 ? object.choices[0] : object.choices[1];
          this.applyGate(choice);
          object.removed = true;
        }
        continue;
      }
      const inCutZone = Math.abs(object.lane - this.lane) <= LANE_EPSILON * this.size;
      if (inCutZone && (object.durability <= this.power || this.superT > 0)) {
        this.cut(object);
      } else if (object.z <= 0.035) {
        object.removed = true;
        if (object.kind === 'obstacle' || object.kind === 'tough') this.damage(object);
        else this.miss(object);
      }
    }
  }

  cut(object) {
    object.removed = true;
    const critical = this.rng.next() < this.criticalChance;
    const perfect = Math.abs(object.lane - this.lane) < .1;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.cuts++;
    const comboMultiplier = this.comboMultiplier();
    const multiplier = comboMultiplier * (this.superT > 0 ? 2 : 1) * (critical ? 2.5 : 1) * (perfect ? 1.2 : 1);
    const points = Math.round(object.points * multiplier);
    const coins = Math.max(1, Math.round(object.coinValue * this.coinMultiplier * (critical ? 1.5 : 1)));
    const style = MATERIAL_STYLE[object.material] || MATERIAL_STYLE.plastic;
    this.score += points;
    this.coins += coins;
    this.scrap += style.scrap;
    this.energy = Math.min(this.energyCapacity, this.energy + 4 + (object.rare ? 8 : 0) + (critical ? 5 : 0));
    this.cameraShake = Math.max(this.cameraShake, critical ? .42 : object.material === 'metal' ? .25 : .12);
    this.emit('cut', { object, points, coins, critical, perfect, multiplier, combo: this.combo, energy: this.energy });
    this.emit(style.sound, { object });
    if (critical) this.emit('critical', { object, points });
    else if (perfect) this.emit('perfect', { object, points });
    if ([3, 7, 15, 25].includes(this.combo)) this.emit('combo', { combo: this.combo, multiplier: comboMultiplier });
  }

  miss(object) {
    const old = this.combo;
    this.combo = 0;
    this.emit('miss', { object, previousCombo: old });
  }
  damage(object) {
    object.removed = true;
    this.health--;
    this.combo = 0;
    this.cameraShake = 0.9;
    this.emit('damage', { object, health: this.health });
    this.emit('heavy', { object });
    if (this.health <= 0) this.gameOver();
  }
  applyGate(choice) {
    if (!choice) return;
    if (choice.type === 'energy') this.energy = Math.min(this.energyCapacity, this.energy + choice.value);
    else if (Object.hasOwn(this.runBuff, choice.type)) this.runBuff[choice.type] += choice.value;
    this.emit('gate', { choice });
  }
  comboMultiplier() {
    const base = this.combo >= 25 ? 6 : this.combo >= 15 ? 5 : this.combo >= 7 ? 3 : this.combo >= 3 ? 2 : 1;
    return Number((base * this.comboPower).toFixed(2));
  }
  gameOver() {
    if (this.completed) return;
    this.state = C.GAMEOVER;
    this.completed = true;
    const profile = this.save?.addRun?.(this.result());
    this.emit('gameover', { result: this.result(), profile, highScore: this.score >= (profile?.bestScore || 0) });
  }
  exit() {
    if (this.state === C.EXITED) return;
    if (!this.completed && this.cuts > 0) this.save?.addRun?.(this.result());
    this.completed = true;
    this.state = C.EXITED;
    this.emit('exit', {});
  }
  result() {
    return { score: Math.floor(this.score), coins: this.coins, scrap: this.scrap, cuts: this.cuts, bestCombo: this.bestCombo, duration: Math.floor(this.elapsed), mode: this.mode, seed: this.seed };
  }
  emit(type, data) { try { this.onEvent(type, data, this); } catch { /* optional UI/audio observers never crash the simulation */ } }
  emitHud() {
    const hud = `${Math.floor(this.score)}|${this.coins}|${this.combo}|${Math.floor(this.energy)}|${this.health}|${this.state}`;
    if (hud !== this.lastHud) { this.lastHud = hud; this.emit('hud', this.snapshot()); }
  }
  snapshot() {
    return { state: this.state, mode: this.mode, score: Math.floor(this.score), coins: this.coins, scrap: this.scrap, combo: this.combo, bestCombo: this.bestCombo, energy: this.energy, energyCapacity: this.energyCapacity, superT: this.superT, health: this.health, power: this.power, speed: this.speed, size: this.size, multiplier: this.comboMultiplier(), elapsed: this.elapsed, distance: this.distance, cuts: this.cuts, lane: this.lane, seed: this.seed };
  }
}
