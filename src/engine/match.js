/* Match state machine:
   COUNTDOWN -> BATTLE -> ROUND_RESULT -> (next round | WINNER) -> CTA -> INTERMISSION -> (next match | OVER)
   Pure logic (no DOM/audio) — everything goes out through the event bus. */

import { RNG, randomSeed } from '../core/rng.js';
import { PHYS, CATEGORIES, CATEGORY_META } from '../config/defaults.js';
import { Arena } from './arena.js';
import { spawnBalls, ballRadius } from './balls.js';
import { stepSubstep, createPhys, avgSpeed } from './physics.js';
import { buildRounds } from './tournament.js';

export const M = {
  IDLE: 'idle',
  COUNTDOWN: 'countdown',
  BATTLE: 'battle',
  ROUND_RESULT: 'round_result',
  WINNER: 'winner',
  CTA: 'cta',
  INTERMISSION: 'intermission',
  PAUSED: 'paused',
  OVER: 'over',
};

export class Match {
  constructor({ settings, content, bus, assignId }) {
    this.settings = settings;
    this.content = content;
    this.bus = bus;
    this.assignId = assignId || (() => 1);
    this.state = M.IDLE;
    this.cfg = null;
    this.balls = [];
    this.arena = null;
    this.phys = null;
    this.rng = new RNG(1);
    this.acc = 0;
    this.stateT = 0;
    this.countdownT = 0;
    this.timer = 0;
    this.elapsed = 0;
    this.left = 0;
    this.target = 0;
    this.roundIndex = 0;
    this.rounds = [];
    this.qualified = [];
    this.eliminated = [];
    this.winner = null;
    this.cta = null;
    this.musicState = null;
    this.finalTwoAnnounced = false;
    this.stuckCheck = 0;
    this.lastCat = null;
    this.lastCat2 = null;
    this.pendingElims = [];
    this.prevState = null;
    this.pending = null;
  }

  now() { return this.settings.get(); }
  meta() { return CATEGORY_META[this.resolved] || CATEGORY_META[this.cfg?.category] || CATEGORY_META.quick; }

  startMatch(cfg) {
    const s = this.now();
    // Resolve to a real category. Random/quick may skip categories that do not
    // have enough enabled contestants (spec: never crash on invalid content).
    const isRandom = cfg.category === 'random' || cfg.category === 'quick';
    let resolved = null;
    let pool = null;
    if (isRandom) {
      const r = new RNG(randomSeed());
      const order = r.shuffle([...CATEGORIES].filter((c) => c !== this.lastCat && c !== this.lastCat2));
      for (const cat of order) {
        const p = this.content.getPool(cat, { battleId: cfg.battleId });
        if (p && p.length >= 2) { resolved = cat; pool = p; break; }
      }
      if (resolved) {
        this.lastCat2 = this.lastCat;
        this.lastCat = resolved;
      }
    } else {
      pool = this.content.getPool(cfg.category, { battleId: cfg.battleId });
      if (pool && pool.length >= 2) resolved = cfg.category;
    }
    if (!resolved || !pool) {
      throw new Error(
        isRandom
          ? 'No category has enough enabled contestants (need 2+). Add or enable contestants in the Content Manager.'
          : `Not enough enabled contestants for ${cfg.category} (need 2+, have ${pool?.length ?? 0}). Add or enable contestants in the Content Manager.`
      );
    }
    const rounds = buildRounds(cfg.preset || s.tournamentPreset, cfg.count ?? s.ballCount, pool.length);
    if (!rounds) throw new Error('Invalid tournament configuration — not enough contestants.');

    this.resolved = resolved;
    this.cfg = {
      category: cfg.category,
      count: cfg.count ?? s.ballCount,
      preset: cfg.preset || s.tournamentPreset,
      battleId: cfg.battleId || null,
      autoLive: !!cfg.autoLive,
      id: cfg.id ?? this.assignId(),
      seed: cfg.seed ?? randomSeed(),
      titleOverride: cfg.title || null,
    };
    this.rounds = rounds;
    this.roundIndex = 0;
    this.qualified = [];
    this.eliminated = [];
    this.winner = null;
    this.cta = null;
    this.elapsed = 0;
    this.finalTwoAnnounced = false;
    this.musicState = null;
    this.rng = new RNG(this.cfg.seed);
    this.acc = 0;
    this.buildRound(0);
    this.state = M.COUNTDOWN;
    this.countdownMax = Math.max(1, s.countdown);
    this.countdownT = this.countdownMax;
    this.lastCount = -1;
    this.bus.emit('match:start', this.info());
  }

