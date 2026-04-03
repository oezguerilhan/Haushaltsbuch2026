'use strict';

import { loadState } from './state.js';
import { navigate, render, prevMonth, nextMonth, _month } from './router.js';
import { initModal, closeModal } from './modal.js';
import { openTxForm, saveTx, editTx, setTxType, txCurrencyChange } from './forms/transaction.js';
import { openBatch, saveBatch, batchAddRow, batchDelRow, batchSetField, batchSetType } from './forms/batch.js';
import { openSplitForm, saveSplit, splitAddRow, splitDelRow, splitSetCat, splitSetAmt } from './forms/split.js';
import { delTx, filterTx } from './views/transactions.js';
import { openRecForm, saveRec, toggleRec, delRec, setRecType } from './views/recurring.js';
import { setChartTab, setChartYear, _cyr } from './views/charts.js';
import { csvLoad, csvImport, csvPreview, csvGoBack, csvGoBackToMap, csvRestart, csvMapCol, pdfLoad, pdfImport } from './views/import.js';
import { addBudget, delBudget, exportJ, exportCSV, importJ, openCatForm, saveCat, delCat, setCatType, selectCatColor, openAccForm, saveAcc, delAcc } from './views/settings.js';

// ── INIT ──────────────────────────────────────────────────────────
initModal();
document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.view)));
document.getElementById('fab').onclick = () => openTxForm();

// ── EVENT DELEGATION: CLICK ───────────────────────────────────────
const clickHandlers = {
  // Navigation
  prevMonth, nextMonth, closeModal, printPage: () => window.print(),
  // Transactions
  openTxForm: () => openTxForm(), saveTx: (el) => saveTx(el.dataset.id || ''),
  editTx: (el) => editTx(el.dataset.id), delTx: (el) => delTx(el.dataset.id),
  txTypeExpense: () => setTxType('expense'), txTypeIncome: () => setTxType('income'),
  // Batch
  openBatch, saveBatch, batchAddRow,
  batchDelRow: (el) => batchDelRow(parseInt(el.dataset.idx)),
  // Split
  openSplitForm, saveSplit, splitAddRow,
  splitDelRow: (el) => splitDelRow(parseInt(el.dataset.idx)),
  // Recurring
  openRecForm: (el) => openRecForm(el.dataset.id || null),
  saveRec: (el) => saveRec(el.dataset.id || ''),
  toggleRec: (el) => toggleRec(el.dataset.id),
  delRec: (el) => delRec(el.dataset.id),
  recTypeExpense: () => setRecType('expense'), recTypeIncome: () => setRecType('income'),
  // Charts
  setChartTab: (el) => { setChartTab(el.dataset.tab); render(); },
  chartYearPrev: () => { setChartYear(_cyr - 1); render(); },
  chartYearNext: () => { setChartYear(_cyr + 1); render(); },
  // Settings
  addBudget, delBudget: (el) => delBudget(el.dataset.id),
  exportJ, exportCSV,
  openCatForm: (el) => openCatForm(el.dataset.id || null),
  saveCat: (el) => saveCat(el.dataset.id || ''),
  delCat: (el) => delCat(el.dataset.id),
  catTypeExpense: () => setCatType('expense'), catTypeIncome: () => setCatType('income'),
  selectCatColor: (el) => selectCatColor(el.dataset.color),
  openAccForm: (el) => openAccForm(el.dataset.id || null),
  saveAcc: (el) => saveAcc(el.dataset.id || ''),
  delAcc: (el) => delAcc(el.dataset.id),
  // CSV Import
  csvPrev: csvPreview, csvBack: csvGoBack, csvBackToMap: csvGoBackToMap,
  csvImport, csvRestart, pdfImport,
};

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  if (clickHandlers[action]) {
    e.preventDefault();
    clickHandlers[action](btn);
  }
});

// ── EVENT DELEGATION: INPUT / CHANGE ──────────────────────────────
const changeHandlers = {
  filterTx: () => filterTx(_month),
  txCurrencyChange,
  csvLoad: (el) => csvLoad(el),
  pdfLoad: (el) => pdfLoad(el),
  importJ: (el) => importJ(el),
  csvMapCol: (el) => csvMapCol(el.dataset.col, el.value),
  batchField: (el) => batchSetField(parseInt(el.dataset.idx), el.dataset.field, el.value),
  batchType: (el) => batchSetType(parseInt(el.dataset.idx), el.value),
  splitCat: (el) => splitSetCat(parseInt(el.dataset.idx), el.value),
  splitAmt: (el) => splitSetAmt(parseInt(el.dataset.idx), el.value),
};

document.addEventListener('input', e => {
  const el = e.target.closest('[data-oninput]');
  if (el && changeHandlers[el.dataset.oninput]) changeHandlers[el.dataset.oninput](el);
});

document.addEventListener('change', e => {
  const el = e.target.closest('[data-onchange]');
  if (el && changeHandlers[el.dataset.onchange]) changeHandlers[el.dataset.onchange](el);
});

// ── BOOT ──────────────────────────────────────────────────────────
loadState().then(() => render());
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
