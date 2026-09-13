/* Content Manager: CRUD for all categories, custom battles, supporters.
   Images are imported from the device gallery/files and stored as
   downscaled PNG data-URLs (offline-safe). */

import { CATEGORIES, CATEGORY_META } from '../config/defaults.js';
import { PALETTE } from '../core/rng.js';
import { icon } from './icons.js';

export function downscaleImage(file, max = 256) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    const url = URL.createObjectURL(file);
    im.onload = () => {
      const s = Math.min(im.naturalWidth, im.naturalHeight, max);
      const cv = document.createElement('canvas');
      cv.width = cv.height = s;
      const g = cv.getContext('2d');
      g.drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, 0, 0, s, s);
      URL.revokeObjectURL(url);
      resolve(cv.toDataURL('image/png'));
    };
    im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
    im.src = url;
  });
}

export function renderContent(app) {
  app.clearRoot();
  const { content, root } = app;
  const el = document.createElement('div');
  el.className = 'screen content';
  el.innerHTML = `
    <div class="s-head"><button class="btn ghost back" id="cBack">${icon('back', 16)}</button>
      <h1>CONTENT MANAGER</h1><span></span></div>
    <div class="tabs" id="cTabs">
      ${CATEGORIES.map((c) => `<button data-c="${c}" class="${c === 'countries' ? 'on' : ''}">${CATEGORY_META[c].short}</button>`).join('')}
      <button data-c="supporters">SUPPORTERS</button>
    </div>
    <div id="cBody"></div>
  `;
  root.appendChild(el);
  el.querySelector('#cBack').addEventListener('click', () => app.navigate('home'));

  let cat = 'countries';
  let battleId = null;
  const body = el.querySelector('#cBody');

  el.querySelectorAll('#cTabs button').forEach((t) => {
    t.addEventListener('click', () => {
      cat = t.dataset.c;
      el.querySelectorAll('#cTabs button').forEach((x) => x.classList.toggle('on', x === t));
      renderBody();
    });
  });

  function renderBody() {
    if (cat === 'supporters') return renderSupporters();
    if (cat === 'custom') return renderCustom();
    renderCategory();
  }

  /* ---------------- category list ---------------- */
  function renderCategory() {
    const entries = content.list(cat);
    const isCountry = cat === 'countries';
    body.innerHTML = `
      <div class="c-toolbar">
        <input type="search" id="cSearch" placeholder="Search ${isCountry ? '195 countries…' : 'contestants…'}" ${isCountry ? '' : 'style="display:none"'}>
        <span class="c-count" id="cCount"></span>
        ${isCountry ? '' : `<button class="btn small primary" id="cAdd">+ ADD</button>`}
      </div>
      <div class="c-list" id="cList"></div>
      <button class="btn ghost loadmore" id="cMore" style="display:none">SHOW MORE</button>
    `;
    const listEl = body.querySelector('#cList');
    const moreBtn = body.querySelector('#cMore');
    let shown = 60;
    let query = '';

    function draw() {
      let arr = entries;
      if (query) arr = arr.filter((e) => e.name.toLowerCase().includes(query));
      body.querySelector('#cCount').textContent = `${arr.length} / ${entries.length}`;
      const slice = arr.slice(0, shown);
      listEl.innerHTML = slice.map((e) => `
        <div class="crow ${e.enabled === false ? 'off' : ''}" data-id="${e.id}">
          <span class="cthumb">${e.image ? `<img src="${e.image}">` : e.emoji ? `<i>${e.emoji}</i>` : ini(e.name)}</span>
          <span class="cname"><b>${esc(e.name)}</b>${e.sub ? `<small>${esc(e.sub)}</small>` : ''}</span>
          <button class="tswitch ${e.enabled === false ? '' : 'on'}" data-act="toggle" title="Enable/Disable"></button>
          <button class="iconbtn" data-act="edit" title="Edit">✎</button>
          <button class="iconbtn" data-act="del" title="${isCountry ? 'Reset to default' : 'Delete'}">${isCountry ? icon('restart', 14) : icon('trash', 14)}</button>
        </div>`).join('') || '<div class="c-empty">No contestants found.</div>';
      moreBtn.style.display = arr.length > shown ? '' : 'none';
      listEl.querySelectorAll('.crow').forEach((row) => {
        row.querySelector('[data-act="toggle"]').addEventListener('click', (ev) => {
          ev.stopPropagation();
          const e = entries.find((x) => x.id === row.dataset.id);
          content.setFlag(cat, row.dataset.id, { enabled: e.enabled === false });
          draw();
        });
        row.querySelector('[data-act="edit"]').addEventListener('click', (ev) => {
          ev.stopPropagation();
          openEditor(cat, row.dataset.id);
        });
        row.querySelector('[data-act="del"]').addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (isCountry) {
            content.remove(cat, row.dataset.id);
            app.toast('Reset to default flag');
          } else {
            content.remove(cat, row.dataset.id);
            app.toast('Deleted');
          }
          draw();
        });
        row.addEventListener('click', () => openEditor(cat, row.dataset.id));
      });
    }
    draw();
    body.querySelector('#cSearch')?.addEventListener('input', (e) => { query = e.target.value.toLowerCase(); shown = 60; draw(); });
    moreBtn.addEventListener('click', () => { shown += 60; draw(); });
    body.querySelector('#cAdd')?.addEventListener('click', () => openEditor(cat, null));

    function openEditor(catK, id) {
      const e = id ? content.list(catK).find((x) => x.id === id) : null;
      const m = document.createElement('div');
      m.className = 'modal-wrap';
      m.innerHTML = `
        <div class="modal">
          <div class="m-head"><b>${e ? 'EDIT' : 'ADD'} CONTESTANT</b><span class="m-cat">${CATEGORY_META[catK].short}</span></div>
          <div class="m-body">
            <div class="m-row"><label>NAME</label><input id="eName" value="${e ? esc(e.name) : ''}" placeholder="Display name"></div>
            <div class="m-row"><label>SUBTITLE</label><input id="eSub" value="${e ? esc(e.sub || '') : ''}" placeholder="optional"></div>
            ${catK === 'football' || catK === 'youtubers' ? `<div class="m-row"><label>COUNTRY</label><input id="eCountry" value="${e?.country || ''}" placeholder="e.g. Brazil (adds flag)"></div>` : ''}
            <div class="m-row"><label>COLOR RING</label>
              <div class="swatches" id="eColor">
                <button class="sw auto ${!e?.color ? 'on' : ''}" data-color="">AUTO</button>
                ${PALETTE.map((c) => `<button class="sw ${e?.color === c ? 'on' : ''}" data-color="${c}" style="background:${c}"></button>`).join('')}
              </div>
            </div>
            <div class="m-row"><label>IMAGE</label>
              <div class="imgrow">
                <div class="imgprev" id="ePrev">${e?.image ? `<img src="${e.image}">` : e?.emoji ? `<i>${e.emoji}</i>` : ini(e?.name || '?')}</div>
                <div class="imgbtns">
                  <button class="btn small" id="ePick">📁 CHOOSE IMAGE</button>
                  <button class="btn small ghost" id="eClear" ${e?.image ? '' : 'disabled'}>REMOVE IMAGE</button>
                  <input type="file" id="eFile" accept="image/*" style="display:none">
                </div>
              </div>
            </div>
            ${catK === 'countries' ? '<div class="m-note">Countries use the built-in flag set. An uploaded image replaces the flag.</div>' : ''}
          </div>
          <div class="m-foot">
            <button class="btn ghost" id="eCancel">CANCEL</button>
            <button class="btn primary" id="eSave">SAVE</button>
          </div>
        </div>`;
      root.appendChild(m);
      let imgData = e?.image || null;
      let color = e?.color || '';
      m.querySelector('#eCancel').addEventListener('click', () => m.remove());
      m.addEventListener('click', (ev) => { if (ev.target === m) m.remove(); });
      m.querySelector('#eColor').querySelectorAll('.sw').forEach((b) => {
        b.addEventListener('click', () => {
          color = b.dataset.color;
          m.querySelector('#eColor').querySelectorAll('.sw').forEach((x) => x.classList.toggle('on', x === b));
        });
      });
      m.querySelector('#ePick').addEventListener('click', () => m.querySelector('#eFile').click());
      m.querySelector('#eFile').addEventListener('change', async (ev) => {
        const f = ev.target.files?.[0];
        if (!f) return;
        try {
          imgData = await downscaleImage(f);
          m.querySelector('#ePrev').innerHTML = `<img src="${imgData}">`;
          m.querySelector('#eClear').disabled = false;
        } catch { app.toast('Could not read image'); }
      });
      m.querySelector('#eClear').addEventListener('click', () => {
        imgData = null;
        m.querySelector('#ePrev').innerHTML = e?.emoji ? `<i>${e.emoji}</i>` : ini(e?.name || '?');
      });
      m.querySelector('#eSave').addEventListener('click', () => {
        const name = m.querySelector('#eName').value.trim();
        if (!name) { app.toast('Name is required'); return; }
        const patch = {
          name,
          sub: m.querySelector('#eSub').value.trim(),
          color: color || null,
          image: imgData,
        };
        const cEl = m.querySelector('#eCountry');
        if (cEl) patch.country = cEl.value.trim() || null;
        try {
          if (e) content.setFlag(catK, e.id, patch);
          else content.add(catK, patch);
        } catch (err) { app.toast(err.message); return; }
        m.remove();
        draw();
        app.toast('Saved');
      });
    }
  }

  /* ---------------- custom battles ---------------- */
  function renderCustom() {
    const battles = content.listBattles();
    body.innerHTML = `
      <div class="c-toolbar">
        <span class="c-count">${battles.length} battles</span>
        <button class="btn small primary" id="bNew">+ NEW BATTLE</button>
      </div>
      <div class="c-list" id="bList"></div>
      <div id="bDetail"></div>
    `;
    const bList = body.querySelector('#bList');
    const bDetail = body.querySelector('#bDetail');
    function drawBattles() {
      bList.innerHTML = battles.length
        ? battles.map((b) => `
          <div class="crow battle ${battleId === b.id ? 'sel' : ''}" data-id="${b.id}">
            <span class="cthumb">🏆</span>
            <span class="cname"><b>${esc(b.name)}</b><small>${b.contestants.length} contestants</small></span>
            <button class="iconbtn" data-act="del">${icon('trash', 14)}</button>
          </div>`).join('')
        : '<div class="c-empty">No custom battles yet. Create one — then add fighters with name + image.</div>';
      bList.querySelectorAll('.crow').forEach((row) => {
        row.addEventListener('click', () => { battleId = row.dataset.id; drawBattles(); drawDetail(); });
        row.querySelector('[data-act="del"]').addEventListener('click', (ev) => {
          ev.stopPropagation();
          content.deleteBattle(row.dataset.id);
          battleId = null;
          drawBattles(); drawDetail();
        });
      });
    }
    function drawDetail() {
      const b = content.getBattle(battleId);
      if (!b) { bDetail.innerHTML = ''; return; }
      bDetail.innerHTML = `
        <div class="c-detail">
          <div class="c-toolbar">
            <input id="dName" class="dname" value="${esc(b.name)}">
            <button class="btn small primary" id="dAdd">+ ADD FIGHTER</button>
          </div>
          <div class="c-list" id="dList">
            ${b.contestants.map((c) => `
              <div class="crow ${c.enabled === false ? 'off' : ''}" data-id="${c.id}">
                <span class="cthumb">${c.image ? `<img src="${c.image}">` : ini(c.name)}</span>
                <span class="cname"><b>${esc(c.name)}</b></span>
                <button class="tswitch ${c.enabled === false ? '' : 'on'}" data-act="toggle"></button>
                <button class="iconbtn" data-act="edit">✎</button>
                <button class="iconbtn" data-act="del">${icon('trash', 14)}</button>
              </div>`).join('') || '<div class="c-empty">Add at least 2 fighters to start this battle.</div>'}
          </div>
        </div>`;
      body.querySelector('#dName').addEventListener('change', (e) => content.renameBattle(b.id, e.target.value.trim() || b.name));
      body.querySelector('#dAdd').addEventListener('click', () => {
        content.addBattleContestant(b.id, {});
        drawDetail();
        const fresh = content.listBattles().find((x) => x.id === b.id);
        const last = fresh?.contestants?.at(-1);
        if (last) openFighterEditor(last.id, last);
      });
      body.querySelectorAll('#dList .crow').forEach((row) => {
        const fid = row.dataset.id;
        row.querySelector('[data-act="toggle"]').addEventListener('click', (ev) => {
          ev.stopPropagation();
          const f = b.contestants.find((x) => x.id === fid);
          content.setBattleContestant(b.id, fid, { enabled: f.enabled === false });
          drawDetail();
        });
        row.querySelector('[data-act="edit"]').addEventListener('click', (ev) => {
          ev.stopPropagation();
          const f = b.contestants.find((x) => x.id === fid);
          openFighterEditor(fid, f);
        });
        row.querySelector('[data-act="del"]').addEventListener('click', (ev) => {
          ev.stopPropagation();
          content.removeBattleContestant(b.id, fid);
          drawDetail();
        });
      });
    }
    function openFighterEditor(fid, f) {
      const m = document.createElement('div');
      m.className = 'modal-wrap';
      m.innerHTML = `
        <div class="modal">
          <div class="m-head"><b>EDIT FIGHTER</b></div>
          <div class="m-body">
            <div class="m-row"><label>NAME</label><input id="fName" value="${f ? esc(f.name) : ''}"></div>
            <div class="m-row"><label>IMAGE</label>
              <div class="imgrow">
                <div class="imgprev" id="fPrev">${f?.image ? `<img src="${f.image}">` : ini(f?.name || '?')}</div>
                <div class="imgbtns">
                  <button class="btn small" id="fPick">📁 CHOOSE IMAGE</button>
                  <button class="btn small ghost" id="fClear" ${f?.image ? '' : 'disabled'}>REMOVE</button>
                  <input type="file" id="fFile" accept="image/*" style="display:none">
                </div>
              </div>
            </div>
          </div>
          <div class="m-foot">
            <button class="btn ghost" id="fCancel">CANCEL</button>
            <button class="btn primary" id="fSave">SAVE</button>
          </div>
        </div>`;
      root.appendChild(m);
      let img = f?.image || null;
      m.querySelector('#fPick').addEventListener('click', () => m.querySelector('#fFile').click());
      m.querySelector('#fFile').addEventListener('change', async (ev) => {
        const file = ev.target.files?.[0];
        if (!file) return;
        try {
          img = await downscaleImage(file);
          m.querySelector('#fPrev').innerHTML = `<img src="${img}">`;
          m.querySelector('#fClear').disabled = false;
        } catch { app.toast('Could not read image'); }
      });
      m.querySelector('#fClear').addEventListener('click', () => {
        img = null;
        m.querySelector('#fPrev').innerHTML = ini(f?.name || '?');
      });
      m.querySelector('#fCancel').addEventListener('click', () => m.remove());
      m.querySelector('#fSave').addEventListener('click', () => {
        const name = m.querySelector('#fName').value.trim();
        if (!name) { app.toast('Name required'); return; }
        try {
          content.setBattleContestant(battleId, fid, { name, image: img });
        } catch (err) { app.toast(err.message); return; }
        m.remove();
        drawDetail();
      });
    }
    body.querySelector('#bNew').addEventListener('click', () => {
      const b = content.createBattle('NEW BATTLE');
      battleId = b.id;
      drawBattles();
      drawDetail();
    });
    drawBattles();
    drawDetail();
  }

  /* ---------------- supporters ---------------- */
  function renderSupporters() {
    const list = content.getSupporters();
    body.innerHTML = `
      <div class="c-toolbar">
        <span class="c-count">${list.length} supporters (shown in LIVE HUD)</span>
        <button class="btn small primary" id="sAdd">+ ADD</button>
      </div>
      <div class="c-list" id="sList"></div>
    `;
    const sList = body.querySelector('#sList');
    function draw() {
      const arr = [...list].sort((a, b) => b.count - a.count);
      sList.innerHTML = arr.map((p, i) => `
        <div class="crow" data-name="${esc(p.name)}">
          <span class="cthumb"><i style="color:${p.color}">#${i + 1}</i></span>
          <span class="cname"><b style="color:${p.color}">${esc(p.name)}</b><small>${Math.round(p.count).toLocaleString()} support</small></span>
          <button class="iconbtn" data-act="edit">✎</button>
          <button class="iconbtn" data-act="del">${icon('trash', 14)}</button>
        </div>`).join('');
      sList.querySelectorAll('.crow').forEach((row) => {
        row.querySelector('[data-act="edit"]').addEventListener('click', (ev) => {
          ev.stopPropagation();
          const p = list.find((x) => x.name === row.dataset.name);
          const name = prompt('Supporter name:', p.name);
          if (name == null) return;
          const count = Number(prompt('Support count:', p.count)) || p.count;
          p.name = name.trim() || p.name;
          p.count = count;
          content.saveSupporters(list);
          draw();
        });
        row.querySelector('[data-act="del"]').addEventListener('click', (ev) => {
          ev.stopPropagation();
          const i = list.findIndex((x) => x.name === row.dataset.name);
          list.splice(i, 1);
          content.saveSupporters(list);
          draw();
        });
      });
    }
    body.querySelector('#sAdd').addEventListener('click', () => {
      const name = prompt('Supporter name:');
      if (!name) return;
      const count = Number(prompt('Support count:', '1000')) || 1000;
      list.push({ name: name.trim(), count, color: PALETTE[list.length % PALETTE.length] });
      content.saveSupporters(list);
      draw();
    });
    draw();
  }

  renderBody();
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function ini(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  return `<i>${parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : String(name || '?').slice(0, 3).toUpperCase()}</i>`;
}