  buildRound(i) {
    const s = this.now();
    const round = this.rounds[i];
    let pool;
    if (i === 0) {
      const all = this.content.getPool(this.resolved, { battleId: this.cfg.battleId });
      pool = this.rng.shuffle([...all]).slice(0, round.start).map((c) => ({ ...c }));
    } else {
      pool = this.qualified.map((q) => ({ ...q.c }));
    }
    this.arena = new Arena(s, this.rng);
    const R = this.arena.R;
    const r = ballRadius(round.start, R);
    this.phys = createPhys(s, r, this.rng);
    this.balls = spawnBalls(pool, round.start, this.arena, r, s, this.rng);
    this.left = round.start;
    this.target = round.qualify;
    this.timer = Math.max(5, s.matchDuration);
    this.eliminated = [];
    this.qualified = [];
    this.pendingElims = [];
    this.stuckCheck = PHYS.antiStuckCheck;
  }

  info() {
    const m = this.meta();
    return {
      state: this.state,
      id: this.cfg?.id ?? 0,
      category: this.resolved || this.cfg?.category,
      battleId: this.cfg?.battleId || null,
      categoryTitle: this.cfg?.titleOverride || m.banner,
      unit: m.unit,
      rounds: this.rounds,
      round: this.roundIndex + 1,
      totalRounds: this.rounds.length,
      left: this.left,
      target: this.target,
      timer: this.timer,
      seed: this.cfg?.seed ?? 0,
      autoLive: this.cfg?.autoLive ?? false,
      gapAngle: this.arena?.gapAngle ?? 0,
    };
  }

  result() {
    const w = this.winner;
    return {
      id: this.cfg.id,
      category: this.resolved,
      title: this.meta().banner,
      date: new Date().toISOString(),
      count: this.rounds[0].start,
      winner: w ? { name: w.name, emoji: w.emoji || null, image: w.image || null, color: w.color || null, sub: w.sub || '' } : null,
      rounds: this.rounds.length,
      duration: Math.round(this.elapsed),
      seed: this.cfg.seed,
    };
  }

  /* ---------------- frame update (called by the app loop) ---------------- */
  update(frameDt) {
    if (this.state === M.PAUSED || this.state === M.IDLE || this.state === M.OVER) return;
    this.acc = Math.min(this.acc + frameDt, PHYS.maxFrameDt);
    const SUB = PHYS.substep;
    let guard = 0;
    while (this.acc >= SUB && guard++ < 48) {
      this.substep(SUB);
      this.acc -= SUB;
    }
  }

