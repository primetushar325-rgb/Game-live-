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
check('home has all 12 buttons', $$('.hbtn').length === 12, `got ${$$('.hbtn').length}`);

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
check('controls rendered', $$('#controls button').length >= 8);

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

check('no uncaught errors', errors.length === 0, errors.slice(0, 4).join(' | '));

console.log(`\nSMOKE RESULT: ${failed === 0 ? 'ALL PASSED ✅' : failed + ' FAILED ❌'}`);
process.exit(failed || errors.length ? 1 : 0);
