'use strict';

import { curYM, _pad2 } from './utils.js';
import { MONTHS_L } from './constants.js';
import { vDash } from './views/dashboard.js';
import { vTx } from './views/transactions.js';
import { vRec } from './views/recurring.js';
import { vCharts } from './views/charts.js';
import { vImport } from './views/import.js';
import { vSettings } from './views/settings.js';

export let _view = 'dash';
export let _month = curYM();

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
  return `<div class="mth-nav"><button data-action="prevMonth">‹</button><span>${MONTHS_L[m - 1]} ${y}</span><button data-action="nextMonth">›</button></div>`;
}