  substep(dt) {
    this.elapsed += dt;
    switch (this.state) {
      case M.COUNTDOWN: {
        this.countdownT -= dt;
        const c = Math.ceil(this.countdownT);
        if (c !== this.lastCount && c >= 1 && c <= this.countdownMax) {
          this.lastCount = c;
          this.bus.emit('countdown', { n: c });
        }
        if (this.countdownT <= 0) {
          this.state = M.BATTLE;
          this.setMusic('NORMAL');
          this.bus.emit('match:go', {});
        }
        break;
      }
      case M.BATTLE:
        this.stepBattle(dt);
        break;
      case M.ROUND_RESULT:
        this.stateT -= dt;
        if (this.stateT <= 0) {
          if (this.roundIndex < this.rounds.length - 1) {
            this.roundIndex++;
            this.buildRound(this.roundIndex);
            this.state = M.COUNTDOWN;
            this.countdownT = this.countdownMax;
            this.lastCount = -1;
            this.setMusic('NORMAL');
            this.bus.emit('round:start', { round: this.roundIndex + 1, start: this.left });
          } else {
            this.state = M.WINNER;
            this.stateT = this.now().winnerDuration;
            this.setMusic('VICTORY');
            this.bus.emit('winner:show', { winner: this.winner });
          }
        }
        break;
      case M.WINNER:
        this.stateT -= dt;
        if (this.stateT <= 0) {
          this.state = M.CTA;
          this.stateT = Math.max(1, Number(this.now().ctaDuration) || 8);
          this.cta = this.pickCta();
          this.setMusic('CTA');
          this.bus.emit('cta:start', { cta: this.cta, t: this.stateT });
        }
        break;
      case M.CTA:
        this.stateT -= dt;
        if (this.stateT <= 0) {
          this.state = M.INTERMISSION;
          this.stateT = Math.max(1, this.now().intermission);
          this.pending = null;
          if (this.cfg.autoLive) {
            // keep 'random' in the pending cfg — startMatch re-resolves a fresh
            // category each match (anti-repetition lives in pickNextCategory)
            this.pending = { ...this.cfg, seed: randomSeed(), id: this.assignId() };
          }
          const isRand = this.cfg.category === 'random' || this.cfg.category === 'quick';
          this.bus.emit('intermission:start', {
            nextIn: this.stateT,
            autoLive: this.cfg.autoLive,
            nextTitle: this.pending ? (isRand ? 'RANDOM BATTLE' : CATEGORY_META[this.cfg.category].banner) : null,
          });
        }
        break;
      case M.INTERMISSION:
        // Manual matches wait here on the "MATCH COMPLETE" screen (user drives
        // next); auto-live counts down and starts the next match automatically.
        if (this.cfg.autoLive) {
          this.stateT -= dt;
          if (this.stateT <= 0) {
            if (this.pending) {
              const p = this.pending;
              this.pending = null;
              this.startMatch(p);
            } else {
              this.state = M.OVER;
              this.bus.emit('match:over', this.info());
            }
          }
        }
        break;
      default:
        break;
    }
  }

  stepBattle(dt) {
    this.timer -= dt;
    this.arena.rotate(dt);

    const evs = {
      onCollision: (a, b, impact, x, y) => {
        if (impact > 70) this.bus.emit('sfx:collision', { impact, x, y });
      },
      onWallHit: (b, impact) => {
        if (impact > 170) this.bus.emit('sfx:wall', { impact, x: b.x, y: b.y });
      },
      onStorm: (ang) => this.bus.emit('fx:storm', { ang }),
      onEliminate: (b) => this.pendingElims.push(b),
    };

    stepSubstep(this.balls, this.arena, this.phys, dt, evs, this.rng);

    // process eliminations (in order)
    for (const b of this.pendingElims) {
      // guard: never eliminate below the required survivor count
      if (this.left <= this.target) {
        b.eliminated = false;
        const dx = b.x - this.arena.cx;
        const dy = b.y - this.arena.cy;
        const d = Math.hypot(dx, dy) || 1;
        const lim = this.arena.R - b.r * 1.2;
        b.x = this.arena.cx + (dx / d) * lim;
        b.y = this.arena.cy + (dy / d) * lim;
        continue;
      }
      this.left--;
      this.eliminated.push(b.c);
      this.bus.emit('eliminated', {
        name: b.c.name,
        sub: b.c.sub || '',
        emoji: b.c.emoji || null,
        image: b.c.image || null,
        color: b.c.color || null,
        x: b.x, y: b.y,
        left: this.left,
        target: this.target,
        round: this.roundIndex + 1,
        totalRounds: this.rounds.length,
        unit: this.meta().unit,
        id: this.cfg.id,
        category: this.resolved,
      });
    }
    this.pendingElims.length = 0;

    // anti-stuck guard
    this.stuckCheck -= dt;
    if (this.stuckCheck <= 0) {
      this.stuckCheck = PHYS.antiStuckCheck;
      if (avgSpeed(this.balls) < PHYS.antiStuckMinSpeed && this.left > this.target) {
        for (const b of this.balls) {
          if (b.eliminated) continue;
          const a = this.rng.next() * Math.PI * 2;
          b.vx += Math.cos(a) * 260;
          b.vy += Math.sin(a) * 260;
        }
      }
    }

    // announcements
    if (this.finalTwoAnnounced === false && this.left === 2 && this.target === 1) {
      this.finalTwoAnnounced = true;
      this.bus.emit('final:two', {});
    }

    // music tension
    const isFinal = this.roundIndex === this.rounds.length - 1;
    if (isFinal && this.left <= Math.max(3, this.target + 5)) this.setMusic('SUSPENSE');
    else if (isFinal && this.left <= 2) this.setMusic('FINAL');

    // end conditions
    if (this.left <= this.target) {
      this.endRound('time');
      return;
    }
    if (this.timer <= 0) {
      this.forceResolve();
    }
  }

