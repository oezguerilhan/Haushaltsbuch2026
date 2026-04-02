'use strict';

import { S, getCat, allCats, getAccs, save, processRecurring } from '../state.js';
import { fmt, fmtD, esc, uid, today } from '../utils.js';
import { IVLS } from '../constants.js';
import { openModal, closeModal, notify } from '../modal.js';
import { render } from '../router.js';

export function vRec() {
  const act = S.recurring.filter(r => r.active);
  const mInc = act.filter(r => r.type === 'income' && r.interval === 'monthly').reduce((s, r) => s + r.amount, 0);
  const mExp = act.filter(r => r.type === 'expense' && r.interval === 'monthly').reduce((s, r) => s + r.amount, 0);
  return `<div class="view-head"><div><h2>Wiederkehrend</h2><p>Automatische Buchungen</p></div><button class="btn btn-a" data-action="openRecForm">+ Neue Regel</button></div>
  ${act.length ? `<div class="grid2" style="margin-bottom:20px">
    <div class="kpi"><div class="kpi-lbl">Monatl. Einnahmen</div><div class="kpi-val hl-g">${fmt(mInc)}</div><div class="kpi-sub">Aktive Regeln (monatlich)</div></div>
    <div class="kpi"><div class="kpi-lbl">Monatl. Ausgaben</div><div class="kpi-val hl-r">${fmt(mExp)}</div><div class="kpi-sub">Aktive Regeln (monatlich)</div></div>
  </div>` : ''}
  <div class="card" style="padding:0">
    ${S.recurring.length ? S.recurring.map(r => { const cat = getCat(r.category); const ivl = IVLS.find(x => x.v === r.interval) || { l: r.interval }; const isInc = r.type === 'income'; return `<div class="tx-row" style="padding:12px 16px;border-left:3px solid ${isInc ? 'var(--income)' : 'var(--expense)'}">
      <div class="tx-ico" style="background:${cat.color}22">${cat.icon}</div>
      <div class="tx-inf">
        <div class="tx-desc">${esc(r.name)}
          <span class="badge" style="background:${isInc ? '#4caf7222' : '#e0555522'};color:${isInc ? 'var(--income)' : 'var(--expense)'}">${isInc ? 'Einnahme' : 'Ausgabe'}</span>
          ${!r.active ? `<span class="badge" style="background:var(--border);color:var(--muted)">Pause</span>` : ''}
        </div>
        <div class="tx-meta">${ivl.l} · ${r.active ? `Nächstes: ${fmtD(r.nextDate)}` : 'Pausiert'} · ${cat.name}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="tx-amt ${isInc ? 'pos' : 'neg'}">${isInc ? '+' : '−'}${fmt(r.amount)}</span>
        <div class="tx-acts" style="display:flex">
          <button class="btn btn-g btn-sm" data-action="toggleRec" data-id="${r.id}" title="${r.active ? 'Pausieren' : 'Aktivieren'}">${r.active ? '⏸' : '▶'}</button>
          <button class="btn btn-g btn-ic btn-sm" data-action="openRecForm" data-id="${r.id}">✏</button>
          <button class="btn btn-d btn-ic btn-sm" data-action="delRec" data-id="${r.id}">🗑</button>
        </div>
      </div>
    </div>`; }).join('') : `<div class="empty"><div class="ei">🔄</div>Noch keine Regeln<br><button class="btn btn-a btn-sm" style="margin-top:10px" data-action="openRecForm">Erste Regel</button></div>`}
  </div>`;
}

export function toggleRec(id) {
  const r = S.recurring.find(x => x.id === id);
  if (r) { r.active = !r.active; if (r.active) processRecurring(); }
  save(); render();
}

export function delRec(id) {
  if (!confirm('Regel löschen?')) return;
  S.recurring = S.recurring.filter(r => r.id !== id);
  save(); render();
}

let _curType = 'expense';

export function openRecForm(id = null) {
  const r = id ? S.recurring.find(x => x.id === id) : null;
  _curType = r?.type || 'expense';
  const type = _curType;
  const html = `<div class="fgrid">
    <div class="tgl-row"><button type="button" class="tgl-btn ${type === 'expense' ? 'ae' : ''}" data-action="recTypeExpense">↑ Ausgabe</button><button type="button" class="tgl-btn ${type === 'income' ? 'ai' : ''}" data-action="recTypeIncome">↓ Einnahme</button></div>
    <div class="field"><label>Name</label><input type="text" id="rf-name" value="${esc(r?.name || '')}" placeholder="z.B. Miete, Gehalt"></div>
    <div class="frow">
      <div class="field"><label>Betrag (€)</label><input type="number" id="rf-amt" step="0.01" value="${r?.amount || ''}"></div>
      <div class="field"><label>Intervall</label><select id="rf-iv">${IVLS.map(x => `<option value="${x.v}" ${(r?.interval || 'monthly') === x.v ? 'selected' : ''}>${x.l}</option>`).join('')}</select></div>
    </div>
    <div class="frow">
      <div class="field"><label>Kategorie</label><select id="rf-cat">${allCats().filter(c => c.type === type).map(c => `<option value="${c.id}" ${r?.category === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}</select></div>
      <div class="field"><label>Nächstes Datum</label><input type="date" id="rf-nd" value="${r?.nextDate || today()}"></div>
    </div>
    <div class="field"><label>Konto</label><select id="rf-acc">${getAccs().map(a => `<option value="${a.id}" ${(r?.account || getAccs()[0]?.id || '') === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}</select></div>
    <div style="display:flex;gap:10px;margin-top:4px"><button class="btn btn-g" style="flex:1" data-action="closeModal">Abbrechen</button><button class="btn btn-a" style="flex:1" data-action="saveRec" data-id="${id || ''}">Speichern</button></div>
  </div>`;
  openModal(id ? 'Regel bearbeiten' : 'Neue Regel', html);
}

export function setRecType(type) {
  _curType = type;
  document.querySelector('[data-action="recTypeExpense"]').className = `tgl-btn ${type === 'expense' ? 'ae' : ''}`;
  document.querySelector('[data-action="recTypeIncome"]').className = `tgl-btn ${type === 'income' ? 'ai' : ''}`;
  const s = document.getElementById('rf-cat');
  if (s) s.innerHTML = allCats().filter(c => c.type === type).map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
}

export function saveRec(eid) {
  const name = document.getElementById('rf-name')?.value;
  const amt = parseFloat(document.getElementById('rf-amt')?.value || '0');
  if (!name || !amt) { notify('⚠ Name und Betrag eingeben'); return; }
  const existing = eid ? S.recurring.find(r => r.id === eid) : null;
  const rule = { id: eid || uid(), name, amount: amt, type: _curType, category: document.getElementById('rf-cat')?.value, account: document.getElementById('rf-acc')?.value || 'girokonto', interval: document.getElementById('rf-iv')?.value || 'monthly', nextDate: document.getElementById('rf-nd')?.value || today(), active: existing ? existing.active : true };
  if (eid) { const i = S.recurring.findIndex(r => r.id === eid); if (i >= 0) S.recurring[i] = { ...S.recurring[i], ...rule }; }
  else S.recurring.push(rule);
  processRecurring(); save(); closeModal(); render(); notify('✅ Regel gespeichert');
}
