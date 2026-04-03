'use strict';

import { S, save, getCat } from '../state.js';
import { fmt, fmtD, esc, uid, today, parseDeDate, guessCategory } from '../utils.js';
import { notify } from '../modal.js';
import { parsePdfFile } from '../pdfParser.js';

let _step = 1, _rows = [], _hdr = [], _map = { date: '-1', amount: '-1', desc: '-1' };
let _pdfTxs = []; // parsed PDF transactions

export function vImport() {
  _step = _step || 1;
  return `<div class="view-head"><div><h2>Import</h2><p>CSV oder PDF · Bank-Export · Duplikate erkannt</p></div></div>
  <div class="steps">${['Upload', 'Spalten', 'Vorschau', 'Fertig'].map((s, i) => `${i > 0 ? `<div class="stp-line ${_step > i ? 'done' : ''}"></div>` : ''}<div class="stp ${_step === i + 1 ? 'act' : _step > i + 1 ? 'done' : ''}"><div class="stp-n">${_step > i + 1 ? '✓' : i + 1}</div>${s}</div>`).join('')}</div>
  <div class="card" id="csv-p">${csvPanel()}</div>`;
}

function csvPanel() {
  if (_step === 1) return `<div class="empty" style="padding:48px"><div class="ei">📂</div><div><b>Datei hochladen</b><div style="font-size:12px;color:var(--muted);margin-top:4px">CSV (Semikolon/Komma) oder PDF-Kontoauszug · UTF-8 · negative Beträge = Ausgaben</div></div>
    <div style="display:flex;gap:10px;margin-top:12px">
      <label class="btn btn-a" style="cursor:pointer">📊 CSV-Dateien<input type="file" accept=".csv,.txt" multiple style="display:none" data-onchange="csvLoad"></label>
      <label class="btn btn-g" style="cursor:pointer">📄 PDF-Kontoauszüge<input type="file" accept=".pdf" multiple style="display:none" data-onchange="pdfLoad"></label>
    </div>
    <div style="font-size:11px;color:var(--muted);margin-top:10px">PDF-Import: Trade Republic + andere Banken</div>
  </div>`;
  if (_step === 2) return `<p style="color:var(--muted);font-size:12px;margin-bottom:14px">${_rows.length} Zeilen gefunden. Spalten zuordnen:</p>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px">
      ${[['date', 'Datum'], ['amount', 'Betrag'], ['desc', 'Beschreibung']].map(([k, l]) => `<div class="field"><label>${l}</label><select data-onchange="csvMapCol" data-col="${k}"><option value="-1">— nicht zuordnen —</option>${_hdr.map((h, i) => `<option value="${i}" ${_map[k] == i ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select></div>`).join('')}
    </div>
    <div style="overflow-x:auto;background:var(--bg);border-radius:8px;margin-bottom:14px"><table class="tbl" style="font-size:11px"><thead><tr>${_hdr.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${_rows.slice(0, 3).map(r => `<tr>${r.map(c => `<td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <div style="display:flex;gap:10px"><button class="btn btn-g" data-action="csvBack">Zurück</button><button class="btn btn-a" data-action="csvPrev">Vorschau</button></div>`;
  if (_step === 3) {
    // CSV or PDF preview
    const previewTxs = _pdfTxs.length ? _pdfTxs.slice(0, 5) : _rows.slice(0, 5).map(csvParseRow);
    const totalCount = _pdfTxs.length || _rows.length;
    return `<p style="color:var(--muted);font-size:12px;margin-bottom:12px">Vorschau — ${_pdfTxs.length ? 'PDF' : 'CSV'} · Kategorien automatisch erkannt:</p>
    ${previewTxs.map(t => { const cat = getCat(t.category); return `<div class="tx-row" style="background:var(--bg);border-radius:8px;margin-bottom:6px;padding:10px 14px"><div class="tx-ico" style="background:${cat.color}22">${cat.icon}</div><div class="tx-inf"><div class="tx-desc">${esc((t.description || '').slice(0, 50))}</div><div class="tx-meta">${fmtD(t.date)} · ${esc(cat.name)}</div></div><div class="tx-amt ${t.type === 'expense' ? 'neg' : 'pos'}">${t.type === 'expense' ? '−' : '+'}${fmt(t.amount)}</div></div>`; }).join('')}
    <p style="color:var(--muted);font-size:12px;margin:10px 0 14px">… und ${Math.max(0, totalCount - 5)} weitere.</p>
    <div style="display:flex;gap:10px"><button class="btn btn-g" data-action="${_pdfTxs.length ? 'csvBack' : 'csvBackToMap'}">Zurück</button><button class="btn btn-a" data-action="${_pdfTxs.length ? 'pdfImport' : 'csvImport'}">${totalCount} Buchungen importieren</button></div>`;
  }
  return `<div class="empty" style="padding:40px"><div style="width:52px;height:52px;border-radius:50%;background:#4caf7222;color:var(--income);display:flex;align-items:center;justify-content:center;font-size:24px">✓</div><div><div style="font-size:16px;font-weight:700;font-family:Georgia,serif">${_csvCnt || 0} Buchungen importiert</div><div style="font-size:12px;color:var(--muted);margin-top:4px">Duplikate wurden übersprungen</div></div><button class="btn btn-a" data-action="csvRestart">Weiteren Import</button></div>`;
}

let _csvCnt = 0;

function reImport() {
  const p = document.getElementById('csv-p');
  if (p) p.innerHTML = csvPanel();
}

function csvParseRow(r) {
  const di = parseInt(_map.date), ai = parseInt(_map.amount), xi = parseInt(_map.desc);
  const si = parseInt(_map.soll), hi = parseInt(_map.haben);
  let num = 0, type = 'expense';

  if (si >= 0 && hi >= 0) {
    // Sparkasse/Deutsche Bank format: separate Soll (debit) and Haben (credit) columns
    const sollRaw = (r[si] || '').replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
    const habenRaw = (r[hi] || '').replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
    const sollVal = parseFloat(sollRaw) || 0;
    const habenVal = parseFloat(habenRaw) || 0;
    if (habenVal > 0) { num = habenVal; type = 'income'; }
    else if (sollVal) { num = Math.abs(sollVal); type = 'expense'; }
  } else if (ai >= 0) {
    // Single Betrag column
    const raw = r[ai] || '0';
    num = parseFloat(raw.replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.'));
    type = num < 0 ? 'expense' : 'income';
    num = Math.abs(num);
  }

  const amt = isNaN(num) ? 0 : num;
  const desc = xi >= 0 ? r[xi] || '' : '';
  return { id: uid(), date: parseDeDate(di >= 0 ? r[di] || today() : today()), amount: amt, type, description: desc, category: guessCategory(desc) || (type === 'income' ? 'sonstiges_e' : 'sonstiges_a'), account: 'girokonto', tags: [], source: 'import', createdAt: Date.now(), note: '' };
}

export function csvLoad(inp) {
  if (!inp.files.length) return;
  _pdfTxs = []; _rows = []; _hdr = [];
  const files = [...inp.files];
  let loaded = 0;

  function parseOneFile(txt) {
    const lines = txt.trim().split('\n');
    const sample = lines.slice(0, 15).join('\n');
    const delim = (sample.match(/;/g) || []).length > (sample.match(/,/g) || []).length ? ';' : ',';
    const parsed = lines.map(line => { const cols = []; let cur = '', inQ = false; for (const ch of line) { if (ch === '"') { inQ = !inQ; } else if (ch === delim && !inQ) { cols.push(cur.trim()); cur = ''; } else { cur += ch; } } cols.push(cur.trim()); return cols; });
    if (parsed.length < 2) return;
    let headerIdx = 0;
    for (let i = 0; i < Math.min(parsed.length, 15); i++) {
      const row = parsed[i].map(x => x.toLowerCase()).join(' ');
      if (/buchungstag|datum|date|valuta/.test(row) && /betrag|soll|haben|amount/.test(row)) { headerIdx = i; break; }
    }
    const hdr = parsed[headerIdx];
    const rows = parsed.slice(headerIdx + 1).filter(r => r.length >= hdr.length - 1 && r.some(c => c.trim()));
    // Use header from first file, merge rows from all
    if (!_hdr.length) {
      _hdr = hdr;
      const hl = _hdr.map(x => x.toLowerCase());
      _map = {
        date: String(hl.findIndex(x => /buchungstag|datum|date|valuta/i.test(x))),
        amount: String(hl.findIndex(x => /^betrag$|^amount$/i.test(x))),
        desc: String(hl.findIndex(x => /verwendung|beschreibung|desc|memo|text|begünstigter|auftraggeber/i.test(x))),
      };
      _map.soll = String(hl.findIndex(x => /^soll$/i.test(x)));
      _map.haben = String(hl.findIndex(x => /^haben$/i.test(x)));
      const hdrJoined = _hdr.join(';').toLowerCase();
      if (/buchungstag.*umsatzart.*begünstigter.*soll.*haben/.test(hdrJoined)) notify('🏦 Deutsche Bank Format erkannt');
      else if (/buchungstag.*betrag/.test(hdrJoined)) notify('🏦 Bank-CSV erkannt');
    }
    _rows.push(...rows);
  }

  files.forEach(f => {
    const reader = new FileReader();
    reader.onload = ev => {
      parseOneFile(ev.target.result);
      loaded++;
      if (loaded === files.length) {
        if (!_rows.length) { notify('⚠ Keine Daten'); return; }
        if (files.length > 1) notify(`📊 ${files.length} Dateien · ${_rows.length} Zeilen`);
        _step = 2; reImport();
      }
    };
    reader.readAsText(f, 'UTF-8');
  });
}

export async function pdfLoad(inp) {
  if (!inp.files.length) return;
  _rows = []; _pdfTxs = [];
  const files = [...inp.files];
  notify(`⏳ ${files.length > 1 ? files.length + ' PDFs werden' : 'PDF wird'} verarbeitet…`);
  try {
    for (const f of files) {
      const txs = await parsePdfFile(f);
      _pdfTxs.push(...txs);
    }
    if (!_pdfTxs.length) {
      notify('⚠ Keine Transaktionen erkannt');
      return;
    }
    _step = 3; reImport();
    notify(`📄 ${files.length > 1 ? files.length + ' PDFs · ' : ''}${_pdfTxs.length} Transaktionen erkannt`);
  } catch (e) {
    notify('❌ PDF-Fehler: ' + (e.message || 'Unbekannter Fehler'));
  }
}

export function pdfImport() {
  if (!_pdfTxs.length) return;
  const keys = new Set(S.transactions.map(t => `${t.date}|${t.amount}|${t.description}`));
  const news = _pdfTxs.filter(t => !keys.has(`${t.date}|${t.amount}|${t.description}`));
  S.transactions.push(...news);
  _csvCnt = news.length;
  _pdfTxs = [];
  save(); _step = 4; reImport();
  notify(`✅ ${news.length} Buchungen importiert`);
}

export function csvMapCol(col, value) { _map[col] = value; }
export function csvGoBack() { _step = 1; _pdfTxs = []; reImport(); }
export function csvGoBackToMap() { _step = 2; reImport(); }
export function csvPreview() { _step = 3; reImport(); }
export function csvRestart() { _step = 1; _pdfTxs = []; reImport(); }

export function csvImport() {
  const all = _rows.map(csvParseRow).filter(t => t.amount > 0);
  const keys = new Set(S.transactions.map(t => `${t.date}|${t.amount}|${t.description}`));
  const news = all.filter(t => !keys.has(`${t.date}|${t.amount}|${t.description}`));
  S.transactions.push(...news);
  _csvCnt = news.length;
  save(); _step = 4; reImport();
  notify(`✅ ${news.length} Buchungen importiert`);
}