  endRound() {
    const survivors = this.balls.filter((b) => !b.eliminated);
    this.qualified = survivors;
    const isFinal = this.roundIndex === this.rounds.length - 1;
    if (isFinal && this.target === 1 && survivors.length === 1) {
      this.winner = survivors[0].c;
    }
    this.state = M.ROUND_RESULT;
    this.stateT = isFinal ? 2.4 : 3.4;
    this.bus.emit('round:end', {
      qualified: this.qualified.map((b) => b.c),
      isFinal,
      round: this.roundIndex + 1,
      totalRounds: this.rounds.length,
      winner: this.winner,
    });
  }

  forceResolve() {
    // time up — pick the required number of qualifiers among the survivors
    const survivors = this.balls.filter((b) => !b.eliminated);
    const need = this.target;
    if (survivors.length > need) {
      const idx = this.rng.shuffle(survivors.map((_, i) => i)).slice(0, survivors.length - need);
      const toKill = new Set(idx);
      survivors.forEach((b, i) => {
        if (toKill.has(i)) {
          b.eliminated = true;
          this.left--;
          this.eliminated.push(b.c);
          this.bus.emit('eliminated', {
            name: b.c.name, sub: b.c.sub || '', emoji: b.c.emoji || null, image: b.c.image || null,
            color: b.c.color || null, x: b.x, y: b.y, left: this.left, target: this.target,
            round: this.roundIndex + 1, totalRounds: this.rounds.length, unit: this.meta().unit,
            id: this.cfg.id, category: this.resolved, forced: true,
          });
        }
      });
    }
    this.bus.emit('match:timeup', {});
    this.endRound();
  }

  pickCta() {
    const list = this.ctaPool || (this.ctaPool = []);
    if (list.length) return this.pickFromCta(list);
    return null;
  }
  setCtaTemplates(list) { this.ctaPool = list && list.length ? list : []; }
  pickFromCta(list) {
    if (!list.length) return null;
    let cta = list[Math.floor(Math.random() * list.length)];
    if (list.length > 1) {
      let guard = 0;
      while (this.lastCta && cta.id === this.lastCta.id && guard++ < 8) {
        cta = list[Math.floor(Math.random() * list.length)];
      }
    }
    this.lastCta = cta;
    return cta;
  }

  setMusic(state) {
    if (this.musicState === state) return;
    this.musicState = state;
    this.bus.emit('music:state', { state });
  }

