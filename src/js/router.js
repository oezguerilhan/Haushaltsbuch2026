'use strict';

import { curYM, _pad2 } from './utils.js';
import { MONTHS_S, MONTHS_L } from './constants.js';
import { vDash } from './views/dashboard.js';
import { vTx } from './views/transactions.js';
import { vRec } from './views/recurring.js';
import { vCharts } from './views/charts.js';
import { vImport } from './views/import.js';
import { vSettings } from './views/settings.js';

export let _view = 'dash';
export let _month = curYM();
let _pickerYear = null; // year shown in the month picker

export function navigate(v) {
  _view = v;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  render();
}

export function render() {
  const el = document.getElementById('content');
  el.className = 'fade';
  switch (_view) {
    case 'dash': el.innerHTML = vDash(_month); break;
    case 'tx': el.innerHTML = vTx(_month); break;
    case 'rec': el.innerHTML = vRec(); break;
    case 'charts': el.innerHTML = vCharts(_month); break;
    case 'import': el.innerHTML = vImport(); break;
    case 'settings': el.innerHTML = vSettings(); break;
    default: el.innerHTML = vDash(_month);
  }
}

export function prevMonth() {
  const [y, m] = _month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  _month = `${d.getFullYear()}-${_pad2(d.getMonth() + 1)}`;
  render();
}

export function nextMonth() {
  const [y, m] = _month.split('-').map(Number);
  const d = new Date(y, m, 1);
  _month = `${d.getFullYear()}-${_pad2(d.getMonth() + 1)}`;
  render();
}

export function setMonth(m) { _month = m; }

export function mthNav() {
  const [y, m] = _month.split('-').map(Number);
  return `<div class="mth-nav"><button data-action="prevMonth">‹</button><span data-action="openMonthPicker">${MONTHS_L[m - 1]} ${y}</span><button data-action="nextMonth">›</button></div>`;
}

// Month Picker
export function openMonthPicker() {
  // Close if already open
  const existing = document.querySelector('.mth-picker');
  if (existing) { existing.remove(); return; }

  const [y] = _month.split('-').map(Number);
  _pickerYear = y;
  renderPicker();
}

function renderPicker() {
  // Remove old picker
  const old = document.querySelector('.mth-picker');
  if (old) old.remove();

  const [, curM] = _month.split('-').map(Number);
  const nav = document.querySelector('.mth-nav');
  if (!nav) return;

  const html = `<div class="mth-picker">
    <div class="mth-picker-hdr">
      <button data-action="pickerPrevYear" class="btn btn-g btn-ic btn-sm">‹</button>
      <span>${_pickerYear}</span>
      <button data-action="pickerNextYear" class="btn btn-g btn-ic btn-sm">›</button>
    </div>
    <div class="mth-picker-grid">
      ${MONTHS_S.map((name, i) => {
        const isActive = _pickerYear === parseInt(_month.split('-')[0]) && (i + 1) === curM;
        return `<button data-action="pickMonth" data-ym="${_pickerYear}-${_pad2(i + 1)}" class="${isActive ? 'active' : ''}">${name}</button>`;
      }).join('')}
    </div>
  </div>`;

  nav.insertAdjacentHTML('beforeend', html);

  // Close picker on outside click (delayed to avoid immediate close)
  setTimeout(() => {
    const handler = (e) => {
      if (!e.target.closest('.mth-picker') && !e.target.closest('[data-action="openMonthPicker"]')) {
        const p = document.querySelector('.mth-picker');
        if (p) p.remove();
        document.removeEventListener('click', handler);
      }
    };
    document.addEventListener('click', handler);
  }, 10);
}

export function pickerPrevYear() {
  _pickerYear--;
  renderPicker();
}

export function pickerNextYear() {
  _pickerYear++;
  renderPicker();
}

export function pickMonth(ym) {
  _month = ym;
  const p = document.querySelector('.mth-picker');
  if (p) p.remove();
  render();
}
