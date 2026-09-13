/* DOM smoke test (jsdom) — boots the real app, clicks through every screen,
   runs a full match lifecycle. Catches import/runtime/UI-wiring bugs.
   (Canvas 2D is stubbed; the physics itself is covered by headless.js.) */

import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="app"><div class="boot">LOADING…</div></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});

const { window } = dom;

/* ---- globals ---- */
const ctxStub = () => {
  const t = {};
  return new Proxy(t, {
    get(target, p) {
      if (p in target) return target[p];
      return (..._args) => {
        if (p === 'createRadialGradient' || p === 'createLinearGradient') return { addColorStop() {} };
        if (p === 'measureText') return { width: 10 };
        if (p === 'getImageData') return { data: new Uint8ClampedArray(4) };
        return undefined;
      };
    },
    set(target, p, v) { target[p] = v; return true; },
  });
};
window.HTMLCanvasElement.prototype.getContext = function () { return ctxStub(); };

let rafQ = [];
window.requestAnimationFrame = (cb) => { rafQ.push(cb); return rafQ.length; };
window.cancelAnimationFrame = (id) => { rafQ[id - 1] = null; };
let now = performance.now(); // start aligned with the app's clock
setInterval(() => {
  now += 16;
  const q = rafQ; rafQ = [];
  for (const cb of q) if (cb) { try { cb(now); } catch (e) { errors.push('raf: ' + e.message); } }
}, 16);

const errors = [];
window.addEventListener('error', (e) => errors.push('window.onerror: ' + e.message));
function fatal(msg) {
  errors.push(msg);
  setTimeout(() => {
    console.error('\nFATAL: ' + msg);
    process.exit(1);
  }, 200).unref?.();
}
process.on('uncaughtException', (e) => fatal('uncaught: ' + e.stack?.split('\n').slice(0, 3).join(' | ')));
process.on('unhandledRejection', (e) => fatal('unhandledRejection: ' + (e?.stack?.split('\n').slice(0, 3).join(' | ') || e)));
const origConsoleError = console.error;
console.error = (...a) => {
  const s = a.join(' ');
  if (!/Could not parse CSS|not implemented/i.test(s)) errors.push('console.error: ' + s);
  origConsoleError(...a);
};

const g = globalThis;
g.window = window;
g.document = window.document;
try { Object.defineProperty(g, 'navigator', { value: window.navigator, configurable: true }); } catch { /* keep node's */ }
g.localStorage = window.localStorage;
g.Image = window.Image;
g.HTMLElement = window.HTMLElement;
// keep Node's own performance (jsdom's now() recurses into the global)
g.performance = performance;
g.requestAnimationFrame = window.requestAnimationFrame;
g.cancelAnimationFrame = window.cancelAnimationFrame;
g.getComputedStyle = window.getComputedStyle;

/* ---- boot the real app ---- */
const { createApp } = await import('../src/ui/app.js');
const root = window.document.getElementById('app');
const app = createApp(root);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (sel) => root.querySelector(sel);
const $$ = (sel) => [...root.querySelectorAll(sel)];
let failed = 0;
function check(name, cond, extra = '') {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
  if (!cond) failed++;
}
function step(label) { console.log(`\n-- ${label} --`); }

// hard watchdog: dump where we are stuck and die
setTimeout(() => {
  console.error('\nWATCHDOG: test still running after 150s — state:');
  try { console.error('  match.state =', app.match?.state, '| root has home:', !!root.querySelector('.home'), '| live:', !!root.querySelector('.live'), '| modal:', !!root.querySelector('.modal-wrap')); } catch {}
  console.error(new Error('watchdog stack').stack);
  process.exit(2);
}, 150000);

console.log('=== DOM SMOKE TEST ===');
step('splash -> home');
await sleep(2300);
check('splash -> home screen', !!$('.home'), `body=${root.innerHTML.slice(0, 60)}`);
check('home has all 14 mode buttons', $$('.hbtn').length === 14, `got ${$$('.hbtn').length}`);

