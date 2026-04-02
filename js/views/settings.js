'use strict';

import { S, save, getCat, allCats, getAccs, getAcc } from '../state.js';
import { CATS, CAT_COLORS } from '../constants.js';
import { fmt, fmtD, esc, uid, today } from '../utils.js';
import { openModal, closeModal, notify } from '../modal.js';
import { render } from '../router.js';

export function vSettings() {
  return `
  <div class="view-head"><div><h2>Einstellungen</h2><p>App konfigurieren</p></div></div>
  <div class="card" style="margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div style="font-weight:600;font-size:14px">🏦 Konten</div>
      <button class="btn btn-a btn-sm" data-action="openAccForm">+ Neues Konto</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">
      ${getAccs().map(a => `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--bg);border-radius:8px;font-size:12px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:28px;height:28px;border-radius:8px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:14px">🏦</div>
          <span style="font-weight:500">${esc(a.name)}</span>
        </div>
        <div style="display:flex;gap:4px">
          <button class="btn btn-g btn-ic btn-sm" data-action="openAccForm" data-id="${a.id}">✏</button>
          <button class="btn btn-d btn-ic btn-sm" data-action="delAcc" data-id="${a.id}">🗑</button>
        </div>
      </div>`).join('')}
    </div>
  </div>
  <div class="card" style="margin-bottom:16px">
    <div style="font-weight:600;font-size:14px;margin-bottom:14px">💰 Monatliche Budgets</div>
    ${S.budgets.length ? `<div style="margin-bottom:14px">${S.budgets.map(b => { const cat = getCat(b.cat); return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)"><span>${cat.icon} ${cat.name}</span><div style="display:flex;align-items:center;gap:12px"><span style="color:var(--accent);font-weight:600">${fmt(b.limit)}/Monat</span><button class="btn btn-d btn-ic btn-sm" data-action="delBudget" data-id="${b.cat}">🗑</button></div></div>`; }).join('')}</div>` : ''}
    <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
      <div class="field" style="flex:1;min-width:140px"><label>Kategorie</label><select id="b-cat">${allCats().filter(c => c.type === 'expense').map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}</select></div>
      <div class="field" style="width:130px"><label>Limit (€/Monat)</label><input type="number" id="b-lim" step="10" placeholder="400"></div>
      <button class="btn btn-a" data-action="addBudget">Hinzufügen</button>
    </div>
  </div>
  <div class="card" style="margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div style="font-weight:600;font-size:14px">🏷️ Kategorien</div>
      <button class="btn btn-a btn-sm" data-action="openCatForm">+ Neue Kategorie</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px" id="cat-list">
      ${allCats().map(c => `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--bg);border-radius:8px;font-size:12px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:30px;height:30px;border-radius:8px;background:${c.color}22;display:flex;align-items:center;justify-content:center;font-size:15px">${c.icon}</div>
          <div><div style="font-weight:500">${esc(c.name)}</div><div style="color:var(--muted);font-size:10px">${c.type === 'expense' ? 'Ausgabe' : 'Einnahme'}${c._custom ? ' · Eigene' : ' · Standard'}</div></div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button class="btn btn-g btn-ic btn-sm" data-action="openCatForm" data-id="${c.id}">✏</button>
          ${c._custom ? `<button class="btn btn-d btn-ic btn-sm" data-action="delCat" data-id="${c.id}">🗑</button>` : '<span style="width:26px"></span>'}
        </div>
      </div>`).join('')}
    </div>
    <p style="font-size:11px;color:var(--muted);margin-top:10px">Standard-Kategorien können bearbeitet aber nicht gelöscht werden.</p>
  </div>
  <div class="card">
    <div style="font-weight:600;font-size:14px;margin-bottom:8px">💾 Datensicherung</div>
    <p style="font-size:12px;color:var(--muted);margin-bottom:12px">Daten werden lokal im Browser gespeichert (IndexedDB). ${S.transactions.length} Buchungen gespeichert.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn btn-g" data-action="exportJ">📤 JSON exportieren</button>
      <button class="btn btn-g" data-action="exportCSV">📊 CSV exportieren</button>
      <label class="btn btn-g" style="cursor:pointer">📥 JSON importieren<input type="file" accept=".json" style="display:none" data-onchange="importJ"></label>
      <button class="btn btn-g" data-action="printPage">🖨 Drucken / PDF</button>
    </div>
  </div>`;
}

// Budget
export function addBudget() {
  const cat = document.getElementById('b-cat')?.value;
  const lim = parseFloat(document.getElementById('b-lim')?.value || '0');
  if (!cat || !lim) { notify('⚠ Kategorie und Limit eingeben'); return; }
  S.budgets = S.budgets.filter(b => b.cat !== cat);
  S.budgets.push({ cat, limit: lim });
  save(); render(); notify('✅ Budget gespeichert');
}
export function delBudget(cat) { S.budgets = S.budgets.filter(b => b.cat !== cat); save(); render(); }

// Export
export function exportJ() {
  const b = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const u = URL.createObjectURL(b); const a = document.createElement('a');
  a.href = u; a.download = `haushaltsbuch-${today()}.json`; a.click();
  URL.revokeObjectURL(u); notify('📤 Export gestartet');
}

export function exportCSV() {
  const sep = ';';
  const hdr = ['Datum', 'Typ', 'Betrag (EUR)', 'Kategorie', 'Konto', 'Beschreibung', 'Tags', 'Notiz', 'Währung', 'Originalbetrag', 'Wechselkurs'];
  const rows = S.transactions.sort((a, b) => a.date.localeCompare(b.date)).map(t => {
    const cat = getCat(t.category); const acc = getAcc(t.account);
    return [fmtD(t.date), t.type === 'expense' ? 'Ausgabe' : 'Einnahme', String(t.amount).replace('.', ','), cat.name, acc.name, `"${(t.description || '').replace(/"/g, '""')}"`, `"${(t.tags || []).join(', ')}"`, `"${(t.note || '').replace(/"/g, '""')}"`, t.currency || 'EUR', t.originalAmount ? String(t.originalAmount).replace('.', ',') : '', t.fxRate ? String(t.fxRate).replace('.', ',') : ''].join(sep);
  });
  const csv = '\uFEFF' + [hdr.join(sep), ...rows].join('\n');
  const b = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const u = URL.createObjectURL(b); const a = document.createElement('a');
  a.href = u; a.download = `haushaltsbuch-${today()}.csv`; a.click();
  URL.revokeObjectURL(u); notify('📊 CSV exportiert');
}

export function importJ(inp) {
  const f = inp.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = ev => {
    try {
      const d = JSON.parse(ev.target.result);
      if (!d || typeof d !== 'object') { notify('❌ Ungültiges Format'); return; }
      if (d.transactions && !Array.isArray(d.transactions)) { notify('❌ Ungültige Transaktionsdaten'); return; }
      if (d.recurring && !Array.isArray(d.recurring)) { notify('❌ Ungültige Recurring-Daten'); return; }
      if (d.budgets && !Array.isArray(d.budgets)) { notify('❌ Ungültige Budget-Daten'); return; }
      S.transactions = Array.isArray(d.transactions) ? d.transactions : [];
      S.recurring = Array.isArray(d.recurring) ? d.recurring : [];
      S.budgets = Array.isArray(d.budgets) ? d.budgets : [];
      S.categories = Array.isArray(d.categories) ? d.categories : [];
      S.accounts = Array.isArray(d.accounts) ? d.accounts : [];
      S.settings = d.settings || {};
      S.lastModified = d.lastModified || Date.now();
      save(); render(); notify('✅ Daten importiert');
    } catch { notify('❌ Ungültige Datei'); }
  };
  r.readAsText(f);
}

// Category Manager
let _catType = 'expense';

export function openCatForm(id = null) {
  const existing = id ? allCats().find(c => c.id === id) : null;
  _catType = existing?.type || 'expense';
  const swatches = CAT_COLORS.map(col => `<div data-action="selectCatColor" data-color="${col}" class="cswatch" style="width:22px;height:22px;border-radius:5px;background:${col};cursor:pointer;flex-shrink:0;outline:${(existing?.color || '#6366f1') === col ? '2px solid white' : 'none'}"></div>`).join('');
  const html = `<div class="fgrid">
    <div class="tgl-row">
      <button type="button" class="tgl-btn ${_catType === 'expense' ? 'ae' : ''}" data-action="catTypeExpense">↑ Ausgabe</button>
      <button type="button" class="tgl-btn ${_catType === 'income' ? 'ai' : ''}" data-action="catTypeIncome">↓ Einnahme</button>
    </div>
    <div class="frow">
      <div class="field"><label>Icon (Emoji)</label><input type="text" id="cf-icon" value="${existing?.icon || '📦'}" maxlength="4" style="font-size:20px;text-align:center"></div>
      <div class="field"><label>Name</label><input type="text" id="cf-name" value="${existing?.name || ''}" placeholder="Kategoriename"></div>
    </div>
    <div class="field"><label>Farbe</label>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">${swatches}</div>
      <input type="color" id="cf-col" value="${existing?.color || '#6366f1'}" style="width:100%;height:32px;padding:2px">
    </div>
    <div style="display:flex;gap:10px;margin-top:4px">
      <button class="btn btn-g" style="flex:1" data-action="closeModal">Abbrechen</button>
      <button class="btn btn-a" style="flex:1" data-action="saveCat" data-id="${id || ''}">Speichern</button>
    </div>
  </div>`;
  openModal(id ? 'Kategorie bearbeiten' : 'Neue Kategorie', html);
}

export function setCatType(type) {
  _catType = type;
  document.querySelector('[data-action="catTypeExpense"]').className = `tgl-btn ${type === 'expense' ? 'ae' : ''}`;
  document.querySelector('[data-action="catTypeIncome"]').className = `tgl-btn ${type === 'income' ? 'ai' : ''}`;
}

export function selectCatColor(col) {
  document.getElementById('cf-col').value = col;
  document.querySelectorAll('.cswatch').forEach(s => s.style.outline = 'none');
  document.querySelector(`[data-color="${col}"]`).style.outline = '2px solid white';
}

export function saveCat(editId) {
  const name = document.getElementById('cf-name')?.value?.trim();
  const icon = document.getElementById('cf-icon')?.value?.trim() || '📦';
  const color = document.getElementById('cf-col')?.value || '#6366f1';
  if (!name) { notify('⚠ Name eingeben'); return; }
  if (!S.categories?.length) S.categories = [...CATS.map(c => ({ ...c }))];
  if (editId) { const i = S.categories.findIndex(c => c.id === editId); if (i >= 0) S.categories[i] = { ...S.categories[i], name, icon, color, type: _catType }; }
  else S.categories.push({ id: 'cat_' + uid(), name, icon, color, type: _catType, _custom: true });
  save(); closeModal(); render(); notify(editId ? '✅ Kategorie aktualisiert' : '✅ Kategorie hinzugefügt');
}

export function delCat(id) {
  const inUse = S.transactions.some(t => t.category === id) || S.recurring.some(r => r.category === id);
  if (inUse && !confirm('Diese Kategorie wird noch von Buchungen verwendet. Trotzdem löschen?')) return;
  if (!S.categories?.length) S.categories = [...CATS.map(c => ({ ...c }))];
  S.categories = S.categories.filter(c => c.id !== id);
  save(); render(); notify('🗑 Kategorie gelöscht');
}

// Account Manager
export function openAccForm(id = null) {
  const a = id ? getAccs().find(x => x.id === id) : null;
  const html = `<div class="fgrid">
    <div class="field"><label>Kontoname</label><input type="text" id="af-name" value="${esc(a?.name || '')}" placeholder="z.B. Tagesgeld, PayPal" autofocus></div>
    <div style="display:flex;gap:10px;margin-top:4px">
      <button class="btn btn-g" style="flex:1" data-action="closeModal">Abbrechen</button>
      <button class="btn btn-a" style="flex:1" data-action="saveAcc" data-id="${id || ''}">Speichern</button>
    </div>
  </div>`;
  openModal(id ? 'Konto bearbeiten' : 'Neues Konto', html);
}

export function saveAcc(editId) {
  const name = document.getElementById('af-name')?.value?.trim();
  if (!name) { notify('⚠ Name eingeben'); return; }
  if (!S.accounts?.length) S.accounts = [...getAccs()];
  if (editId) { const i = S.accounts.findIndex(a => a.id === editId); if (i >= 0) S.accounts[i] = { ...S.accounts[i], name }; }
  else S.accounts.push({ id: 'acc_' + uid(), name });
  save(); closeModal(); render(); notify(editId ? '✅ Konto aktualisiert' : '✅ Konto hinzugefügt');
}

export function delAcc(id) {
  if (getAccs().length <= 1) { notify('⚠ Mindestens ein Konto erforderlich'); return; }
  const inUse = S.transactions.some(t => t.account === id) || S.recurring.some(r => r.account === id);
  if (inUse && !confirm('Konto wird noch von Buchungen verwendet. Trotzdem löschen?')) return;
  if (!S.accounts?.length) S.accounts = [...getAccs()];
  S.accounts = S.accounts.filter(a => a.id !== id);
  save(); render(); notify('🗑 Konto gelöscht');
}
