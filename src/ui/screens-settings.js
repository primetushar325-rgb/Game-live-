/* Settings screen — all match/audio/visual/stream options, persisted locally. */

import { COUNT_PRESETS, SPEED_PRESETS, COLLISION_POWER } from '../config/defaults.js';
import { listCustomTracks } from '../audio/music.js';
import { icon } from './icons.js';

export function renderSettings(app) {
  app.clearRoot();
  const { settings, root, toast } = app;
  const s = settings.get();
  const sm = s.stream || {};
  const el = document.createElement('div');
  el.className = 'screen settings';
  el.innerHTML = `
    <div class="s-head"><button class="btn ghost back" id="sBack">${icon('back', 16)}</button><h1>SETTINGS</h1><span></span></div>
    <div class="s-scroll">
      <section><h2>MATCH</h2>
        ${row('BALL COUNT', seg('mBall', ['20', '30', '50', '70', '100', '195'], String(s.ballCount)))}
        ${row('CUSTOM COUNT', `<input type="number" id="mCustom" min="2" max="300" value="${s.customCount}">`)}
        ${row('SPEED TIER', seg('mSpeed', ['LOW', 'NORMAL', 'HIGH'], s.speed))}
        ${row('BALL SPEED %', `<div class="volrow"><input type="range" id="mSpeedPct" min="10" max="200" step="5" value="${Math.round((s.ballSpeed || 1) * 100)}"><output id="mSpeedPctO">${Math.round((s.ballSpeed || 1) * 100)}%</output></div><div class="m-note">${Object.entries(SPEED_PRESETS).map(([k, v]) => `${k}=${Math.round(v * 100)}%`).join(' • ')}</div>`)}
        ${row('COLLISION POWER', seg('mCollPow', ['LOW', 'NORMAL', 'HIGH', 'EXTREME'], s.collisionPower || 'NORMAL', 'How hard tokens bounce off each other — independent of speed.'))}
        ${row('ARENA SIZE', seg('mArena', ['S', 'M', 'L'], s.arenaSize))}
        ${row('EXIT GAPS', seg('mGapN', ['1', '2', '3', '4'], String(s.gapCount || 1)))}
        ${row('GAP POSITION', seg('mGapPos', ['FIXED', 'RANDOM_MATCH', 'RANDOM_ROUND'], s.gapPosition || 'RANDOM_MATCH', 'FIXED = top • RANDOM_MATCH = new spot per match • RANDOM_ROUND = new spot per round'))}
        ${row('EXIT GAP SIZE', `<input type="range" id="mGap" min="14" max="100" step="1" value="${s.gapSize}"><output id="mGapO">${s.gapSize}°</output>`)}
        ${row('MOVING GAPS', toggle('mGapRot', s.gapRotate, 'Special mode: gaps drift while the match runs (default OFF — gaps stay put).'))}
        ${row('GAP DRIFT SPEED', `<input type="range" id="mGapSpd" min="0" max="20" step="1" value="${s.gapSpeed}"><output id="mGapSpdO">${s.gapSpeed}°/s</output>`)}
        ${row('WINNER COUNT', seg('mWinners', ['1', '5', '10'], String(s.winnerCount || 1)))}
        ${row('MATCH DURATION (MIN)', `<input type="number" id="mDur" min="5" max="180" value="${Math.round(s.matchDuration / 60)}">`)}
        ${row('COUNTDOWN (SEC)', `<input type="number" id="mCd" min="1" max="10" value="${s.countdown}">`)}
        ${row('WINNER DISPLAY (SEC)', `<input type="number" id="mWin" min="4" max="60" value="${s.winnerDuration}">`)}
        ${row('CTA DURATION', seg('mCta', ['3', '5', '8', '10', '15'], String(s.ctaDuration)))}
        ${row('INTERMISSION (SEC)', `<input type="number" id="mInter" min="3" max="30" value="${s.intermission}">`)}
        ${row('TOURNAMENT PRESET', seg('mTourn', ['FULL', 'SCALE', 'SINGLE'], s.tournamentPreset, 'FULL = 195→70→30→10→final (scaled) • SCALE = proportional • SINGLE = straight to final'))}
      </section>
      <section><h2>STREAM MODE</h2>
        ${row('AUTO START NEXT', toggle('smAutoStart', sm.autoStart !== false))}
        ${row('AUTO COUNTDOWN', toggle('smAutoCd', sm.autoCountdown !== false))}
        ${row('STREAM COUNTDOWN', seg('smCd', ['3', '5', '10'], String(sm.streamCountdown || 3)))}
        ${row('COMMENT CTA', toggle('smCtaCmt', sm.commentCta !== false))}
        ${row('SUBSCRIBE CTA', toggle('smCtaSub', sm.subscribeCta !== false))}
        ${row('WINNER ANIMATION', toggle('smWinAnim', sm.winnerAnim !== false))}
        ${row('WINNER HISTORY VISIBLE', seg('smWinN', ['5', '10', '20'], String(sm.winnerHistoryCount || 5)))}
        ${row('KEEP SCREEN AWAKE', toggle('smAwake', sm.keepAwake !== false))}
        <div class="m-note">Stream mode auto-advances: match → winner → CTA → countdown → next match. Forever.</div>
      </section>
      <section><h2>MUSIC</h2>
        ${row('BACKGROUND MUSIC', toggle('mMusOn', s.musicOn))}
        ${row('MASTER VOLUME', vol('mMasterVol', s.masterVolume ?? 90))}
        ${row('MUSIC VOLUME', vol('mMusVol', s.musicVolume))}
        ${row('MODE', seg('mMusMode', ['GENERATED', 'CUSTOM'], s.musicMode === 'RANDOM' ? 'CUSTOM' : 'GENERATED', 'GENERATED = built-in synth loops (always available). CUSTOM = your imported tracks.'))}
        <div class="s-music-files">
          <div class="m-row"><label>ADD TRACK</label>
            <div class="mrow2">
              <select id="mMusState">
                <option value="NORMAL">NORMAL</option><option value="SUSPENSE">SUSPENSE</option>
                <option value="FINAL">FINAL</option><option value="VICTORY">VICTORY</option><option value="CTA">CTA</option>
              </select>
              <button class="btn small" id="mMusAdd">${icon('music', 13)} CHOOSE FILE</button>
              <input type="file" id="mMusFile" accept="audio/*" style="display:none">
            </div>
          </div>
          <div class="c-list" id="mMusList"></div>
          <div class="m-note">Use royalty-free / your own audio only.</div>
        </div>
      </section>
      <section><h2>SOUND EFFECTS</h2>
        ${row('SFX ENABLED', toggle('mSfxOn', s.sfxOn))}
        ${row('VOLUME', vol('mSfxVol', s.sfxVolume))}
      </section>
      <section><h2>VOICE ANNOUNCER</h2>
        ${row('ENABLED', toggle('mVoiceOn', s.voiceOn))}
        ${row('VOLUME', vol('mVoiceVol', s.voiceVolume))}
        ${row('SPEAK RATE', `<input type="range" id="mVoiceRate" min="0.8" max="1.4" step="0.05" value="${s.voiceRate}"><output id="mVoiceRateO">${s.voiceRate}</output>`)}
        ${row('ANNOUNCE ELIMINATIONS', toggle('mVoiceElim', s.announceEliminations))}
        <div class="m-row"><label></label><button class="btn small ghost" id="mVoiceTest">${icon('mic', 13)} TEST VOICE</button></div>
        <div class="m-note">Uses the device's local TTS — no internet needed.</div>
      </section>
      <section><h2>VIDEO / PERFORMANCE</h2>
        ${row('PARTICLES', toggle('mParticles', s.particles))}
        ${row('QUALITY', seg('mQual', ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'], s.quality))}
        ${row('AUTO QUALITY (FPS PROTECT)', toggle('mAutoQ', s.autoQuality))}
        ${row('WATERMARK', toggle('mWm', s.watermark))}
      </section>
      <section><h2>LIVE</h2>
        ${row('AUTO LIVE (STARTS LOOPS)', toggle('mAutoLive', s.autoLive))}
        ${row('SUPPORTERS LIVE SIM', toggle('mSupSim', s.supportSim, 'Gently grows supporter counts during matches.'))}
      </section>
      <div class="s-reset"><button class="btn ghost danger" id="sReset">${icon('trash', 13)} RESET ALL SETTINGS</button></div>
    </div>`;
  root.appendChild(el);
  el.querySelector('#sBack').addEventListener('click', () => app.navigate('home'));

  const save = (patch) => {
    try { settings.set(patch); } catch (e) { toast(e.message); }
  };
  const saveStream = (patch) => save({ stream: { ...(settings.get().stream || {}), ...patch } });
  const $ = (id) => el.querySelector('#' + id);
  const onSeg = (id, apply) => {
    $(id).querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      $(id).querySelectorAll('button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      apply(b.dataset.v);
    }));
  };
  const onToggle = (id, apply) => $(id).addEventListener('click', () => {
    const on = !$(id).classList.contains('on');
    $(id).classList.toggle('on', on);
    apply(on);
  });
  const onVol = (id, out, apply) => {
    $(id).addEventListener('input', (e) => {
      $(out).textContent = e.target.value + '%';
      apply(Number(e.target.value));
    });
  };

  onSeg('mBall', (v) => save({ ballCount: Number(v), customCount: Number(v) }));
  $('mCustom').addEventListener('change', (e) => save({ customCount: Number(e.target.value) || s.customCount }));
  onSeg('mSpeed', (v) => save({ speed: v }));
  $('mSpeedPct').addEventListener('input', (e) => { $('mSpeedPctO').textContent = e.target.value + '%'; save({ ballSpeed: Number(e.target.value) / 100 }); });
  onSeg('mCollPow', (v) => save({ collisionPower: v }));
  onSeg('mArena', (v) => save({ arenaSize: v }));
  onSeg('mGapN', (v) => save({ gapCount: Number(v) }));
  onSeg('mGapPos', (v) => save({ gapPosition: v }));
  $('mGap').addEventListener('input', (e) => { $('mGapO').textContent = e.target.value + '°'; save({ gapSize: Number(e.target.value) }); });
  onToggle('mGapRot', (v) => save({ gapRotate: v }));
  $('mGapSpd').addEventListener('input', (e) => { $('mGapSpdO').textContent = e.target.value + '°/s'; save({ gapSpeed: Number(e.target.value) }); });
  onSeg('mWinners', (v) => save({ winnerCount: Number(v) }));
  $('mDur').addEventListener('change', (e) => save({ matchDuration: Math.max(5, Number(e.target.value) || 45) * 60 }));
  $('mCd').addEventListener('change', (e) => save({ countdown: Math.max(1, Number(e.target.value) || 3) }));
  $('mWin').addEventListener('change', (e) => save({ winnerDuration: Math.max(4, Number(e.target.value) || 12) }));
  onSeg('mCta', (v) => save({ ctaDuration: Number(v) }));
  $('mInter').addEventListener('change', (e) => save({ intermission: Math.max(3, Number(e.target.value) || 7) }));
  onSeg('mTourn', (v) => save({ tournamentPreset: v }));
  // stream
  onToggle('smAutoStart', (v) => saveStream({ autoStart: v }));
  onToggle('smAutoCd', (v) => saveStream({ autoCountdown: v }));
  onSeg('smCd', (v) => saveStream({ streamCountdown: Number(v) }));
  onToggle('smCtaCmt', (v) => saveStream({ commentCta: v }));
  onToggle('smCtaSub', (v) => saveStream({ subscribeCta: v }));
  onToggle('smWinAnim', (v) => saveStream({ winnerAnim: v }));
  onSeg('smWinN', (v) => saveStream({ winnerHistoryCount: Number(v) }));
  onToggle('smAwake', (v) => saveStream({ keepAwake: v }));
  // audio
  onToggle('mMusOn', (v) => { save({ musicOn: v }); app.music.setMusicState(app.match.musicState || 'OFF'); app.music.applyVol(); });
  onVol('mMasterVol', 'mMasterVolO', (v) => { save({ masterVolume: v }); app.music.applyVol(); });
  onVol('mMusVol', 'mMusVolO', (v) => { save({ musicVolume: v }); app.music.applyVol(); });
  onSeg('mMusMode', (v) => save({ musicMode: v === 'CUSTOM' ? 'RANDOM' : 'GEN' }));
  onToggle('mSfxOn', (v) => save({ sfxOn: v }));
  onVol('mSfxVol', 'mSfxVolO', (v) => save({ sfxVolume: v }));
  onToggle('mVoiceOn', (v) => save({ voiceOn: v }));
  onVol('mVoiceVol', 'mVoiceVolO', (v) => save({ voiceVolume: v }));
  $('mVoiceRate').addEventListener('input', (e) => { $('mVoiceRateO').textContent = e.target.value; save({ voiceRate: Number(e.target.value) }); });
  onToggle('mVoiceElim', (v) => save({ announceEliminations: v }));
  $('mVoiceTest').addEventListener('click', () => app.voice.speak('BattleLoop Live! Who will survive?'));
  onToggle('mParticles', (v) => save({ particles: v }));
  onSeg('mQual', (v) => { save({ quality: v }); app.setQuality(v); });
  onToggle('mAutoQ', (v) => save({ autoQuality: v }));
  onToggle('mWm', (v) => save({ watermark: v }));
  onToggle('mAutoLive', (v) => save({ autoLive: v }));
  onToggle('mSupSim', (v) => save({ supportSim: v }));
  $('sReset').addEventListener('click', () => {
    settings.reset();
    toast('Settings reset');
    app.navigate('settings');
  });

  // music files
  $('mMusAdd').addEventListener('click', () => $('mMusFile').click());
  $('mMusFile').addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const st = $('mMusState').value;
      await app.music.addCustomTrack(st, f);
      toast(`Track added: ${f.name} → ${st}`);
      drawTracks();
    } catch (err) { toast('Could not load audio file'); }
  });
  async function drawTracks() {
    const rows = await listCustomTracks();
    $('mMusList').innerHTML = rows.length
      ? rows.map((r) => `
        <div class="crow" data-id="${r.id}">
          <span class="cthumb">${icon('music', 16)}</span>
          <span class="cname"><b>${esc(r.name)}</b><small>${r.state}</small></span>
          <button class="iconbtn" data-act="del">${icon('trash', 14)}</button>
        </div>`).join('')
      : '<div class="c-empty">No custom tracks yet.</div>';
    $('mMusList').querySelectorAll('.crow').forEach((row) => {
      row.querySelector('[data-act="del"]').addEventListener('click', async () => {
        await app.music.removeCustomTrack(row.dataset.id);
        drawTracks();
      });
    });
  }
  drawTracks();
}

function row(label, control, note) {
  return `<div class="m-row"><label>${label}</label>${control}${note ? `<div class="m-note">${note}</div>` : ''}</div>`;
}
function seg(id, opts, on, note) {
  return `<div class="seg" id="${id}">${opts.map((o) => `<button data-v="${o}" class="${o === on ? 'on' : ''}">${o.replace('_', ' ')}</button>`).join('')}</div>${note ? `<div class="m-note">${note}</div>` : ''}`;
}
function toggle(id, on, note) {
  return `<button class="tswitch lg ${on ? 'on' : ''}" id="${id}" title="${note || ''}"></button>${note ? `<div class="m-note">${note}</div>` : ''}`;
}
function vol(id, v) {
  return `<div class="volrow"><input type="range" id="${id}" min="0" max="100" value="${v}"><output id="${id}O">${v}%</output></div>`;
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
