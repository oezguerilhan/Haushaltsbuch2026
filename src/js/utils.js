'use strict';

import { RULES, CURRENCIES } from './constants.js';

export const fmt = n => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0);
export const fmtD = d => { try { return new Date(d).toLocaleDateString('de-DE'); } catch { return d; } };
export const _pad2 = n => String(n).padStart(2, '0');
export const _localISO = d => `${d.getFullYear()}-${_pad2(d.getMonth() + 1)}-${_pad2(d.getDate())}`;
export const today = () => _localISO(new Date());
export const curYM = () => { const d = new Date(); return `${d.getFullYear()}-${_pad2(d.getMonth() + 1)}`; };
export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function fmtCur(n, cur = 'EUR') {
  if (cur === 'EUR') return fmt(n);
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: cur }).format(n || 0);
}

export function addInterval(date, iv) {
  const p = date.split('-').map(Number);
  const d = new Date(p[0], p[1] - 1, p[2]);
  if (iv === 'weekly') d.setDate(d.getDate() + 7);
  else if (iv === 'biweekly') d.setDate(d.getDate() + 14);
  else if (iv === 'monthly') { const origDay = d.getDate(); d.setMonth(d.getMonth() + 1); if (d.getDate() !== origDay) d.setDate(0); }
  else if (iv === 'quarterly') { const origDay = d.getDate(); d.setMonth(d.getMonth() + 3); if (d.getDate() !== origDay) d.setDate(0); }
  else if (iv === 'yearly') d.setFullYear(d.getFullYear() + 1);
  return _localISO(d);
}

export function parseDeDate(s = '') {
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return s;
}

export function guessCategory(desc = '') {
  for (const r of RULES) if (r.re.test(desc)) return r.c;
  return null;
}