  /* ---------------- controls ---------------- */
  pause() {
    if (this.state === M.PAUSED || this.state === M.IDLE || this.state === M.OVER) return;
    this.prevState = this.state;
    this.state = M.PAUSED;
    this.bus.emit('paused', {});
  }
  resume() {
    if (this.state !== M.PAUSED) return;
    this.state = this.prevState || M.BATTLE;
    this.bus.emit('resumed', {});
  }
  togglePause() {
    if (this.state === M.PAUSED) this.resume();
    else this.pause();
  }
  isRunning() {
    return [M.COUNTDOWN, M.BATTLE, M.ROUND_RESULT, M.WINNER, M.CTA, M.INTERMISSION, M.PAUSED].includes(this.state);
  }

  restart() {
    if (!this.cfg) return;
    this.startMatch({ ...this.cfg, seed: randomSeed(), id: this.cfg.id });
  }

  forceEliminate() {
    if (this.state !== M.BATTLE) return null;
    const alive = this.balls.filter((b) => !b.eliminated);
    if (alive.length <= 1) return null;
    const b = alive[Math.floor(Math.random() * alive.length)];
    b.eliminated = true;
    this.pendingElims.push(b);
    // process immediately
    this.left--;
    this.eliminated.push(b.c);
    this.bus.emit('eliminated', {
      name: b.c.name, sub: b.c.sub || '', emoji: b.c.emoji || null, image: b.c.image || null,
      color: b.c.color || null, x: b.x, y: b.y, left: this.left, target: this.target,
      round: this.roundIndex + 1, totalRounds: this.rounds.length, unit: this.meta().unit,
      id: this.cfg.id, category: this.cfg.category, forced: true,
    });
    this.pendingElims.length = 0;
    if (this.left <= this.target) this.endRound();
    return b.c;
  }

  forceWinner() {
    if (!this.isRunning() || this.state === M.WINNER) return null;
    const alive = this.balls.filter((b) => !b.eliminated);
    if (!alive.length) return null;
    const w = alive[Math.floor(Math.random() * alive.length)].c;
    const isFinal = this.roundIndex === this.rounds.length - 1;

    // Build a correct qualified slate: the forced winner first, then random
    // survivors until the round's target is filled (keeps the tournament chain
    // consistent even when forced mid-round).
    const qualified = [w];
    for (const b of alive) {
      if (qualified.length >= this.target) break;
      if (b.c.id !== w.id) qualified.push(b.c);
    }
    for (const c of this.eliminated) {
      if (qualified.length >= this.target) break;
      if (!qualified.some((q) => q.id === c.id)) qualified.push(c);
    }

    for (const b of alive) {
      if (b.c.id !== w.id && !qualified.slice(1).some((q) => q.id === b.c.id)) {
        b.eliminated = true;
        if (!this.eliminated.some((c) => c.id === b.c.id)) this.eliminated.push(b.c);
      }
    }

    if (isFinal && this.target === 1) {
      this.winner = w;
      this.left = 1;
      this.state = M.ROUND_RESULT;
      this.stateT = 1.6;
      this.bus.emit('round:end', {
        qualified: [w], isFinal: true, round: this.roundIndex + 1,
        totalRounds: this.rounds.length, winner: w,
      });
    } else {
      this.qualified = qualified.map((c) => ({ c }));
      this.left = qualified.length;
      this.state = M.ROUND_RESULT;
      this.stateT = 2.0;
      this.bus.emit('round:end', {
        qualified, isFinal: false, round: this.roundIndex + 1,
        totalRounds: this.rounds.length, winner: null,
      });
    }
    return w;
  }

  nextMatch() {
    if (!this.cfg) return;
    this.pending = null;
    // 'random'/'quick' stay in the cfg — startMatch resolves the category
    this.startMatch({ ...this.cfg, seed: randomSeed(), id: this.assignId() });
  }

  /** Stop the match (user left the live screen). No events emitted. */
  abandon() {
    this.state = M.OVER;
    this.acc = 0;
    this.pending = null;
  }

  autoNext() {
    this.nextMatch();
  }
}
