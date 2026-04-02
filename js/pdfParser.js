'use strict';

import { uid, today, parseDeDate, guessCategory } from './utils.js';

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.js';

/**
 * Load PDF.js via script tag (works in both module and bundled mode, and over file://)
 */
let _pdfjsReady = null;
function getPdfLib() {
  if (typeof window.pdfjsLib !== 'undefined') return Promise.resolve(window.pdfjsLib);
  if (_pdfjsReady) return _pdfjsReady;
  _pdfjsReady = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PDFJS_CDN;
    script.onload = () => {
      if (typeof window.pdfjsLib !== 'undefined') {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = '';
        resolve(window.pdfjsLib);
      } else {
        reject(new Error('PDF.js wurde geladen, aber pdfjsLib ist nicht verfügbar'));
      }
    };
    script.onerror = () => reject(new Error('PDF.js konnte nicht geladen werden. Internetverbindung erforderlich.'));
    document.head.appendChild(script);
  });
  return _pdfjsReady;
}

/**
 * Extract text lines from a PDF file, grouped by Y position
 */
async function extractTextLines(file) {
  const lib = await getPdfLib();

  const arrayBuf = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: arrayBuf }).promise;
  const allLines = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Group text items by Y position (same line = similar Y)
    const yGroups = {};
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      if (!yGroups[y]) yGroups[y] = [];
      yGroups[y].push({ text: item.str, x: item.transform[4] });
    }

    // Sort by Y descending (top of page first), then by X within line
    const sortedYs = Object.keys(yGroups).map(Number).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const items = yGroups[y].sort((a, b) => a.x - b.x);
      const lineText = items.map(i => i.text).join(' ').trim();
      if (lineText) allLines.push(lineText);
    }
  }

  return allLines;
}

/**
 * Parse Trade Republic bank statement lines into transactions
 */
function parseTradeRepublic(lines) {
  const transactions = [];
  const dateRe = /(\d{2}\.\d{2}\.\d{4})/;
  const amountRe = /([+-]?\s?\d{1,3}(?:\.\d{3})*,\d{2})\s*€?/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dateMatch = line.match(dateRe);
    if (!dateMatch) continue;

    const amountMatch = line.match(amountRe);
    if (!amountMatch) continue;

    const dateStr = dateMatch[1];
    const rawAmount = amountMatch[1].replace(/\s/g, '');
    const numAmount = parseFloat(rawAmount.replace(/\./g, '').replace(',', '.'));
    if (isNaN(numAmount) || numAmount === 0) continue;

    let desc = line;
    desc = desc.replace(dateRe, '').replace(amountRe, '').replace(/€/g, '').trim();
    desc = desc.replace(/^(Kartenzahlung|Überweisung|Lastschrift|Zinsen|Saveback|Gehalt|Gutschrift)\s*/i, (m) => m.trim() + ': ').replace(/:\s*$/, '').trim();
    if (!desc) desc = 'Transaktion';

    const type = numAmount < 0 ? 'expense' : 'income';
    const amount = Math.abs(numAmount);

    transactions.push({
      id: uid(),
      date: parseDeDate(dateStr),
      amount,
      type,
      description: desc,
      category: guessCategory(desc) || (type === 'income' ? 'sonstiges_e' : 'sonstiges_a'),
      account: 'girokonto',
      tags: [],
      source: 'import',
      createdAt: Date.now(),
      note: 'PDF-Import',
    });
  }

  return transactions;
}

/**
 * Generic bank statement parser — fallback for non-Trade-Republic PDFs
 */
function parseGenericBank(lines) {
  const transactions = [];
  const dateRe = /(\d{1,2}\.\d{1,2}\.\d{2,4})/;
  const amountRe = /(-?\d{1,3}(?:\.\d{3})*,\d{2})/;

  for (const line of lines) {
    const dateMatch = line.match(dateRe);
    const amountMatch = line.match(amountRe);
    if (!dateMatch || !amountMatch) continue;

    let fullDate = dateMatch[1];
    if (/\.\d{2}$/.test(fullDate)) {
      fullDate = fullDate.replace(/\.(\d{2})$/, '.20$1');
    }

    const rawAmount = amountMatch[1];
    const numAmount = parseFloat(rawAmount.replace(/\./g, '').replace(',', '.'));
    if (isNaN(numAmount) || numAmount === 0) continue;

    let desc = line.replace(dateRe, '').replace(amountRe, '').replace(/€/g, '').trim();
    if (!desc) desc = 'Transaktion';

    const type = numAmount < 0 ? 'expense' : 'income';

    transactions.push({
      id: uid(),
      date: parseDeDate(fullDate),
      amount: Math.abs(numAmount),
      type,
      description: desc,
      category: guessCategory(desc) || (type === 'income' ? 'sonstiges_e' : 'sonstiges_a'),
      account: 'girokonto',
      tags: [],
      source: 'import',
      createdAt: Date.now(),
      note: 'PDF-Import',
    });
  }

  return transactions;
}

/**
 * Main entry: parse a PDF file into transactions
 */
async function parsePdfFile(file) {
  const lines = await extractTextLines(file);

  const fullText = lines.join(' ');
  const isTradeRepublic = /trade\s*republic|TR\s*Technologies/i.test(fullText);

  let txs = isTradeRepublic ? parseTradeRepublic(lines) : parseGenericBank(lines);

  // Deduplicate
  const seen = new Set();
  txs = txs.filter(t => {
    const key = `${t.date}|${t.amount}|${t.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return txs;
}

export { parsePdfFile };
