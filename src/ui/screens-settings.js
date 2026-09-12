/* Settings screen — all match/audio/visual/live options, persisted locally. */

import { COUNT_PRESETS } from '../config/defaults.js';
import { listCustomTracks } from '../audio/music.js';

export function renderSettings(app) {
  app.clearRoot();
  const { settings, root, toast } = app;
  const s = settings.get();
  const el = document.createElement('div');
  el.className = 'screen settings';
  el.innerHTML = `
    <div class="s-head"><button class="btn ghost back" id="sBack">←</button><h1>SETTINGS</h1><span></span></div>
    <div class="s-scroll">
      <section><h2>MATCH</h2>
        ${row('BALL COUNT', seg('mBall', ['20', '30', '50', '70', '100', '195'], String(s.ballCount)))}
        ${row('CUSTOM COUNT', `<input type="number" id="mCustom" min="2" max="300" value="${s.customCount}">`)}
        ${row('BALL SPEED', seg('mSpeed', ['LOW', 'NORMAL', 'HIGH'], s.speed))}
        ${row('COLLISION STRENGTH', `<input type="range" id="mColl" min="0.6" max="1" step="0.01" value="${s.collision}"><output id="mCollO">${s.collision}</output>`)}
        ${row('ARENA SIZE', seg('mArena', ['S', 'M', 'L'], s.arenaSize))}
        ${row('EXIT GAP SIZE', `<input type="range" id="mGap" min="14" max="100" step="1" value="${s.gapSize}"><output id="mGapO">${s.gapSize}°</output>`)}
        ${row('EXIT ROTATION', toggle('mGapRot', s.gapRotate))}
        ${row('EXIT ROTATION SPEED', `<input type="range" id="mGapSpd" min="0" max="20" step="1" value="${s.gapSpeed}"><output id="mGapSpdO">${s.gapSpeed}°/s</output>`)}
        ${row('MATCH DURATION (MIN)', `<input type="number" id="mDur" min="5" max="180" value="${Math.round(s.matchDuration / 60)}">`)}
        ${row('COUNTDOWN (SEC)', `<input type="number" id="mCd" min="1" max="10" value="${s.countdown}">`)}
        ${row('WINNER DISPLAY (SEC)', `<input type="number" id="mWin" min="4" max="60" value="${s.winnerDuration}">`)}
        ${row('CTA DURATION', seg('mCta', ['3', '5', '8', '10', '15'], String(s.ctaDuration)))}
        ${row('INTERMISSION (SEC)', `<input type="number" id="mInter" min="3" max="30" value="${s.intermission}">`)}
        ${row('TOURNAMENT PRESET', seg('mTourn', ['FULL', 'SCALE', 'SINGLE'], s.tournamentPreset, 'FULL = 195→70→30→10→1 (scaled to your count) • SCALE = proportional • SINGLE = 1 winner'))}
      </section>
      <section><h2>MUSIC</h2>
        ${row('BACKGROUND MUSIC', toggle('mMusOn', s.musicOn))}
        ${row('VOLUME', vol('mMusVol', s.musicVolume))}
        ${row('MODE', seg('mMusMode', ['GENERATED', 'CUSTOM'], s.musicMode === 'RANDOM' ? 'CUSTOM' : 'GENERATED', 'GENERATED = built-in synth loops (always available). CUSTOM = your imported tracks (random per state).'))}
        <div class="s-music-files">
          <div class="m-row"><label>ADD TRACK</label>
            <div class="mrow2">
              <select id="mMusState">
                <option value="NORMAL">NORMAL</option><option value="SUSPENSE">SUSPENSE</option>
                <option value="FINAL">FINAL</option><option value="VICTORY">VICTORY</option><option value="CTA">CTA</option>
              </select>
              <button class="btn small" id="mMusAdd">🎵 CHOOSE FILE</button>
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
        <div class="m-row"><label></label><button class="btn small ghost" id="mVoiceTest">🎤 TEST VOICE</button></div>
        <div class="m-note">Uses the device's local TTS — no internet needed.</div>
      </section>
      <section><h2>VIDEO / PERFORMANCE</h2>
        ${row('PARTICLES', toggle('mParticles', s.particles))}
        ${row('QUALITY', seg('mQual', ['LOW', 'MEDIUM', 'HIGH'], s.quality))}
        ${row('AUTO QUALITY (FPS PROTECT)', toggle('mAutoQ', s.autoQuality))}
        ${row('WATERMARK', toggle('mWm', s.watermark))}
      </section>
      <section><h2>LIVE</h2>
        ${row('AUTO LIVE (STARTS LOOPS)', toggle('mAutoLive', s.autoLive))}
        ${row('SUPPORTERS LIVE SIM', toggle('mSupSim', s.supportSim, 'Gently grows supporter counts during matches.'))}
      </section>
      <div class="s-reset"><button class="btn ghost danger" id="sReset">RESET ALL SETTINGS</button></div>
    </div>`;
  root.appendChild(el);
  el.querySelector('#sBack').addEventListener('click', () => app.navigate('home'));

  const save = (patch) => {
    try { settings.set(patch); } catch (e) { toast(e.message); }
  };
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
  $('mColl').addEventListener('input', (e) => { $('mCollO').textContent = e.target.value; save({ collision: Number(e.target.value) }); });
  onSeg('mArena', (v) => save({ arenaSize: v }));
  $('mGap').addEventListener('input', (e) => { $('mGapO').textContent = e.target.value + '°'; save({ gapSize: Number(e.target.value) }); });
  onToggle('mGapRot', (v) => save({ gapRotate: v }));
  $('mGapSpd').addEventListener('input', (e) => { $('mGapSpdO').textContent = e.target.value + '°/s'; save({ gapSpeed: Number(e.target.value) }); });
  $('mDur').addEventListener('change', (e) => save({ matchDuration: Math.max(5, Number(e.target.value) || 45) * 60 }));
  $('mCd').addEventListener('change', (e) => save({ countdown: Math.max(1, Number(e.target.value) || 3) }));
  $('mWin').addEventListener('change', (e) => save({ winnerDuration: Math.max(4, Number(e.target.value) || 12) }));
  onSeg('mCta', (v) => save({ ctaDuration: Number(v) }));
  $('mInter').addEventListener('change', (e) => save({ intermission: Math.max(3, Number(e.target.value) || 7) }));
  onSeg('mTourn', (v) => save({ tournamentPreset: v }));
  onToggle('mMusOn', (v) => { save({ musicOn: v }); app.music.setMusicState(app.match.musicState || 'OFF'); app.music.applyVol(); });
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
          <span class="cthumb">🎵</span>
          <span class="cname"><b>${esc(r.name)}</b><small>${r.state}</small></span>
          <button class="iconbtn" data-act="del">🗑</button>
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
  return `<div class="seg" id="${id}">${opts.map((o) => `<button data-v="${o}" class="${o === on ? 'on' : ''}">${o}</button>`).join('')}</div>${note ? `<div class="m-note">${note}</div>` : ''}`;
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
