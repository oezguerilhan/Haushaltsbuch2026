'use strict';

import { S, mthTxs, getCat } from '../state.js';
import { fmt } from '../utils.js';
import { svgDonut } from '../charts.js';
import { mthNav } from '../router.js';
import { txRow } from './transactions.js';

export function vDash(month) {
  const txs = mthTxs(month);
  const inc = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const bal = inc - exp, rate = inc > 0 ? ((inc - exp) / inc * 100) : 0;
  const catMap = {}; txs.filter(t => t.type === 'expense').forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const catData = Object.entries(catMap).map(([id, v]) => ({ id, v, c: getCat(id) })).sort((a, b) => b.v - a.v);
  const recent = [...txs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  return `
  <div class="view-head"><div><h2>Dashboard</h2><p>Monatsübersicht</p></div><div class="head-actions">${mthNav()}</div></div>
  <div class="grid4">
    <div class="kpi"><div class="kpi-lbl">Einnahmen</div><div class="kpi-val hl-g">${fmt(inc)}</div><div class="kpi-sub">${txs.filter(t => t.type === 'income').length} Buchungen</div></div>
    <div class="kpi"><div class="kpi-lbl">Ausgaben</div><div class="kpi-val hl-r">${fmt(exp)}</div><div class="kpi-sub">${txs.filter(t => t.type === 'expense').length} Buchungen</div></div>
    <div class="kpi"><div class="kpi-lbl">Saldo</div><div class="kpi-val" style="color:${bal >= 0 ? 'var(--income)' : 'var(--expense)'}">${fmt(bal)}</div><div class="kpi-sub">Einnahmen − Ausgaben</div></div>
    <div class="kpi"><div class="kpi-lbl">Sparquote</div><div class="kpi-val hl-a">${rate.toFixed(1)} %</div><div class="kpi-sub">des Einkommens</div></div>
  </div>
  <div class="grid2">
    <div class="card"><div class="sec-ttl">Ausgaben nach Kategorie</div>
      ${catData.length ? `<div style="display:flex;gap:16px;align-items:center">
        <div style="flex-shrink:0">${svgDonut(catData.slice(0, 7).map(d => ({ value: d.v, color: d.c.color })))}</div>
        <div style="flex:1;min-width:0">${catData.slice(0, 7).map(d => `<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:7px"><div style="display:flex;align-items:center;gap:6px;min-width:0"><span class="cdot" style="background:${d.c.color}"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.c.icon} ${d.c.name}</span></div><span style="color:var(--muted);flex-shrink:0;margin-left:8px">${fmt(d.v)}</span></div>`).join('')}</div>
      </div>` : `<div class="empty">Keine Ausgaben</div>`}
    </div>
    <div class="card"><div class="sec-ttl">Budget-Status</div>
      ${S.budgets.length ? S.budgets.map(b => { const cat = getCat(b.cat); const spent = txs.filter(t => t.category === b.cat && t.type === 'expense').reduce((s, t) => s + t.amount, 0); const pct = Math.min(spent / b.limit * 100, 100); const col = pct > 90 ? 'var(--expense)' : pct > 70 ? '#f59e0b' : 'var(--income)'; return `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>${cat.icon} ${cat.name}</span><span style="color:var(--muted)">${fmt(spent)} / ${fmt(b.limit)}</span></div><div class="prog"><div class="prog-f" style="width:${pct.toFixed(1)}%;background:${col}"></div></div></div>`; }).join('') : `<div class="empty">Budgets in Einstellungen festlegen</div>`}
    </div>
  </div>
  <div class="card"><div class="sec-ttl">Letzte Buchungen</div>
    ${recent.length ? recent.map(t => txRow(t, false)).join('') : `<div class="empty"><div class="ei">📋</div>Noch keine Buchungen<br><button class="btn btn-a btn-sm" style="margin-top:10px" data-action="openTxForm">Erste Buchung</button></div>`}
  </div>`;
}
