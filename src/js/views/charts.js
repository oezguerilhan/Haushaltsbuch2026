'use strict';

import { S, mthTxs, allCats, getCat } from '../state.js';
import { fmt, fmtD, esc, _pad2 } from '../utils.js';
import { MONTHS_S, MONTHS_L } from '../constants.js';
import { svgGrouped, svgBars, svgLine, legend } from '../charts.js';
import { mthNav } from '../router.js';

export let _ctab = 'year';
export let _cyr = new Date().getFullYear();

export function setChartTab(tab) { _ctab = tab; }
export function setChartYear(yr) { _cyr = yr; }

function _yrData(yr) {
  return MONTHS_S.map((name, mi) => {
    const ym = `${yr}-${String(mi + 1).padStart(2, '0')}`;
    const txs = S.transactions.filter(t => t.date.startsWith(ym));
    return { label: name, Einnahmen: txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), Ausgaben: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) };
  });
}

export function vCharts(month) {
  const tabs = [['year', 'Jahresüberblick'], ['month', 'Monatlich'], ['trend', 'Trends'], ['savings', 'Sparquote'], ['compare', 'Jahresvergleich'], ['topexp', 'Top-Ausgaben']];
  let content = '';

  if (_ctab === 'year') {
    const data = _yrData(_cyr);
    const tI = data.reduce((s, d) => s + d.Einnahmen, 0), tE = data.reduce((s, d) => s + d.Ausgaben, 0), tB = tI - tE;
    content = `<div class="card" style="margin-bottom:16px"><div class="sec-ttl">Einnahmen vs. Ausgaben ${_cyr}</div>${svgGrouped(data, { keys: ['Einnahmen', 'Ausgaben'], colors: ['#4caf72', '#e05555'], lkey: 'label' })}${legend([{ color: '#4caf72', label: 'Einnahmen' }, { color: '#e05555', label: 'Ausgaben' }])}</div>
    <div class="card" style="padding:0"><table class="tbl"><thead><tr><th>Monat</th><th style="text-align:right;color:var(--income)">Einnahmen</th><th style="text-align:right;color:var(--expense)">Ausgaben</th><th style="text-align:right">Saldo</th></tr></thead>
    <tbody>${data.map((d, i) => { const bal = d.Einnahmen - d.Ausgaben; const hd = d.Einnahmen > 0 || d.Ausgaben > 0; return `<tr><td>${MONTHS_L[i]}</td><td style="text-align:right;color:var(--income)">${hd && d.Einnahmen ? fmt(d.Einnahmen) : '—'}</td><td style="text-align:right;color:var(--expense)">${hd && d.Ausgaben ? fmt(d.Ausgaben) : '—'}</td><td style="text-align:right;color:${bal >= 0 ? 'var(--income)' : 'var(--expense)'};font-weight:600">${hd ? fmt(bal) : '—'}</td></tr>`; }).join('')}</tbody>
    <tfoot><tr class="tbl-foot"><td>Gesamt ${_cyr}</td><td style="text-align:right;color:var(--income)">${fmt(tI)}</td><td style="text-align:right;color:var(--expense)">${fmt(tE)}</td><td style="text-align:right;color:${tB >= 0 ? 'var(--income)' : 'var(--expense)'}">${fmt(tB)}</td></tr></tfoot></table></div>`;
  }

  if (_ctab === 'month') {
    const [y, m] = month.split('-').map(Number); const txs = mthTxs(month); const catMap = {};
    txs.filter(t => t.type === 'expense').forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
    const cd = Object.entries(catMap).map(([id, v]) => ({ id, v, c: getCat(id), value: v, label: getCat(id).name })).sort((a, b) => b.v - a.v); const total = cd.reduce((s, d) => s + d.v, 0);
    content = `<div class="card"><div class="sec-ttl">Ausgaben nach Kategorie — ${MONTHS_L[m - 1]} ${y}</div>${cd.length ? `${svgBars(cd, { singleColor: 'var(--accent)' })}
      <div style="margin-top:16px">${cd.map(d => `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>${d.c.icon} ${d.c.name}</span><span style="color:var(--muted)">${fmt(d.v)} (${total ? ((d.v / total) * 100).toFixed(0) : 0}%)</span></div><div class="prog"><div class="prog-f" style="width:${total ? (d.v / total * 100).toFixed(1) : 0}%;background:${d.c.color}"></div></div></div>`).join('')}</div>` : `<div class="empty">Keine Ausgaben</div>`}</div>`;
  }

  if (_ctab === 'trend') {
    const mos = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - (5 - i)); return { ym: `${d.getFullYear()}-${_pad2(d.getMonth() + 1)}`, label: MONTHS_S[d.getMonth()] }; });
    const topC = allCats().filter(c => c.type === 'expense').slice(0, 4);
    const data = mos.map(mo => ({ label: mo.label, ...Object.fromEntries(topC.map(c => [c.name, S.transactions.filter(t => t.date.startsWith(mo.ym) && t.category === c.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0)])) }));
    content = `<div class="card"><div class="sec-ttl">Ausgaben-Trends (letzte 6 Monate)</div>${svgLine(data, { keys: topC.map(c => c.name), colors: topC.map(c => c.color), lkey: 'label' })}${legend(topC.map(c => ({ color: c.color, label: c.name })))}</div>`;
  }

  if (_ctab === 'savings') {
    const mos = Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - (11 - i)); return { ym: `${d.getFullYear()}-${_pad2(d.getMonth() + 1)}`, label: MONTHS_S[d.getMonth()] }; });
    const data = mos.map(mo => { const txs = S.transactions.filter(t => t.date.startsWith(mo.ym)); const inc = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0); const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0); return { label: mo.label, Sparquote: inc > 0 ? Math.max(0, ((inc - exp) / inc) * 100) : 0 }; });
    content = `<div class="card"><div class="sec-ttl">Sparquoten-Verlauf (12 Monate)</div>${svgLine(data, { keys: ['Sparquote'], colors: ['#e8a020'], lkey: 'label' })}${legend([{ color: '#e8a020', label: 'Sparquote (%)' }])}
      <div style="margin-top:16px"><table class="tbl"><thead><tr><th>Monat</th><th style="text-align:right">Sparquote</th></tr></thead><tbody>${data.map(d => `<tr><td>${d.label}</td><td style="text-align:right;color:${d.Sparquote >= 20 ? 'var(--income)' : d.Sparquote >= 10 ? '#f59e0b' : 'var(--expense)'};font-weight:600">${d.Sparquote.toFixed(1)} %</td></tr>`).join('')}</tbody></table></div></div>`;
  }

  if (_ctab === 'compare') {
    const cur = _yrData(_cyr), prev = _yrData(_cyr - 1);
    const data = MONTHS_S.map((name, i) => ({ label: name, [`${_cyr}`]: cur[i].Ausgaben, [`${_cyr - 1}`]: prev[i].Ausgaben }));
    const tCur = cur.reduce((s, d) => s + d.Ausgaben, 0), tPrev = prev.reduce((s, d) => s + d.Ausgaben, 0);
    const diff = tCur - tPrev, pct = tPrev > 0 ? ((diff / tPrev) * 100).toFixed(1) : '-';
    content = `<div class="card" style="margin-bottom:16px"><div class="sec-ttl">Ausgaben-Vergleich: ${_cyr} vs. ${_cyr - 1}</div>${svgGrouped(data, { keys: [`${_cyr}`, `${_cyr - 1}`], colors: ['#e8a020', '#6b7280'], lkey: 'label' })}${legend([{ color: '#e8a020', label: `${_cyr}` }, { color: '#6b7280', label: `${_cyr - 1}` }])}
      <div style="margin-top:16px;display:flex;gap:16px;flex-wrap:wrap">
        <div class="kpi" style="flex:1;min-width:150px"><div class="kpi-lbl">${_cyr}</div><div class="kpi-val hl-a">${fmt(tCur)}</div></div>
        <div class="kpi" style="flex:1;min-width:150px"><div class="kpi-lbl">${_cyr - 1}</div><div class="kpi-val" style="color:var(--muted)">${fmt(tPrev)}</div></div>
        <div class="kpi" style="flex:1;min-width:150px"><div class="kpi-lbl">Differenz</div><div class="kpi-val" style="color:${diff <= 0 ? 'var(--income)' : 'var(--expense)'}">${diff > 0 ? '+' : ''}${fmt(diff)} (${diff > 0 ? '+' : ''}${pct}%)</div></div>
      </div></div>`;
  }

  if (_ctab === 'topexp') {
    const txs = S.transactions.filter(t => t.date.startsWith(String(_cyr)) && t.type === 'expense').sort((a, b) => b.amount - a.amount).slice(0, 20);
    content = `<div class="card"><div class="sec-ttl">Top 20 Ausgaben ${_cyr}</div>
      ${txs.length ? `<table class="tbl"><thead><tr><th>#</th><th>Datum</th><th>Beschreibung</th><th>Kategorie</th><th style="text-align:right">Betrag</th></tr></thead>
      <tbody>${txs.map((t, i) => { const cat = getCat(t.category); return `<tr><td style="color:var(--muted)">${i + 1}</td><td>${fmtD(t.date)}</td><td>${esc(t.description) || esc(cat.name)}</td><td>${cat.icon} ${esc(cat.name)}</td><td style="text-align:right;color:var(--expense);font-weight:600">${fmt(t.amount)}</td></tr>`; }).join('')}</tbody>
      <tfoot><tr class="tbl-foot"><td colspan="4">Summe Top 20</td><td style="text-align:right">${fmt(txs.reduce((s, t) => s + t.amount, 0))}</td></tr></tfoot></table>` : `<div class="empty">Keine Ausgaben</div>`}</div>`;
  }

  return `<div class="view-head"><div><h2>Auswertungen</h2><p>Finanzübersicht</p></div>
    <div class="head-actions">
      ${_ctab === 'year' || _ctab === 'compare' || _ctab === 'topexp' ? `<div class="mth-nav"><button data-action="chartYearPrev">‹</button><span style="min-width:50px">${_cyr}</span><button data-action="chartYearNext">›</button></div>` : _ctab === 'month' ? mthNav() : ''}
      <button class="btn btn-g btn-sm" data-action="printPage" title="Drucken">🖨 Drucken</button>
      <div style="display:flex;gap:3px;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:3px;overflow-x:auto">
        ${tabs.map(([v, l]) => `<button data-action="setChartTab" data-tab="${v}" class="btn btn-sm" style="${_ctab === v ? 'background:var(--accent);color:#0f0d0b' : 'background:none;color:var(--muted);font-weight:400'}">${l}</button>`).join('')}
      </div>
    </div>
  </div><div id="ch-c">${content}</div>`;
}
