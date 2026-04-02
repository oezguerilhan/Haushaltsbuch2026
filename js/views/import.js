'use strict';

import { S, save, getCat } from '../state.js';
import { fmt, fmtD, esc, uid, today, parseDeDate, guessCategory } from '../utils.js';
import { notify } from '../modal.js';

let _step = 1, _rows = [], _hdr = [], _map = { date: '-1', amount: '-1', desc: '-1' };

export function vImport() {
  _step = _step || 1;
  return `<div class="view-head"><div><h2>CSV-Import</h2><p>Bank-Export · Duplikate erkannt</p></div></div>
  <div class="steps">${['Upload', 'Spalten', 'Vorschau', 'Fertig'].map((s, i) => `${i > 0 ? `<div class="stp-line ${_step > i ? 'done' : ''}"></div>` : ''}<div class="stp ${_step === i + 1 ? 'act' : _step > i + 1 ? 'done' : ''}"><div class="stp-n">${_step > i + 1 ? '✓' : i + 1}</div>${s}</div>`).join('')}</div>
  <div class="card" id="csv-p">${csvPanel()}</div>`;
}

function csvPanel() {
  if (_step === 1) return `<div class="empty" style="padding:48px"><div class="ei">📂</div><div><b>CSV-Datei hochladen</b><div style="font-size:12px;color:var(--muted);margin-top:4px">Semikolon oder Komma · UTF-8 · negative Beträge = Ausgaben</div></div><label class="btn btn-a" style="cursor:pointer;margin-top:8px">Datei wählen<input type="file" accept=".csv,.txt" style="display:none" data-onchange="csvLoad"></label></div>`;
  if (_step === 2) return `<p style="color:var(--muted);font-size:12px;margin-bottom:14px">${_rows.length} Zeilen gefunden. Spalten zuordnen:</p>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px">
      ${[['date', 'Datum'], ['amount', 'Betrag'], ['desc', 'Beschreibung']].map(([k, l]) => `<div class="field"><label>${l}</label><select data-onchange="csvMapCol" data-col="${k}"><option value="-1">— nicht zuordnen —</option>${_hdr.map((h, i) => `<option value="${i}" ${_map[k] == i ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select></div>`).join('')}
    </div>
    <div style="overflow-x:auto;background:var(--bg);border-radius:8px;margin-bottom:14px"><table class="tbl" style="font-size:11px"><thead><tr>${_hdr.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${_rows.slice(0, 3).map(r => `<tr>${r.map(c => `<td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <div style="display:flex;gap:10px"><button class="btn btn-g" data-action="csvBack">Zurück</button><button class="btn btn-a" data-action="csvPrev">Vorschau</button></div>`;
  if (_step === 3) { const prev = _rows.slice(0, 5).map(csvParseRow); return `<p style="color:var(--muted);font-size:12px;margin-bottom:12px">Vorschau — Kategorien automatisch erkannt:</p>
    ${prev.map(t => { const cat = getCat(t.category); return `<div class="tx-row" style="background:var(--bg);border-radius:8px;margin-bottom:6px;padding:10px 14px"><div class="tx-ico" style="background:${cat.color}22">${cat.icon}</div><div class="tx-inf"><div class="tx-desc">${esc((t.description || '').slice(0, 50))}</div><div class="tx-meta">${fmtD(t.date)} · ${esc(cat.name)}</div></div><div class="tx-amt ${t.type === 'expense' ? 'neg' : 'pos'}">${t.type === 'expense' ? '−' : '+'}${fmt(t.amount)}</div></div>`; }).join('')}
    <p style="color:var(--muted);font-size:12px;margin:10px 0 14px">… und ${Math.max(0, _rows.length - 5)} weitere.</p>
    <div style="display:flex;gap:10px"><button class="btn btn-g" data-action="csvBackToMap">Zurück</button><button class="btn btn-a" data-action="csvImport">${_rows.length} Buchungen importieren</button></div>`; }
  return `<div class="empty" style="padding:40px"><div style="width:52px;height:52px;border-radius:50%;background:#4caf7222;color:var(--income);display:flex;align-items:center;justify-content:center;font-size:24px">✓</div><div><div style="font-size:16px;font-weight:700;font-family:Georgia,serif">${_csvCnt || 0} Buchungen importiert</div><div style="font-size:12px;color:var(--muted);margin-top:4px">Duplikate wurden übersprungen</div></div><button class="btn btn-a" data-action="csvRestart">Weiteren Import</button></div>`;
}

let _csvCnt = 0;

function reImport() {
  const p = document.getElementById('csv-p');
  if (p) p.innerHTML = csvPanel();
}

function csvParseRow(r) {
  const di = parseInt(_map.date), ai = parseInt(_map.amount), xi = parseInt(_map.desc);
  const raw = ai >= 0 ? r[ai] || '0' : '0';
  const num = parseFloat(raw.replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.'));
  const amt = isNaN(num) ? 0 : Math.abs(num);
  const type = num < 0 ? 'expense' : 'income';
  const desc = xi >= 0 ? r[xi] || '' : '';
  return { id: uid(), date: parseDeDate(di >= 0 ? r[di] || today() : today()), amount: amt, type, description: desc, category: guessCategory(desc) || (type === 'income' ? 'sonstiges_e' : 'sonstiges_a'), account: 'girokonto', tags: [], source: 'import', createdAt: Date.now(), note: '' };
}

export function csvLoad(inp) {
  const f = inp.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const txt = ev.target.result;
    const lines = txt.trim().split('\n');
    const delim = lines[0].includes(';') ? ';' : ',';
    const parsed = lines.map(line => { const cols = []; let cur = '', inQ = false; for (const ch of line) { if (ch === '"') { inQ = !inQ; } else if (ch === delim && !inQ) { cols.push(cur.trim()); cur = ''; } else { cur += ch; } } cols.push(cur.trim()); return cols; });
    if (parsed.length < 2) { notify('⚠ Keine Daten'); return; }
    _hdr = parsed[0]; _rows = parsed.slice(1);
    const hl = _hdr.map(x => x.toLowerCase());
    _map = { date: String(hl.findIndex(x => /datum|date|buchung|valuta/i.test(x))), amount: String(hl.findIndex(x => /betrag|amount|summe|wert|umsatz/i.test(x))), desc: String(hl.findIndex(x => /verwendung|beschreibung|desc|memo|text|name|auftraggeber/i.test(x))) };
    _step = 2; reImport();
  };
  reader.readAsText(f, 'UTF-8');
}

export function csvMapCol(col, value) { _map[col] = value; }
export function csvGoBack() { _step = 1; reImport(); }
export function csvGoBackToMap() { _step = 2; reImport(); }
export function csvPreview() { _step = 3; reImport(); }
export function csvRestart() { _step = 1; reImport(); }

export function csvImport() {
  const all = _rows.map(csvParseRow).filter(t => t.amount > 0);
  const keys = new Set(S.transactions.map(t => `${t.date}|${t.amount}|${t.description}`));
  const news = all.filter(t => !keys.has(`${t.date}|${t.amount}|${t.description}`));
  S.transactions.push(...news);
  _csvCnt = news.length;
  save(); _step = 4; reImport();
  notify(`✅ ${news.length} Buchungen importiert`);
}
