'use strict';

import { S, save, allCats, getAccs } from '../state.js';
import { CURRENCIES } from '../constants.js';
import { fmt, esc, uid, today } from '../utils.js';
import { openModal, closeModal, notify } from '../modal.js';
import { render } from '../router.js';

let _curType = 'expense';

export function openTxForm(tx = null) {
  _curType = tx?.type || 'expense';
  const type = _curType;
  const cats = allCats().filter(c => c.type === type);
  const html = `<div class="fgrid">
    <div class="tgl-row">
      <button type="button" class="tgl-btn ${type === 'expense' ? 'ae' : ''}" data-action="txTypeExpense">↑ Ausgabe</button>
      <button type="button" class="tgl-btn ${type === 'income' ? 'ai' : ''}" data-action="txTypeIncome">↓ Einnahme</button>
    </div>
    <div class="frow">
      <div class="field"><label>Betrag</label><input type="number" id="tf-amt" step="0.01" min="0" value="${tx?.amount || ''}" placeholder="0,00" autofocus></div>
      <div class="field"><label>Datum</label><input type="date" id="tf-dt" value="${tx?.date || today()}"></div>
    </div>
    <div class="frow">
      <div class="field"><label>Währung</label>
        <select id="tf-cur" data-onchange="txCurrencyChange">${CURRENCIES.map(c => `<option value="${c.code}" ${(tx?.currency || 'EUR') === c.code ? 'selected' : ''}>${c.symbol} ${c.name}</option>`).join('')}</select>
      </div>
      <div class="field" id="tf-fx-row" style="display:${(tx?.currency && tx.currency !== 'EUR') ? 'grid' : 'none'}"><label>Wechselkurs → EUR</label><input type="number" id="tf-fx" step="0.0001" min="0" value="${tx?.fxRate || ''}" placeholder="z.B. 0.92"></div>
    </div>
    <div class="field"><label>Kategorie</label>
      <select id="tf-cat">${cats.map(c => `<option value="${c.id}" ${(tx?.category || 'sonstiges_a') === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}</select>
    </div>
    <div class="field"><label>Beschreibung</label><input type="text" id="tf-desc" value="${esc(tx?.description || '')}" placeholder="Wo / Was?"></div>
    <div class="frow">
      <div class="field"><label>Konto</label>
        <select id="tf-acc">${getAccs().map(a => `<option value="${a.id}" ${(tx?.account || getAccs()[0]?.id || '') === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Tags (Komma)</label><input type="text" id="tf-tags" value="${esc(tx?.tags?.join(', ') || '')}" placeholder="urlaub, auto"></div>
    </div>
    <div class="field"><label>Notiz</label><input type="text" id="tf-note" value="${esc(tx?.note || '')}" placeholder="Optional"></div>
    <div style="display:flex;gap:10px;margin-top:4px">
      <button class="btn btn-g" style="flex:1" data-action="closeModal">Abbrechen</button>
      <button class="btn btn-a" style="flex:1" data-action="saveTx" data-id="${tx?.id || ''}">${tx ? 'Speichern' : 'Hinzufügen'}</button>
    </div>
  </div>`;
  openModal(tx ? 'Buchung bearbeiten' : 'Neue Buchung', html);
}

export function setTxType(type) {
  _curType = type;
  document.querySelector('[data-action="txTypeExpense"]').className = `tgl-btn ${type === 'expense' ? 'ae' : ''}`;
  document.querySelector('[data-action="txTypeIncome"]').className = `tgl-btn ${type === 'income' ? 'ai' : ''}`;
  const s = document.getElementById('tf-cat');
  if (s) { s.innerHTML = allCats().filter(c => c.type === type).map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join(''); s.value = type === 'income' ? 'gehalt' : 'sonstiges_a'; }
}

export function txCurrencyChange() {
  const cur = document.getElementById('tf-cur')?.value;
  document.getElementById('tf-fx-row').style.display = cur === 'EUR' ? 'none' : 'grid';
}

export function saveTx(editId) {
  const amt = parseFloat(document.getElementById('tf-amt')?.value || '0');
  const dt = document.getElementById('tf-dt')?.value;
  if (!amt || !dt) { notify('⚠ Betrag und Datum eingeben'); return; }
  const tags = (document.getElementById('tf-tags')?.value || '').split(',').map(t => t.trim()).filter(Boolean);
  const origTx = editId ? S.transactions.find(t => t.id === editId) : null;
  const cur = document.getElementById('tf-cur')?.value || 'EUR';
  const fxRaw = parseFloat(document.getElementById('tf-fx')?.value || '0');
  const fxRate = cur !== 'EUR' && fxRaw > 0 ? fxRaw : null;
  const amtEur = fxRate ? amt * fxRate : amt;
  const tx = { id: editId || uid(), date: dt, amount: amtEur, type: _curType, category: document.getElementById('tf-cat')?.value, account: document.getElementById('tf-acc')?.value || 'girokonto', description: document.getElementById('tf-desc')?.value || '', note: document.getElementById('tf-note')?.value || '', tags, source: 'manual', createdAt: origTx?.createdAt || Date.now(), currency: cur, originalAmount: cur !== 'EUR' ? amt : null, fxRate };
  if (editId) { const idx = S.transactions.findIndex(t => t.id === editId); if (idx >= 0) S.transactions[idx] = { ...S.transactions[idx], ...tx }; }
  else S.transactions.push(tx);
  save(); closeModal(); render(); notify(editId ? '✅ Gespeichert' : '✅ Buchung hinzugefügt');
}

export function editTx(id) {
  const tx = S.transactions.find(t => t.id === id);
  if (tx) openTxForm(tx);
}
