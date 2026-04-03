'use strict';

export const CATS = [
  { id: 'wohnen', name: 'Wohnen', icon: '🏠', color: '#6366f1', type: 'expense' },
  { id: 'lebensmittel', name: 'Lebensmittel', icon: '🛒', color: '#22c55e', type: 'expense' },
  { id: 'transport', name: 'Transport', icon: '🚗', color: '#3b82f6', type: 'expense' },
  { id: 'gesundheit', name: 'Gesundheit', icon: '💊', color: '#ec4899', type: 'expense' },
  { id: 'freizeit', name: 'Freizeit', icon: '🎬', color: '#f59e0b', type: 'expense' },
  { id: 'kleidung', name: 'Kleidung', icon: '👔', color: '#8b5cf6', type: 'expense' },
  { id: 'restaurant', name: 'Restaurant', icon: '🍽️', color: '#ef4444', type: 'expense' },
  { id: 'bildung', name: 'Bildung', icon: '📚', color: '#06b6d4', type: 'expense' },
  { id: 'versicherung', name: 'Versicherungen', icon: '🛡️', color: '#64748b', type: 'expense' },
  { id: 'sparen', name: 'Sparen', icon: '💰', color: '#eab308', type: 'expense' },
  { id: 'sonstiges_a', name: 'Sonstiges', icon: '📦', color: '#6b7280', type: 'expense' },
  { id: 'gehalt', name: 'Gehalt', icon: '💼', color: '#10b981', type: 'income' },
  { id: 'sonstiges_e', name: 'Sonstige Einnahmen', icon: '💵', color: '#84cc16', type: 'income' },
];

export const ACCS = [
  { id: 'girokonto', name: 'Girokonto' },
  { id: 'bar', name: 'Bar' },
  { id: 'kreditkarte', name: 'Kreditkarte' },
];

export const IVLS = [
  { v: 'weekly', l: 'Wöchentlich' },
  { v: 'biweekly', l: 'Alle 2 Wochen' },
  { v: 'monthly', l: 'Monatlich' },
  { v: 'quarterly', l: 'Vierteljährlich' },
  { v: 'yearly', l: 'Jährlich' },
];

export const MONTHS_S = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
export const MONTHS_L = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export const RULES = [
  { re: /rewe|edeka|lidl|aldi|penny|netto|kaufland|norma|spar\b/i, c: 'lebensmittel' },
  { re: /shell|aral|bp|esso|tankstelle|total\b|jet\b/i, c: 'transport' },
  { re: /bvg|mvv|hvv|vvs|bahn|flixbus/i, c: 'transport' },
  { re: /netflix|spotify|amazon\s?prime|disney|youtube|dazn/i, c: 'freizeit' },
  { re: /amazon|zalando|h&m\b|zara|otto\b/i, c: 'kleidung' },
  { re: /apotheke|arzt|zahnarzt|kranken/i, c: 'gesundheit' },
  { re: /strom|stadtwerke|eon\b|rwe\b|heiz/i, c: 'wohnen' },
  { re: /miete|hausgeld|nebenkosten/i, c: 'wohnen' },
  { re: /versicherung|allianz|signal|axa|huk/i, c: 'versicherung' },
  { re: /gehalt|lohn|salary/i, c: 'gehalt' },
  { re: /restaurant|gastro|pizza|burger|café|bäckerei/i, c: 'restaurant' },
];

export const CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US-Dollar' },
  { code: 'GBP', symbol: '£', name: 'Brit. Pfund' },
  { code: 'CHF', symbol: 'CHF', name: 'Schweizer Franken' },
  { code: 'TRY', symbol: '₺', name: 'Türk. Lira' },
  { code: 'PLN', symbol: 'zł', name: 'Poln. Zloty' },
  { code: 'SEK', symbol: 'kr', name: 'Schwed. Krone' },
  { code: 'JPY', symbol: '¥', name: 'Jap. Yen' },
];

export const CAT_COLORS = [
  '#6366f1', '#22c55e', '#3b82f6', '#ec4899', '#f59e0b', '#8b5cf6',
  '#ef4444', '#06b6d4', '#64748b', '#eab308', '#6b7280', '#10b981',
  '#84cc16', '#f97316', '#14b8a6', '#a855f7', '#e11d48', '#0ea5e9',
];
