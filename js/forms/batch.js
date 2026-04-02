'use strict';

import { S, save, allCats } from '../state.js';
import { uid, today } from '../utils.js';
import { openModal, closeModal, notify } from '../modal.js';
import { render } from '../router.js';

let _rows = [];

export function openBatch() {
  _rows = [{ date: today(), amount: '', type: 'expense', category: 'sonstiges_a', description: '', account: 'girokonto' }];
  openModal('Mehrere Buchungen', batchHtml(), true);
}

function batchHtml() {
  return `<div style="overflow-x:auto"><table class="tbl" style="min-width:600px;font-size:12px"><thead><tr><th>Datum</th><th>Typ</th><th>Betrag</th><th>Beschreibung</th><th>Kategorie</th><th></th></tr></thead><tbody>${_rows.map((r, i) => `<tr>
    <td><input type="date" value="${r.date}" data-oninput="batchField" data-idx="${i}" data-field="date" style="font-size:12px;padding:5px 8px"></td>
    <td><select data-onchange="batchType" data-idx="${i}" style="font-size:12px;padding:5px 8px"><option value="expense" ${r.type === 'expense' ? 'selected' : ''}>Ausgabe</option><option value="income" ${r.type === 'income' ? 'selected' : ''}>Einnahme</option></select></td>
    <td><input type="number" step="0.01" value="${r.amount}" data-oninput="batchField" data-idx="${i}" data-field="amount" style="width:90px;font-size:12px;padding:5px 8px" placeholder="0,00"></td>
    <td><input type="text" value="${r.description}" data-oninput="batchField" data-idx="${i}" data-field="description" style="font-size:12px;padding:5px 8px" placeholder="Beschreibung"></td>
    <td><select data-onchange="batchField" data-idx="${i}" data-field="category" style="font-size:12px;padding:5px 8px">${allCats().filter(c => c.type === r.type).map(c => `<option value="${c.id}" ${r.category === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}</select></td>
    <td><button class="btn btn-d btn-ic btn-sm" data-action="batchDelRow" data-idx="${i}">🗑</button></td>
  </tr>`).join('')}</tbody></table></div>
  <div style="display:flex;gap:10px;margin-top:14px;align-items:center">
    <button class="btn btn-g btn-sm" data-action="batchAddRow">+ Zeile</button>
    <span style="flex:1"></span>
    <button class="btn btn-g" data-action="closeModal">Abbrechen</button>
    <button class="btn btn-a" data-action="saveBatch">Alle speichern</button>
  </div>`;
}

function reBatch() {
  document.getElementById('m-body').innerHTML = batchHtml();
}

export function batchAddRow() {
  _rows.push({ date: today(), amount: '', type: 'expense', category: 'sonstiges_a', description: '', account: 'girokonto' });
  reBatch();
}

export function batchDelRow(idx) {
  _rows.splice(idx, 1);
  reBatch();
}

export function batchSetField(idx, field, value) {
  if (_rows[idx]) _rows[idx][field] = value;
}

export function batchSetType(idx, value) {
  if (_rows[idx]) { _rows[idx].type = value; _rows[idx].category = value === 'income' ? 'gehalt' : 'sonstiges_a'; }
  reBatch();
}

export function saveBatch() {
  _rows.forEach(r => {
    if (!r.amount) return;
    S.transactions.push({ id: uid(), date: r.date, amount: parseFloat(String(r.amount).replace(',', '.')), type: r.type, category: r.category, account: r.account || 'girokonto', description: r.description || '', note: '', tags: [], source: 'manual', createdAt: Date.now() });
  });
  save(); closeModal(); render(); notify('✅ Buchungen gespeichert');
}
