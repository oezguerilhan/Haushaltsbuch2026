'use strict';

import { S, save, allCats, getAccs } from '../state.js';
import { fmt, uid, today } from '../utils.js';
import { openModal, closeModal, notify } from '../modal.js';
import { render } from '../router.js';

let _splits = [];

export function openSplitForm() {
  _splits = [{ category: 'sonstiges_a', amount: '' }];
  openModal('Split-Buchung', splitHtml());
}

function splitHtml() {
  return `<div class="fgrid">
    <div class="frow">
      <div class="field"><label>Gesamtbetrag (€)</label><input type="number" id="sp-total" step="0.01" min="0" placeholder="0,00"></div>
      <div class="field"><label>Datum</label><input type="date" id="sp-dt" value="${today()}"></div>
    </div>
    <div class="field"><label>Beschreibung</label><input type="text" id="sp-desc" placeholder="z.B. Supermarkt Einkauf"></div>
    <div class="field"><label>Konto</label><select id="sp-acc">${getAccs().map(a => `<option value="${a.id}">${a.name}</option>`).join('')}</select></div>
    <div style="font-weight:600;font-size:12px;color:var(--muted);margin-top:6px">AUFTEILUNG</div>
    <div id="sp-rows">${_splits.map((r, i) => `<div class="split-row">
      <select data-onchange="splitCat" data-idx="${i}" style="flex:2">${allCats().filter(c => c.type === 'expense').map(c => `<option value="${c.id}" ${r.category === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}</select>
      <input type="number" step="0.01" value="${r.amount}" data-oninput="splitAmt" data-idx="${i}" style="flex:1" placeholder="Betrag">
      ${_splits.length > 1 ? `<button class="btn btn-d btn-ic btn-sm" data-action="splitDelRow" data-idx="${i}">🗑</button>` : ''}
    </div>`).join('')}</div>
    <div style="display:flex;gap:10px;align-items:center">
      <button class="btn btn-g btn-sm" data-action="splitAddRow">+ Kategorie</button>
      <span style="flex:1;font-size:11px;color:var(--muted)" id="sp-rest"></span>
    </div>
    <div style="display:flex;gap:10px;margin-top:4px">
      <button class="btn btn-g" style="flex:1" data-action="closeModal">Abbrechen</button>
      <button class="btn btn-a" style="flex:1" data-action="saveSplit">Split speichern</button>
    </div>
  </div>`;
}

function reSplit() {
  document.getElementById('m-body').innerHTML = splitHtml();
}

export function splitAddRow() {
  _splits.push({ category: 'sonstiges_a', amount: '' });
  reSplit();
}

export function splitDelRow(idx) {
  _splits.splice(idx, 1);
  reSplit();
}

export function splitSetCat(idx, value) {
  if (_splits[idx]) _splits[idx].category = value;
}

export function splitSetAmt(idx, value) {
  if (_splits[idx]) _splits[idx].amount = value;
}

export function saveSplit() {
  const total = parseFloat(document.getElementById('sp-total')?.value || '0');
  const dt = document.getElementById('sp-dt')?.value;
  const desc = document.getElementById('sp-desc')?.value || '';
  const acc = document.getElementById('sp-acc')?.value || 'girokonto';
  if (!total || !dt) { notify('⚠ Betrag und Datum eingeben'); return; }
  const splitSum = _splits.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  if (Math.abs(total - splitSum) > 0.01) { notify(`⚠ Split-Summe (${fmt(splitSum)}) ≠ Gesamtbetrag (${fmt(total)})`); return; }
  const groupId = 'split_' + uid();
  _splits.forEach(r => {
    if (!r.amount) return;
    S.transactions.push({ id: uid(), date: dt, amount: parseFloat(r.amount), type: 'expense', category: r.category, account: acc, description: desc, note: 'Split-Buchung', tags: [], source: 'manual', createdAt: Date.now(), splitGroupId: groupId });
  });
  save(); closeModal(); render(); notify(`✅ ${_splits.length} Split-Buchungen erstellt`);
}
