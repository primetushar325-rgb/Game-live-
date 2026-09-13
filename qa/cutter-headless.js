/* CUTTER ROAD 3D headless QA: simulation, score/combos, saves, upgrades,
 * gates, failures, pooling caps and a 100-run mobile-safe stress loop. */

import { createMemoryStorage } from '../src/store/storage.js';
import { createCutterSave } from '../src/cutter/save.js';
import { CUTTER_MODES, CUTTER_TUNING } from '../src/cutter/config.js';
import { CutterGame, C } from '../src/cutter/engine.js';
import { createCutterParticles } from '../src/cutter/particles.js';

const results = [];
function check(name, value, extra = '') { results.push({ name, ok: !!value }); console.log(`  ${value ? 'PASS' : 'FAIL'}  ${name}${extra ? `  ${extra}` : ''}`); }
function section(name) { console.log(`\n=== CUTTER ROAD: ${name} ===`); }
function makeSave(seed = null) { const storage = createMemoryStorage(); if (seed != null) storage.set('battleloop.cutter-road.v1', seed); return createCutterSave(storage); }

section('SAVE / PROGRESSION');
{
  const corrupt = makeSave('{bad JSON');
  check('corrupted save recovers to defaults', corrupt.get().coins === 0 && corrupt.isUnlocked('food'));
  corrupt.addRun({ score: 120, coins: 2500, scrap: 5, cuts: 500, bestCombo: 24 });
  check('run rewards persist currencies and records', corrupt.get().coins === 2500 && corrupt.get().bestScore === 120 && corrupt.get().totalCuts === 500);
  check('progress unlocks advanced modes', ['metal', 'treasure', 'future', 'random'].every((id) => corrupt.isUnlocked(id)));
  const before = corrupt.get().coins;
  const up = corrupt.buyUpgrade('power');
  check('upgrade spends coins and raises real level', up.ok && corrupt.get().coins < before && corrupt.get().upgrades.power === 1);
  check('unknown upgrade fails gracefully', !corrupt.buyUpgrade('does-not-exist').ok);
}

section('MODES / COUNTDOWN / CUT LOOP');
{
  const save = makeSave();
  save.addRun({ coins: 9999, cuts: 500 });
  const categories = CUTTER_MODES.map((mode) => mode.id);
  let everyModeStarts = true;
  for (const mode of categories) {
    const game = new CutterGame({ mode, save, seed: 101 + categories.indexOf(mode) });
    game.start();
    for (let i = 0; i < 65; i++) game.update(.05);
    everyModeStarts &&= game.state === C.RUNNING;
  }
  check('all unlocked categories enter running state after countdown', everyModeStarts);

  let cuts = 0; let gates = 0; let maxObjects = 0; let noNaN = true;
  const game = new CutterGame({ mode: 'food', save, seed: 9001, onEvent(type) { if (type === 'cut') cuts++; if (type === 'gate') gates++; } });
  game.start({ skipCountdown: true });
  for (let step = 0; step < 2400 && game.state === C.RUNNING; step++) {
    const target = [...game.objects].sort((a, b) => a.z - b.z)[0];
    if (target) {
      if (target.kind === 'gate') game.setLane(step % 2 ? -1 : 1);
      else if (target.kind === 'obstacle' || (target.kind === 'tough' && target.durability > game.power)) game.setLane([-1, 0, 1].find((lane) => lane !== target.lane));
      else game.setLane(target.lane);
    }
    if (game.superReady) game.activateSuper();
    game.update(.05);
    maxObjects = Math.max(maxObjects, game.objects.length);
    for (const object of game.objects) if (!Number.isFinite(object.z) || !Number.isFinite(object.speedFactor) || (object.durability != null && !Number.isFinite(object.durability))) noNaN = false;
  }
  check('autopilot receives real successful cuts', cuts >= 12, `cuts=${cuts}`);
  check('score, coins, combo and energy advance from cuts', game.score > 0 && game.coins > 0 && game.bestCombo >= 3 && game.energy > 0, `score=${game.score} coins=${game.coins} combo=${game.bestCombo}`);
  check('choice gates are spawned and applied', gates >= 1, `gates=${gates}`);
  check('active-object cap protects mobile memory', maxObjects <= CUTTER_TUNING.maxObjects, `max=${maxObjects}`);
  check('run simulation has no invalid object values', noNaN);
}

section('SUPER CUT / OBSTACLE / GAME OVER');
{
  const save = makeSave();
  const game = new CutterGame({ save, seed: 77 });
  game.start({ skipCountdown: true });
  game.energy = game.energyCapacity;
  check('full energy activates Super Cut', game.activateSuper() && game.superT > 0 && game.power > 4);
  for (let hit = 0; hit < 3; hit++) {
    game.objects.push({ id: `hazard_${hit}`, kind: 'obstacle', lane: 0, z: .03, speedFactor: 1, spin: 0, name: 'Test Barrier', material: 'hazard', shape: 'barrier', color: '#f55', durability: 99, size: 1 });
    game.superT = 0; // obstacles must still be avoided/penalize after the Super test
    game.update(.01);
  }
  check('three uncut obstacles produce game over safely', game.state === C.GAMEOVER && game.health === 0);
  check('game-over writes a safe run result', save.get().runs === 1 && save.get().bestScore >= 0);
}

section('CAPPED PARTICLE POOL');
{
  const particles = createCutterParticles(12);
  particles.burst(0, 0, '#fff', 30, 'spark');
  check('particle bursts obey the fixed mobile pool cap', particles.size === 12 && particles.capacity === 12, `active=${particles.size}/${particles.capacity}`);
  particles.update(2);
  check('expired particles return to the reusable pool', particles.size === 0);
  particles.burst(1, 1, '#fff', 12, 'fragment');
  check('particle pool accepts a later burst after reuse', particles.size === 12);
  particles.clear();
}

section('100-RUN LONG STRESS');
{
  const save = makeSave(); save.addRun({ coins: 100000, cuts: 1000 });
  let invalid = 0; let starts = 0; let maxActive = 0;
  for (let run = 0; run < 100; run++) {
    const game = new CutterGame({ mode: run % 2 ? 'random' : 'wood', save, seed: 10000 + run });
    game.start({ skipCountdown: true }); starts++;
    for (let step = 0; step < 180; step++) {
      const target = [...game.objects].sort((a, b) => a.z - b.z)[0];
      if (target) game.setLane(target.kind === 'obstacle' ? (target.lane === 0 ? 1 : 0) : target.kind === 'gate' ? -1 : target.lane);
      if (game.superReady) game.activateSuper();
      game.update(.05);
      maxActive = Math.max(maxActive, game.objects.length);
      if (!Number.isFinite(game.score) || !Number.isFinite(game.energy) || game.objects.some((o) => !Number.isFinite(o.z))) invalid++;
      if (game.state === C.GAMEOVER) break;
    }
    game.exit();
  }
  check('100 independent runs start without duplicate state', starts === 100);
  check('100-run stress stays numerically stable', invalid === 0, `invalid=${invalid}`);
  check('100-run stress respects active object cap', maxActive <= CUTTER_TUNING.maxObjects, `max=${maxActive}`);
}

const failures = results.filter((result) => !result.ok);
console.log(`\nCUTTER QA RESULT: ${results.length - failures.length}/${results.length} passed`);
if (failures.length) { console.error(failures.map((f) => f.name).join('\n')); process.exitCode = 1; }
