# BATTLELOOP LIVE

> **WHO WILL SURVIVE?** — a live elimination battle arena built for YouTube Live streaming.
> **v2.0.1** — Stream-Mode engine edition with resilient local contestant assets.

Circular physics arena with **configurable exit gaps (1–4)**. Balls (flags / logos / custom
fighters) bounce, collide and spin — the only way to be eliminated is to **completely leave
through a gap**. Physics decides the winner. No forced outcomes, no scripts, no online services.

![status](https://img.shields.io/badge/QA-79%2F79%20headless%20%2B%20DOM%20smoke-success)
![status](https://img.shields.io/badge/build-vite%20production-success)
![status](https://img.shields.io/badge/offline--first-100%25%20local-informational)
![badge](https://img.shields.io/badge/v-2.0.1-brightgreen)

---

## What's new in 2.0

- **Resilient contestant asset registry.** Every record now uses one shared `id / name / shortName / category / image / fallbackImage / enabled / metadata` contract. Local image preloading, a texture-source-aware cache, and generated offline SVG identity cards mean an unavailable primary asset never produces a blank token.
- **Contestant images inside every ball.** All 195 country flags are bundled as real PNG
  textures (MIT `lipis/flag-icons`, rasterized to `public/flags/`). YouTuber / football /
  social / gaming / custom images render inside the token, with a safe
  `image → local identity-card → initials` fallback — a blank ball is impossible.
- **Real physics controls.** `BALL SPEED` (10%–200% + SLOW/NORMAL/FAST/INSANE) scales velocity,
  jitter and storms; `COLLISION POWER` (LOW/NORMAL/HIGH/EXTREME) is an independent restitution.
  Adaptive sub-stepping + midpoint gap sampling prevent wall tunneling at INSANE.
- **1–4 exit gaps** (evenly distributed), with `FIXED / RANDOM MATCH / RANDOM ROUND` placement
  and an optional moving-gap special mode. Larger arena (dominant on screen, no HUD overlap).
- **Stream Mode engine.** Pick one category → `START STREAM` → it runs
  match → winner → CTA → auto countdown → next match **forever in that category**, with minimal
  controls (pause / mute / stop), triple-tap reveal, wake lock and auto-advance. No "home/next"
  popups, no manual interaction. Stop it any time.
- **Winner presentation + history.** Zoom/glow/confetti/fanfare winner overlay (multi-winner
  podium for 5/10-winner finals) plus a persistent **RECENT WINNERS** panel.
- **Dynamic CTA system.** Category-aware comment CTAs + a sequential
  comment → subscribe → like/follow sequence with a premium vector-icon system (no UI emoji).
- **Expanded audio.** 14 generative music variants (NORMAL×4, SUSPENSE×3, FINAL×3,
  VICTORY×3, CTA×2) with dip transitions; dynamic music follows the survivor count; more
  announcer variations; master/music/SFX/voice volumes.
- **Tournament winner count** (1/5/10), ULTRA quality tier, and a bigger
  headless QA matrix (gaps × speed × collision, 195-ball INSANE stress, 100-match stream loop).

---

## Play it

**Web (recommended for streaming):**

```bash
npm install
npm run dev        # → http://localhost:5173   (port 9:16, portrait)
```

Production build + preview:

```bash
npm run build
npm run preview    # → http://localhost:4173
```

**Android (Capacitor project included, `android/`):**

```bash
npm run build
npm run cap:sync   # npx cap sync android
npx cap open android     # opens in Android Studio → Build → Build APK(s)
```

Output APK: `android/app/build/outputs/apk/debug/app-debug.apk`
(For a release APK/AAB: Android Studio → *Build Generate Signed Bundle/APK*.)

The app is portrait-locked, fullscreen-clean, keeps the screen awake, and uses triple-tap
to hide/show the control layer (see *Stream mode* below).

---

## Feature checklist (all implemented & tested)

| Area | What works |
|---|---|
| **Arena** | Circular boundary, ONE rotating/moving exit gap per match, wall reflection, spin, elastic collisions, storm bursts to break stalemates |
| **Contestants** | Flag / logo / emoji / image + name + colored ring. **Full 195-country dataset** with "FLAGS LEFT" counter. YouTubers, Social Media, Football, Gaming, Celebrity, **Custom** (user battles with images from gallery), **Random** (unpredictable category order, `MATCH #001…`) |
| **Sizes** | 20 / 30 / 50 / 70 / 100 / 195 per battle (clamped to available pool) |
| **Tournament** | Qualification chain **195 → 70 → 30 → 10 → 1** (FULL), plus SINGLE (N→1) and SCALE presets; HUD shows `QUALIFIED FOR FINAL`, `TOP SUPPORTERS`, `ELIMINATIONS IN …`, `x/y QUALIFIED` |
| **Top HUD** | Live left-counter, phase (QUALIFYING / FINAL), elimination timer, qualified counter, match # + seed |
| **Elimination** | Only via full gap exit. Sound + screen popup + elimination feed + optional TTS announce |
| **Winner** | Trophy + confetti + fanfare overlay (12 s) with winner name |
| **CTA** | Rotating call-to-action overlays (default 3–15 s, configurable, 6 original templates) |
| **Voice** | **Local TTS announcer** (Web Speech API / Android TTS) — volume 0–100, on/off, countdown + elimination + winner announcements. No online AI voice, no API keys |
| **SFX** | Procedural (Web Audio): collision variations by impact, wall hits, elimination, countdown beeps, round start, final-two sting, winner fanfare, CTA whoosh — no audio files required, all original synthesis |
| **Music** | Procedural 5-state background loop (NORMAL / SUSPENSE / FINAL / VICTORY / CTA) — original synth patterns, no copyrighted songs. Optional user-loaded MP3s supported |
| **AUTO LIVE** | ON/OFF: match → countdown → battle → qualify → winner → CTA → intermission → **next match, forever** |
| **Infinite mode** | Same as AUTO LIVE; **anti-repetition**: per-match seeded RNG, randomized spawn layout / velocities / gap position & speed, never the same category 3× in a row |
| **Determinism** | Every match is fully determined by its seed (reproducible; same seed ⇒ same elimination order — verified by QA) |
| **Settings** | Ball sizes, countdown, match duration, gap size, speed (LOW/MED/HIGH), quality (with auto FPS-protection downgrade), TTS volume/language, SFX/music volumes, CTA duration, auto-live, wake lock, etc. |
| **Content manager** | Per-category: add / edit / delete / enable-disable contestants, search, **replace image from gallery** (auto-downscaled to data-URL), custom battles with named fighters, TOP SUPPORTERS list editor |
| **History** | Every finished match: #, category, winner, count, duration, seed. View + clear |
| **Live controls** | Pause / Next / Restart / Mute / Auto toggle / **Stream mode** / **Hide controls** / Exit — small control layer, auto-hides, triple-tap anywhere to toggle |
| **Stream mode** | Fullscreen 9:16, UI hidden (triple-tap to recall), screen-awake (Wake Lock API), controls touch-guarded |
| **Performance** | Fixed-timestep physics (120 Hz) with spatial hash grid, object pooling for effects, texture/sprite caching, 195-ball stress verified (0 NaN, 0 escapes, 5 772 collisions/30 s), auto quality reduction when FPS drops |
| **Home screen** | All entry points: 6 categories, Random, Custom battles, Content Manager, History, Settings, Test Mode |
| **Branding** | Original logo (ring with gap + battle ball + LIVE dot) in full/icon/mono, PWA icons, branded Android launcher + adaptive icon + splash |
| **Test Mode** | Spawn 10/20/50/100, force elimination, force winner, test countdown, test CTA, test voice, music cycle, collision SFX, next match, 5-match auto loop |
| **Offline-first** | 100 % local. No server, no login, no network API. All data in localStorage |
| **Error handling** | Missing image → auto placeholder (initials tile). Missing audio → silent no-ops, never crash. Invalid content (empty category) → clear error message, never a broken match. Storage failures → in-memory fallback |
| **Copyright-safe** | Original procedural audio, original logo, emoji/placeholder flags, user-imported images only. No scraping, no third-party assets |

---

## Automated QA

Two suites, both green:

```bash
npm run qa          # 71/71 headless engine checks (gaps x speed matrix, 195-ball stress, 100-match stream loop)
node qa/dom-smoke.js   # boots the real app in jsdom, clicks every screen,
                       # runs a full match lifecycle (countdown → 195-ball battle
                       # → pause/resume → winner → CTA → intermission → history)
```

`qa/headless.js` covers:

- dataset integrity (exactly 195 countries, unique codes/names, flag glyphs)
- tournament builder for every preset (FULL clamp, 2→1 edge, SINGLE, SCALE)
- core utils (object pool reset-on-reuse, spatial grid pair detection)
- physics invariants at 100 balls: **no NaN, no wall escape, no buried balls,
  left-count monotonic, no stuck states, collisions actually happen, storms fire**
- match completion for 20 / 50 / 100 / 195 balls (winner decided, exactly N−1 eliminated)
- determinism (same seed ⇒ identical elimination sequence + winner)
- full tournament 195→70→30→10→1 round chain
- **AUTO LIVE long run: 55 consecutive matches** — every match has a winner, ids
  increase, balls reset per match, event listeners don't accumulate, no 3-in-a-row
  category, heap memory bounded (~12 MB)
- 195-ball HIGH-speed stress (3 600 substeps, 0 NaN, 0 escapes)

---

## Architecture

```
src/
├── core/          EventBus, object Pool, SpatialGrid, seeded RNG, math utils
├── engine/        match.js (state machine + rules), physics.js (fixed-step sim),
│                  tournament.js (round builder)
├── data/          countries.js (195), youtubers.js, social.js, football.js,
│                  games.js, celebrities.js, ctas.js
├── store/         settings, content, history, storage (localStorage + memory fallback)
├── audio/         audioManager, sfx (procedural), music (5-state synth), voice (local TTS)
├── render/        renderer (Canvas 2D, sprite cache, quality scaling), fx (confetti/popups)
├── stream/        streamMode (fullscreen, wake lock, triple-tap, touch guard)
└── ui/            app (orchestrator + main loop), live (arena HUD/controls/overlays),
                   screens-home / content / settings / misc, logo, toast
```

**Match state machine**

```
idle → countdown → battle → round_result → (next round | winner) → cta → intermission → (auto-next | over)
                              paused (from any running state)
```

Fixed timestep: the simulation always advances in 1/120 s substeps inside a render-frame
accumulator — physics speed is independent of display FPS, and the same seed always
produces the same match.

**Elimination rule** — a ball is eliminated only when its entire circle has crossed the
boundary **inside the gap arc**. Walls reflect (with restitution) everywhere else.
A per-substep survivor guard prevents double-counting.

---

## Streaming setup (YouTube)

1. `npm run build && npm run preview` (or run the Android APK on a phone/tablet).
2. Capture with OBS: *Window Capture* (the browser) or *Display Capture* (phone over
   HDMI/USB). In OBS, crop/scale to 1080×1920 for a portrait stream, or letterbox
   1920×1080 with side panels.
3. Start a battle → **AUTO: ON** in the live controls → the show runs itself:
   countdown → battle → winner → CTA → next match, forever.
4. **Stream mode** button → fullscreen, controls hidden. **Triple-tap** anywhere on
   screen to bring controls back (single taps can't accidentally hit buttons).
5. Optional: phone as second screen — open the app on the phone for the audience cam
   (it also works offline).

Suggested: portrait 1080×1920 @ 30 fps; the app renders a 1080×1920 design space and
scales to any window while keeping the aspect.

---

## Local content (no scraping, no accounts)

- **Flags**: the 195-country set ships with emoji flags + original placeholder art.
  Replace any country's image from your gallery in *Content Manager → Countries*.
- **YouTubers / Football / Social / Gaming / Celebrity**: curated starter lists with
  name, subtitle (e.g. country / platform) and placeholder tiles. Add, edit, delete,
  enable/disable, and **upload your own images** (auto-compressed locally).
- **Custom battles**: create a named battle, add named fighters with images, then start
  that battle from Home.
- **TOP SUPPORTERS**: editable list shown in the HUD during matches.

Everything persists in `localStorage`; there is no backend.

---

## Project scripts

| Command | What |
|---|---|
| `npm run dev` | Vite dev server on `0.0.0.0:5173` |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the production build on `:4173` |
| `npm run icons` | Regenerate PWA/app icon PNGs from the logo (`scripts/make-icons.js`) |
| `npm run qa` | Headless engine QA (61 checks) |
| `node qa/dom-smoke.js` | jsdom UI smoke test (all screens + full match lifecycle) |
| `node scripts/brand-android.js` | Re-brand the Android shell (theme, icons, splash) |
| `npm run cap:sync` | `cap sync android` (copy `dist/` into the Android project) |

---

## Privacy & licensing

- **No network calls at all.** No analytics, no login, no remote config.
- Audio is 100 % procedurally synthesized at runtime (Web Audio API) — no tracks,
  samples, or fonts with third-party rights are bundled.
- The logo and icons are original (generated by `scripts/make-icons.js`).
- All bundled contestant names are public figures used in a local, non-commercial
  simulation; images are placeholders or your own uploads. Remove any name you don't
  want on your channel via the Content Manager.
- Code: MIT.

## Known limitations

- No APK is committed (building requires the Android SDK / JDK); the `android/`
  project is complete and ready — build it locally (2 commands above).
- TTS voice quality depends on the device/browser voice pack (local only).
- 195-ball matches are CPU-heavier on low-end phones; the app auto-drops visual
  quality first (shadows → trails → particles) to hold the frame rate.
