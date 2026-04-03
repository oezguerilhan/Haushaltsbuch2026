'use strict';

import { S, mthTxs, getCat, getAcc, allCats, save } from '../state.js';
import { fmt, fmtD, fmtCur, esc } from '../utils.js';
import { getAllTags } from '../state.js';
import { MONTHS_L } from '../constants.js';
import { mthNav, render } from '../router.js';
import { notify } from '../modal.js';

export function txRow(t, showAct = true) {
  const cat = getCat(t.category), acc = getAcc(t.account);
  const src = t.source === 'auto' ? `<span style="color:#a78bfa;font-size:10px"> 🔄</span>` : t.source === 'import' ? `<span style="color:#60a5fa;font-size:10px"> 📥</span>` : '';
  const tagHtml = (t.tags && t.tags.length) ? t.tags.map(tg => `<span class="tag-pill">${esc(tg)}</span>`).join('') : '';
  const curInfo = t.currency && t.currency !== 'EUR' && t.originalAmount ? `<span class="cur-badge">${fmtCur(t.originalAmount, t.currency)}</span>` : '';
  return `<div class="tx-row">
    <div class="tx-ico" style="background:${cat.color}22">${cat.icon}</div>
    <div class="tx-inf"><div class="tx-desc">${esc(t.description) || esc(cat.name)} ${tagHtml}</div><div class="tx-meta">${fmtD(t.date)} · ${esc(cat.name)} · ${esc(acc.name)}${src}${curInfo}</div></div>
    <div class="tx-amt ${t.type === 'expense' ? 'neg' : 'pos'}">${t.type === 'expense' ? '−' : '+'}${fmt(t.amount)}</div>
    ${showAct ? `<div class="tx-acts"><button class="btn btn-g btn-ic btn-sm" data-action="editTx" data-id="${t.id}">✏</button><button class="btn btn-d btn-ic btn-sm" data-action="delTx" data-id="${t.id}">🗑</button></div>` : ''}
  </div>`;
}

export function buildTxList(txs) {
  if (!txs.length) return '<div class="empty"><div class="ei">📋</div>Keine Buchungen</div>';
  return [...txs].sort((a, b) => b.date.localeCompare(a.date)).map(t => txRow(t)).join('');
}

export function vTx(month) {
  const [y, m] = month.split('-').map(Number);
  return `<div class="view-head"><div><h2>Transaktionen</h2><p>${MONTHS_L[m - 1]} ${y}</p></div>
    <div class="head-actions">${mthNav()}<button class="btn btn-g" data-action="openSplitForm">Split</button><button class="btn btn-g" data-action="openBatch">Batch</button><button class="btn btn-a" data-action="openTxForm">+ Neu</button></div>
  </div>
  <div class="filter-bar">
    <input type="search" id="tx-s" placeholder="Suchen…" style="max-width:180px" data-oninput="filterTx">
    <select id="tx-t" data-onchange="filterTx"><option value="">Alle Typen</option><option value="expense">Ausgaben</option><option value="income">Einnahmen</option></select>
    <select id="tx-c" data-onchange="filterTx"><option value="">Alle Kategorien</option>${allCats().map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}</select>
    <select id="tx-tag" data-onchange="filterTx"><option value="">Alle Tags</option>${getAllTags().map(t => `<option value="${t}">${esc(t)}</option>`).join('')}</select>
    <input type="number" id="tx-min" placeholder="Min €" style="width:80px" data-oninput="filterTx">
    <input type="number" id="tx-max" placeholder="Max €" style="width:80px" data-oninput="filterTx">
  </div>
  <div class="card" style="padding:0" id="tx-list">${buildTxList(mthTxs(month))}</div>`;
}

export function filterTx(month) {
  const q = (document.getElementById('tx-s')?.value || '').toLowerCase();
  const ft = document.getElementById('tx-t')?.value;
  const fc = document.getElementById('tx-c')?.value;
  const ftag = document.getElementById('tx-tag')?.value;
  const fmin = parseFloat(document.getElementById('tx-min')?.value || '');
  const fmax = parseFloat(document.getElementById('tx-max')?.value || '');
  let txs = mthTxs(month);
  if (ft) txs = txs.filter(t => t.type === ft);
  if (fc) txs = txs.filter(t => t.category === fc);
  if (ftag) txs = txs.filter(t => (t.tags || []).includes(ftag));
  if (!isNaN(fmin)) txs = txs.filter(t => t.amount >= fmin);
  if (!isNaN(fmax)) txs = txs.filter(t => t.amount <= fmax);
  if (q) txs = txs.filter(t => (t.description || '').toLowerCase().includes(q) || (t.note || '').toLowerCase().includes(q) || (t.tags || []).some(tg => tg.toLowerCase().includes(q)));
  const el = document.getElementById('tx-list');
  if (el) el.innerHTML = buildTxList(txs);
}

export function delTx(id) {
  if (!confirm('Buchung löschen?')) return;
  S.transactions = S.transactions.filter(t => t.id !== id);
  save(); render(); notify('🗑 Gelöscht');
}
