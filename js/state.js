'use strict';

import { CATS, ACCS } from './constants.js';
import { dbGet, dbSet } from './db.js';
import { today, uid, addInterval } from './utils.js';

const INIT = { transactions: [], recurring: [], budgets: [], categories: [], accounts: [], settings: {}, lastModified: null };
export let S = JSON.parse(JSON.stringify(INIT));
let _stimer = null, _ready = false;
let _cache = {};

export const allCats = () => S.categories?.length ? S.categories : CATS;
export const getCat = id => allCats().find(c => c.id === id) || { id: '?', name: 'Unbekannt', icon: '📦', color: '#6b7280', type: 'expense' };
export const getAccs = () => S?.accounts?.length ? S.accounts : ACCS;
export const getAcc = id => getAccs().find(a => a.id === id) || { id: '?', name: '?' };

export async function loadState() {
  try {
    const s = await dbGet('state');
    if (s) S = { ...INIT, ...s };
    _ready = true;
    processRecurring();
  } catch { _ready = true; }
}

export function save() {
  if (!_ready) return;
  _cache = {};
  S.lastModified = Date.now();
  clearTimeout(_stimer);
  _stimer = setTimeout(() => dbSet('state', S).catch(console.error), 300);
}

export function processRecurring() {
  const td = today();
  let ch = false;
  S.recurring.forEach(rule => {
    if (!rule.active) return;
    let nd = rule.nextDate;
    while (nd <= td) {
      if (!S.transactions.find(t => t.recurringId === rule.id && t.date === nd)) {
        S.transactions.push({ id: uid(), date: nd, amount: rule.amount, type: rule.type, category: rule.category, account: rule.account, description: rule.name, note: 'Automatisch', tags: [], source: 'auto', recurringId: rule.id, createdAt: Date.now() });
        ch = true;
      }
      nd = addInterval(nd, rule.interval);
    }
    rule.nextDate = nd;
  });
  if (ch) save();
}

export function mthTxs(month) {
  if (_cache[month]) return _cache[month];
  const r = S.transactions.filter(t => t.date.startsWith(month));
  _cache[month] = r;
  return r;
}

export function getAllTags() {
  const s = new Set();
  S.transactions.forEach(t => (t.tags || []).forEach(tag => s.add(tag)));
  return [...s].sort();
}

export { INIT };
