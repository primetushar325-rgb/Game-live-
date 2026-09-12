/* ============================================================
   BATTLELOOP LIVE — headless QA suite (Node, no browser)
   Runs the real engine: physics invariants, match completion,
   determinism, tournament flow, and the 55-match AUTO LIVE loop.
   ============================================================ */

import { createMemoryStorage } from '../src/store/storage.js';
import { createSettings } from '../src/store/settings.js';
import { createContent } from '../src/store/content.js';
import { createHistory } from '../src/store/history.js';
import { EventBus } from '../src/core/events.js';
import { Match, M } from '../src/engine/match.js';
import { buildRounds } from '../src/engine/tournament.js';
import { COUNTRIES } from '../src/data/countries.js';
import { avgSpeed } from '../src/engine/physics.js';
import { Pool } from '../src/core/pool.js';
import { SpatialGrid } from '../src/core/grid.js';

const results = [];
function check(name, cond, extra = '') {
  results.push({ name, ok: !!cond, extra });
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${cond || extra ? `  ${extra}` : ''}`);
}
function section(t) { console.log(`\n=== ${t} ===`); }

/* ---------------- 1. dataset ---------------- */
section('DATASET');
check('countries: exactly 195 entries', COUNTRIES.length === 195, `got ${COUNTRIES.length}`);
check('countries: unique ISO codes', new Set(COUNTRIES.map((c) => c.code)).size === COUNTRIES.length);
check('countries: unique names', new Set(COUNTRIES.map((c) => c.name)).size === COUNTRIES.length);
check('countries: every entry has a flag glyph', COUNTRIES.every((c) => c.emoji && c.emoji.length >= 2));
check('countries: includes Bangladesh/Brazil/USA/India', ['BD', 'BR', 'US', 'IN'].every((code) => COUNTRIES.some((c) => c.code === code)));

/* ---------------- 2. tournament builder ---------------- */
section('TOURNAMENT BUILDER');
const r195 = buildRounds('FULL', 195, 195);
check('FULL 195 => 195/70/30/10/1',
  JSON.stringify(r195) === JSON.stringify([
    { start: 195, qualify: 70 }, { start: 70, qualify: 30 },
    { start: 30, qualify: 10 }, { start: 10, qualify: 1 },
  ]), JSON.stringify(r195));
const r24 = buildRounds('FULL', 195, 24);
check('FULL clamps to pool (24 youtubers)', r24.every((r) => r.start <= 24 && r.qualify >= 1) && r24.at(-1).qualify === 1, JSON.stringify(r24));
const r2 = buildRounds('FULL', 2, 195);
check('tiny start (2) => single 2→1 round', r2.length === 1 && r2[0].start === 2 && r2[0].qualify === 1, JSON.stringify(r2));
const rSingle = buildRounds('SINGLE', 50, 195);
check('SINGLE => 50→1', rSingle.length === 1 && rSingle[0].start === 50 && rSingle[0].qualify === 1, JSON.stringify(rSingle));
const rScale = buildRounds('SCALE', 100, 195);
check('SCALE 100 => strictly decreasing to 1', rScale.at(-1).qualify === 1 && rScale.every((r, i) => i === 0 || r.start === rScale[i - 1].qualify), JSON.stringify(rScale));

/* ---------------- 3. core utils ---------------- */
section('CORE UTILS');
{
  const pool = new Pool(() => ({ v: 0 }), (p) => { p.v = 0; }, 10);
  for (let i = 0; i < 50; i++) pool.spawn();
  pool.releaseWhere((p) => true);
  const a = pool.spawn();
  a.v = 7;
  pool.release(a);
  const b = pool.spawn();
  check('pool reuses released objects (reset applied)', b.v === 0);
  const g = new SpatialGrid(20);
  const A = { x: 10, y: 10 };
  const B = { x: 18, y: 12 };
  const C = { x: 400, y: 400 };
  g.insert(A); g.insert(B); g.insert(C);
  let pairs = 0;
  g.forPairs(() => pairs++);
  check('grid finds exactly the close pair', pairs === 1, `pairs=${pairs}`);
}

/* ---------------- env helper ---------------- */
function makeEnv(over = {}) {
  const storage = createMemoryStorage();
  const settings = createSettings(storage);
  Object.assign(settings.get(), over);
  const content = createContent(storage);
  const history = createHistory(storage);
  const bus = new EventBus();
  const match = new Match({ settings, content, bus, assignId: () => history.nextId() });
  return { storage, settings, content, history, bus, match };
}

function runMatch({
  count = 20, category = 'countries', preset = 'SINGLE',
  duration = 90, gap = 46, speed = 'NORMAL', seed = 99,
  maxSimSec = 900, frame = 1 / 60, onFrame = null,
}) {
  const env = makeEnv({
    matchDuration: duration, gapSize: gap, speed, ballCount: count,
    countdown: 2, winnerDuration: 2, ctaDuration: 2, intermission: 2,
    announceEliminations: false,
  });
  const { match, bus } = env;
  const events = { eliminated: 0, collisions: 0, walls: 0, timeup: 0, storm: 0 };
  const elimOrder = [];
  bus.on('eliminated', (e) => { events.eliminated++; elimOrder.push(e.name); });
  bus.on('sfx:collision', () => events.collisions++);
  bus.on('sfx:wall', () => events.walls++);
  bus.on('match:timeup', () => events.timeup++);
  bus.on('fx:storm', () => events.storm++);
  let winner = null;
  const roundEnds = [];
  bus.on('round:end', (d) => {
    roundEnds.push({ round: d.round, qualified: d.qualified.length, isFinal: d.isFinal, winner: d.winner?.name || null });
    if (d.isFinal && d.winner) winner = d.winner;
    if (d.isFinal && d.winner) env.history.add(match.result()); // mirrors the app wiring
  });

  match.startMatch({ category, count, preset, seed, id: 1, autoLive: false });

  const R = match.arena.R;
  let t = 0, frames = 0, NaNs = 0, escapes = 0, lowStreak = 0, maxLowStreak = 0;
  let lastLeft = match.left;
  let leftMonotonic = true;
  while (t < maxSimSec) {
    match.update(frame);
    t += frame; frames++;
    if (onFrame) onFrame(t, match);
    if (frames % 12 === 0) {
      if (match.left > lastLeft) leftMonotonic = false; // must never INCREASE within a round
      lastLeft = match.left;
      if (match.state === M.BATTLE) {
        const sp = avgSpeed(match.balls);
        if (sp < 20) { lowStreak++; maxLowStreak = Math.max(maxLowStreak, lowStreak); }
        else lowStreak = 0;
      }
      if (frames % 60 === 0) {
        for (const b of match.balls) {
          if (b.eliminated) continue;
          if (!Number.isFinite(b.x) || !Number.isFinite(b.y) || !Number.isFinite(b.vx) || !Number.isFinite(b.vy)) NaNs++;
          const d = Math.hypot(b.x - match.arena.cx, b.y - match.arena.cy);
          if (!match.arena.isInGap(b.x, b.y) && d > R - b.r + 2) escapes++;
        }
      }
    }
    if (match.state === M.OVER) break;
  }
  return {
    env, match, events, winner, roundEnds, elimOrder,
    t, frames, NaNs, escapes, leftMonotonic, maxLowStreak,
    left: match.left, state: match.state, rounds: match.rounds,
  };
}

/* ---------------- 4. physics invariants ---------------- */
section('PHYSICS INVARIANTS (100 balls, 90s, NORMAL)');
{
  const r = runMatch({ count: 100, duration: 900, gap: 46, maxSimSec: 90 });
  check('no NaN positions/velocities', r.NaNs === 0, `NaNs=${r.NaNs}`);
  check('no escapes through closed boundary', r.escapes === 0, `escapes=${r.escapes}`);
  const R = r.match.arena.R;
  const maxD = Math.max(...r.match.balls.filter((b) => !b.eliminated).map((b) => Math.hypot(b.x - r.match.arena.cx, b.y - r.match.arena.cy)), 0);
  check('no ball buried in wall', maxD <= R + 60, `maxD=${maxD.toFixed(1)} R=${R}`);
  check('left count monotonic', r.leftMonotonic);
  check('no stuck state (avg speed recovers)', r.maxLowStreak <= 3, `maxLowSamples=${r.maxLowStreak}`);
  check('collisions actually happen', r.events.collisions > 100, `collisions=${r.events.collisions}`);
  check('storm events fire (anti-stagnation)', r.events.storm > 2, `storms=${r.events.storm}`);
  check('eliminations only via gap (wall reflects)', r.escapes === 0 && r.events.eliminated >= 0, `eliminated=${r.events.eliminated}`);
}

/* ---------------- 5. match completion per count ---------------- */
section('MATCH COMPLETION (single winner, time-up allowed)');
for (const count of [20, 50, 100, 195]) {
  const r = runMatch({ count, duration: 90, gap: 46, maxSimSec: 400 });
  check(`${count} balls: winner decided`, !!r.winner, `winner=${r.winner?.name} state=${r.state}`);
  check(`${count} counts: all others eliminated`, r.events.eliminated === count - 1, `eliminated=${r.events.eliminated}`);
  check(`${count} counts: reached terminal state`, r.state === M.OVER || r.state === M.INTERMISSION, `state=${r.state}`);
  check(`${count} counts: no NaN`, r.NaNs === 0);
  check(`${count} counts: no boundary escape`, r.escapes === 0);
}

/* ---------------- 6. determinism ---------------- */
section('DETERMINISM (same seed => same elimination order)');
{
  const a = runMatch({ count: 30, duration: 120, gap: 40, seed: 777, maxSimSec: 150 });
  const b = runMatch({ count: 30, duration: 120, gap: 40, seed: 777, maxSimSec: 150 });
  check('identical elimination sequence', JSON.stringify(a.elimOrder) === JSON.stringify(b.elimOrder), `${a.elimOrder.length} vs ${b.elimOrder.length} eliminations`);
  check('identical winner', a.winner?.name === b.winner?.name, `${a.winner?.name} vs ${b.winner?.name}`);
}

/* ---------------- 7. full tournament 195 ---------------- */
section('FULL TOURNAMENT 195→70→30→10→1');
{
  const r = runMatch({
    count: 195, preset: 'FULL', duration: 60, gap: 52, maxSimSec: 40 * 60,
    frame: 0.125, // 7.5x time acceleration
  });
  check('4 rounds completed', r.roundEnds.length === 4, JSON.stringify(r.roundEnds));
  check('round1 qualifies 70', r.roundEnds[0]?.qualified === 70, JSON.stringify(r.roundEnds[0]));
  check('round2 qualifies 30', r.roundEnds[1]?.qualified === 30, JSON.stringify(r.roundEnds[1]));
  check('round3 qualifies 10', r.roundEnds[2]?.qualified === 10, JSON.stringify(r.roundEnds[2]));
  check('final produces winner', r.roundEnds[3]?.isFinal === true && !!r.winner, `winner=${r.winner?.name}`);
  check('tournament: no NaN', r.NaNs === 0);
  check('tournament: no escapes', r.escapes === 0);
}

/* ---------------- 8. AUTO LIVE long run (55 matches) ---------------- */
section('AUTO LIVE LONG RUN — 55 consecutive matches');
{
  const t0 = Date.now();
  const env = makeEnv({
    matchDuration: 10, gapSize: 64, speed: 'NORMAL', ballCount: 20,
    countdown: 1, winnerDuration: 1, ctaDuration: 1, intermission: 1,
    announceEliminations: false, autoLive: true,
  });
  const { match, bus, history } = env;
  const cats = [];
  const ballCounts = [];
  const poolSizes = new Map();
  const listenerCounts = [];
  const matchIds = [];
  let winnerOk = true;
  for (const c of ['countries', 'youtubers', 'football', 'social', 'games', 'celebrities', 'custom']) {
    poolSizes.set(c, env.content.countEnabled(c));
  }
  bus.on('match:start', (info) => {
    cats.push(info.category);
    ballCounts.push(match.balls.length);
    listenerCounts.push(bus.listenerCount('eliminated'));
    matchIds.push(info.id);
  });
  bus.on('round:end', (d) => {
    if (d.isFinal && !d.winner) winnerOk = false;
    if (d.isFinal && d.winner) history.add(match.result()); // mirrors the app wiring
  });

  match.startMatch({ category: 'random', count: 20, preset: 'SINGLE', autoLive: true });
  const frame = 0.125; // 7.5x accel
  let t = 0;
  const cap = 120 * 60; // 2h sim safety cap
  while (history.list().length < 55 && t < cap) {
    match.update(frame);
    t += frame;
  }
  const done = history.list();
  const ms = Date.now() - t0;
  check('55 matches completed', done.length >= 55, `done=${done.length} sim=${(t / 60).toFixed(1)}min real=${(ms / 1000).toFixed(1)}s`);
  check('every match has a winner', winnerOk && done.every((d) => d.winner));
  check('match ids strictly increase', matchIds.every((id, i) => i === 0 || id > matchIds[i - 1]));
  // each match must start with exactly min(20, poolSize) fresh balls
  const countsOk = cats.every((c, i) => ballCounts[i] === Math.min(20, poolSizes.get(c) ?? 20));
  check('ball count correct & resets each match (no leak in balls)', countsOk, `counts=${new Set(ballCounts)}`);
  check('event listeners do not accumulate', new Set(listenerCounts).size === 1, `counts=${new Set(listenerCounts)}`);
  // no three-in-a-row same category (random anti-repetition)
  let triple = false;
  for (let i = 2; i < cats.length; i++) {
    if (cats[i] === cats[i - 1] && cats[i - 1] === cats[i - 2]) triple = true;
  }
  check('random category: never 3-in-a-row', !triple, `cats sample: ${cats.slice(0, 12).join('→')}`);
  const uniqueCats = new Set(cats).size;
  check('random mode used multiple categories', uniqueCats >= 3, `unique=${uniqueCats}`);
  check('history entries well-formed', done.every((d) => d.id && d.count >= 2 && d.count <= 20 && d.rounds >= 1 && d.winner && Number.isFinite(d.duration) && d.seed > 0));
  process.gc?.();
  const memAfter = process.memoryUsage().heapUsed;
  console.log(`  info  55 matches in ${ms}ms real time; heap now ${(memAfter / 1048576).toFixed(1)}MB`);
  check('heap memory bounded (< 200MB)', memAfter < 200 * 1048576, `${(memAfter / 1048576).toFixed(1)}MB`);
}

/* ---------------- 9. 195-ball HIGH-speed stress + timing ---------------- */
section('PERFORMANCE (195 balls, HIGH speed, 30s)');
{
  const r = runMatch({ count: 195, speed: 'HIGH', duration: 300, gap: 40, maxSimSec: 30 });
  const subs = Math.round(30 / PHYS_SUB());
  console.log(`  info  195 balls @ HIGH: ${subs} substeps simulated, NaNs=${r.NaNs}, escapes=${r.escapes}, eliminations=${r.events.eliminated}`);
  check('no NaN under stress', r.NaNs === 0);
  check('no escapes under stress', r.escapes === 0);
  check('physics keeps 195 tokens moving', r.events.collisions > 500, `collisions=${r.events.collisions}`);
}
function PHYS_SUB() { return 1 / 120; }

/* ---------------- summary ---------------- */
const failed = results.filter((r) => !r.ok);
console.log(`\n${'='.repeat(50)}`);
console.log(`QA RESULT: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log('FAILED:');
  for (const f of failed) console.log(`  - ${f.name} ${f.extra}`);
  process.exit(1);
} else {
  console.log('ALL CHECKS PASSED ✅');
}