/* --- start a country battle --- */
step('start country battle');
$$('.hbtn').find((b) => b.dataset.id === 'countries').click();
await sleep(50);
check('setup modal opens', !!$('#mStart'));
check('pool shows 195 countries', $('#mPool')?.textContent.includes('195'), $('#mPool')?.textContent);
$$('#mPreset button').find((b) => b.dataset.p === 'SINGLE').click(); // single round -> faster lifecycle
await sleep(20);
$('#mStart').click();
await sleep(100);
check('live screen active', !!$('#cv'));
check('banner = COUNTRY FLAG BATTLE', $('#bannerTitle')?.textContent === 'COUNTRY FLAG BATTLE', $('#bannerTitle')?.textContent);
check('banner shows FLAGS LEFT', /FLAGS LEFT/.test($('#bannerLeft')?.textContent || ''), $('#bannerLeft')?.textContent);
check('phase label shown', /QUALIFYING|FINAL|TO THE WINNER/.test($('#bannerPhase')?.textContent || ''), $('#bannerPhase')?.textContent);
check('timer visible', /--:--|\d+:\d{2}/.test($('#timer')?.textContent || ''));
check('match in countdown/battle', ['countdown', 'battle'].includes(app.match.state), app.match.state);
check('match info line rendered', /MATCH #\d+/.test($('#matchInfo')?.textContent || ''), $('#matchInfo')?.textContent);
check('supporters list rendered', $$('#supList li').length > 0);
check('controls rendered', $$('#controls button').length >= 7, `got ${$$('#controls button').length}`);
check('contestant strip rendered', $$('#cstrip .tile').length > 0, `tiles=${$$('#cstrip .tile').length}`);
check('winner history panel present', !!$('#winners'));

await sleep(3800); // countdown 3s default → battle
check('battle running after countdown', app.match.state === 'battle', app.match.state);
check('195 balls spawned', app.match.balls.length === 195, `balls=${app.match.balls.length}`);
check('banner left counting down', /FLAGS LEFT/.test($('#bannerLeft')?.textContent || ''), $('#bannerLeft')?.textContent);

/* --- pause / resume --- */
step('pause/resume');
$$('#controls button').find((b) => b.dataset.act === 'pause').click();
await sleep(30);
check('pause works', app.match.state === 'paused');
check('pause overlay shown', !!$('.ov.pause'));
$$('#controls button').find((b) => b.dataset.act === 'pause').click();
await sleep(30);
check('resume works', app.match.state === 'battle');

/* --- force winner -> CTA -> intermission -> OVER --- */
step('winner -> cta -> intermission -> over');
app.match.forceWinner();
await sleep(30);
check('round result state', app.match.state === 'round_result');
await sleep(3200); // result 2.4s
check('winner overlay', app.match.state === 'winner' && !!$('.win-name'), app.match.state);
const winnerName = $('.win-name')?.textContent;
await sleep(13000); // winner 12s
check('cta overlay', app.match.state === 'cta' && !!$('.cta-text'), app.match.state + ' ' + ($('.cta-text')?.textContent || ''));
await sleep(9000); // cta 8s
check('intermission shown', app.match.state === 'intermission', app.match.state);
await sleep(1000);
check('manual match waits on MATCH COMPLETE', app.match.state === 'intermission', app.match.state);
check('match-complete overlay has buttons', !!$('#ovNext'));
check('history recorded the match', app.history.list().length === 1 && app.history.list()[0].winner?.name === winnerName,
  `hist=${app.history.list().length} winner=${winnerName}`);

/* --- next match --- */
$('#ovNext').click();
await sleep(100);
check('next match started (new id)', app.match.cfg && app.match.state === 'countdown');

/* --- screens tour --- */
step('screens tour');
app.navigate('content');
await sleep(30);
check('content manager: tabs', $$('#cTabs button').length === 8, `got ${$$('#cTabs button').length}`);
check('countries list renders', $$('#cList .crow').length > 0);
$$('.tabs button').find((b) => b.dataset.c === 'youtubers').click();
await sleep(30);
check('youtubers list renders', $$('#cList .crow').length > 0, `rows=${$$('#cList .crow').length}`);
$$('.tabs button').find((b) => b.dataset.c === 'supporters').click();
await sleep(30);
check('supporters tab renders', $$('#sList .crow').length > 0);
$$('.tabs button').find((b) => b.dataset.c === 'custom').click();
await sleep(30);
const bNew = $('#bNew'); bNew?.click();
await sleep(30);
check('custom battle created', app.content.listBattles().length === 1, `battles=${app.content.listBattles().length}`);
$('#dAdd').click(); // adds a fighter + opens the fighter editor modal
await sleep(30);
check('fighter editor opened', !!$('#fName'));
const fn = $('#fName'); fn.value = 'Tester 1';
$('#fSave').click();
await sleep(30);
const bLast = app.content.listBattles().at(-1);
check('fighter added + named', bLast?.contestants?.length === 1 && bLast.contestants[0].name === 'Tester 1',
  JSON.stringify(bLast?.contestants?.map((c) => c.name)));

app.navigate('settings');
await sleep(30);
check('settings sections render', $$('.settings section').length >= 6);
check('settings music files area', !!($('#mMusList')));

app.navigate('history');
await sleep(30);
check('history screen lists match', /MATCH #1/.test($('.history')?.textContent || ''));

app.navigate('test');
await sleep(30);
check('test grid renders', $$('.tbtn').length === 13, `got ${$$('.tbtn').length}`);
check('test status shows state', /STATE:/.test($('#tStatus')?.textContent || ''));

/* --- audio test buttons (while still on the test screen) --- */
$$('.tbtn').find((b) => b.dataset.t === 'voice').click();
$$('.tbtn').find((b) => b.dataset.t === 'music').click();
$$('.tbtn').find((b) => b.dataset.t === 'coll').click();
$$('.tbtn').find((b) => b.dataset.t === 'countdown').click();
$$('.tbtn').find((b) => b.dataset.t === 'cta').click();
await sleep(100);
check('audio test buttons did not throw', errors.length === 0, errors.at(-1) || '');

/* --- test-mode spawn 20 --- */
step('test mode: spawn 20');
$$('.tbtn').find((b) => b.dataset.t === 'spawn20').click();
await sleep(100);
check('spawn20 -> live with 20 balls', app.match.balls.length === 20, `balls=${app.match.balls.length}`);

/* --- force elimination mid-battle --- */
await sleep(3300); // through countdown
check('spawn20 in battle', app.match.state === 'battle', app.match.state);
const before = app.match.left;
const killed = app.match.forceEliminate();
await sleep(30);
check('force elimination reduced left', killed && app.match.left === before - 1, `before=${before} after=${app.match.left} killed=${killed?.name}`);

/* --- exit live --- */
app.exitLive();
await sleep(30);
check('exit -> home', !!$('.home'));

/* --- CUTTER ROAD 3D: separate menu, run controls, energy and return path --- */
step('cutter road: menu -> run -> super -> pause -> menu');
$$('.hbtn').find((b) => b.dataset.id === 'cutter').click();
await sleep(50);
check('cutter menu renders all object modes', $$('.cutter-mode').length === 8, `modes=${$$('.cutter-mode').length}`);
check('cutter upgrade entry renders', !!$('#crUpgrade'));
$$('.cutter-mode').find((b) => b.dataset.mode === 'food').click();
await sleep(100);
check('cutter live canvas and HUD render', !!$('#crCanvas') && !!$('#crScore') && !!app.cutterGame, app.cutterGame?.state);
await sleep(3400);
check('cutter run starts after countdown', app.cutterGame?.state === 'running', app.cutterGame?.state);
app.cutterGame.energy = app.cutterGame.energyCapacity;
await sleep(30); // allow the real HUD frame to enable the action button
$('#crSuper').click();
await sleep(30);
check('cutter Super Cut activates from full energy', app.cutterGame.superT > 0, `super=${app.cutterGame.superT}`);
$('#crPause').click();
await sleep(30);
check('cutter pause panel works', app.cutterGame?.state === 'paused' && !!$('#crResume'));
$('#crResume').click();
await sleep(30);
check('cutter resume works', app.cutterGame?.state === 'running');
app.exitCutter();
await sleep(30);
check('cutter exit returns to its own menu', !!$('.cutter-menu'));
app.navigate('home');
await sleep(30);
check('cutter menu returns safely to original home', !!$('.home'));

/* --- STREAM MODE end-to-end (auto forever loop, same category) --- */
step('stream mode: start -> auto matches -> stop');
$$('.hbtn').find((b) => b.dataset.id === 'stream').click();
await sleep(50);
check('stream modal open (STREAM badge)', !!$('.m-live') && /START STREAM/.test($('#mStart')?.textContent || ''), $('#mStart')?.textContent);
$$('#mCount button').find((b) => b.dataset.n === '20').click();
$$('#mGaps button').find((b) => b.dataset.n === '2').click();
$$('#mSpeed button').find((b) => b.dataset.v === 'FAST').click();
await sleep(20);
$('#mStart').click();
await sleep(100);
check('stream live screen active', !!$('.live.stream'), 'live.stream class');
check('stream = 20 balls, autoLive', app.match.balls.length === 20 && app.match.cfg?.autoLive === true, `balls=${app.match.balls.length} auto=${app.match.cfg?.autoLive}`);
check('stream: 2 gaps configured', app.match.arena?.gapCount === 2, `gaps=${app.match.arena?.gapCount}`);
check('stream: no home/next buttons in controls', !$('[data-act="home"]') && !$('[data-act="next"]') && !!$('[data-act="stop"]'), 'stop present, home/next absent');
await sleep(3800); // countdown 3s
check('stream: battle running', app.match.state === 'battle', app.match.state);
const sid1 = app.match.cfg.id;
app.match.forceWinner();
await sleep(3200); // round result 2.4s
check('stream: winner overlay', app.match.state === 'winner' && !!$('.win-name'), app.match.state);
await sleep(13000); // winner 12s
check('stream: cta overlay with sequence dots', app.match.state === 'cta' && !!$('.cta-text') && !!$('.cta-dots'), app.match.state + ' dots=' + $$('.cta-dots i').length);
await sleep(9000); // cta 8s
check('stream: intermission auto (no buttons)', app.match.state === 'intermission' && !!$('.inter-cd') && !$('#ovNext'), app.match.state);
await sleep(6600); // intermission 7s -> land inside the auto countdown
check('stream: auto countdown with next-match title', app.match.state === 'countdown' && !!($('.cd-t') && /NEXT MATCH|COUNTRY/.test($('.cd-t').textContent)), `st=${app.match.state} title=${$('.cd-t')?.textContent}`);
await sleep(3200); // countdown 3s -> battle
check('stream: next match auto-started (new id, same category)', app.match.cfg?.id > sid1 && app.match.cfg?.category === 'countries' && app.match.state === 'battle', `id=${app.match.cfg?.id} cat=${app.match.cfg?.category} st=${app.match.state}`);
$('[data-act="stop"]').click();
await sleep(30);
check('stream: stop returns home', !!$('.home'));

check('no uncaught errors', errors.length === 0, errors.slice(0, 4).join(' | '));

console.log(`\nSMOKE RESULT: ${failed === 0 ? 'ALL PASSED ✅' : failed + ' FAILED ❌'}`);
process.exit(failed || errors.length ? 1 : 0);
