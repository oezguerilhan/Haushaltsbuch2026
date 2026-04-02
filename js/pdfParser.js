'use strict';

import { uid, parseDeDate, guessCategory } from './utils.js';

const PDFJS_LOCAL = './pdf.min.js';
const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';

const DE_MONTHS = { 'januar': '01', 'februar': '02', 'märz': '03', 'april': '04', 'mai': '05', 'juni': '06', 'juli': '07', 'august': '08', 'september': '09', 'oktober': '10', 'november': '11', 'dezember': '12',
  'jan': '01', 'feb': '02', 'mär': '03', 'apr': '04', 'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 'okt': '10', 'nov': '11', 'dez': '12' };

/**
 * Load PDF.js — try local file first (works over file://), then CDN fallback
 */
let _pdfjsReady = null;
function getPdfLib() {
  if (typeof window.pdfjsLib !== 'undefined') return Promise.resolve(window.pdfjsLib);
  if (_pdfjsReady) return _pdfjsReady;
  _pdfjsReady = new Promise((resolve, reject) => {
    function tryLoad(src, fallback) {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => {
        if (typeof window.pdfjsLib !== 'undefined') {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = '';
          resolve(window.pdfjsLib);
        } else if (fallback) { tryLoad(fallback, null); }
        else { reject(new Error('PDF.js geladen, aber pdfjsLib nicht verfügbar')); }
      };
      s.onerror = () => {
        if (fallback) { tryLoad(fallback, null); }
        else { reject(new Error('PDF.js nicht verfügbar. Bitte pdf.min.js neben die HTML-Datei legen oder Internetverbindung herstellen.')); }
      };
      document.head.appendChild(s);
    }
    tryLoad(PDFJS_LOCAL, PDFJS_CDN);
  });
  return _pdfjsReady;
}

/**
 * Extract structured items from PDF with their positions
 */
async function extractPdfItems(file) {
  const lib = await getPdfLib();
  const arrayBuf = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: arrayBuf }).promise;
  const allItems = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      allItems.push({
        text: item.str.trim(),
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
        page: pageNum
      });
    }
  }

  return allItems;
}

/**
 * Parse Trade Republic PDF format.
 * Date is multiline: "01\nMärz\n2026"
 * Columns: DATUM | TYP | BESCHREIBUNG | ZAHLUNGSEINGANG | ZAHLUNGSAUSGANG | SALDO
 * Amounts are in separate Ein/Ausgang columns (not +/-)
 */
function parseTradeRepublic(items) {
  const transactions = [];

  // Sort items by page, then Y descending (top first), then X ascending
  items.sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);

  // Group items into rows by Y position (tolerance of 3px)
  const rows = [];
  let currentRow = [];
  let lastY = null;

  for (const item of items) {
    if (lastY !== null && Math.abs(item.y - lastY) > 3) {
      if (currentRow.length) rows.push({ y: lastY, items: [...currentRow] });
      currentRow = [];
    }
    currentRow.push(item);
    lastY = item.y;
  }
  if (currentRow.length) rows.push({ y: lastY, items: currentRow });

  // Parse: scan for date patterns and collect transaction data
  // Trade Republic dates are split across 3 rows: day, month name, year
  let i = 0;
  while (i < rows.length) {
    const rowText = rows[i].items.map(it => it.text).join(' ');

    // Skip header rows, footer, and non-data rows
    if (/^DATUM|^PRODUKT|^KONTOÜBER|^UMSATZÜBER|^BARMITTEL|^HINWEISE|^GELDMARKT|^TREUHAND|Trade Republic|Brunnenstr|Berlin|Geschäftsführer|Erstellt am|Sitz der|Umsatzsteuer|^Seite \d|^www\.|^AG Char/i.test(rowText)) {
      i++;
      continue;
    }

    // Try to detect a day number (1-31) at the start of a row
    const dayMatch = rows[i].items[0]?.text.match(/^(\d{1,2})$/);
    if (!dayMatch) { i++; continue; }

    const day = dayMatch[1].padStart(2, '0');

    // Next row should be month name (März, April, etc.)
    if (i + 1 >= rows.length) { i++; continue; }
    const monthRow = rows[i + 1].items.map(it => it.text).join(' ');
    const monthKey = monthRow.trim().toLowerCase().split(/\s/)[0];
    const month = DE_MONTHS[monthKey];
    if (!month) { i++; continue; }

    // Next row should be year (2026)
    if (i + 2 >= rows.length) { i++; continue; }
    const yearRow = rows[i + 2].items.map(it => it.text).join(' ');
    const yearMatch = yearRow.match(/^(20\d{2})/);
    if (!yearMatch) { i++; continue; }
    const year = yearMatch[1];
    const dateStr = `${day}.${month}.${year}`;

    // The year row often also contains: Typ, Beschreibung, amounts
    // But sometimes Typ is on the month row. Collect all items from month+year rows
    const monthItems = rows[i + 1].items;
    const yearItems = rows[i + 2].items;
    const allRowItems = [...monthItems, ...yearItems].sort((a, b) => a.x - b.x);

    // Extract amounts: look for "€" pattern numbers
    const amountRe = /^(\d{1,3}(?:\.\d{3})*,\d{2})\s*€?$/;
    let eingang = 0, ausgang = 0, saldo = 0;
    let typ = '', beschreibung = '';
    const textParts = [];
    const amounts = [];

    for (const it of allRowItems) {
      const cleaned = it.text.replace(/€/g, '').trim();
      const amtMatch = cleaned.match(/^(\d{1,3}(?:\.\d{3})*,\d{2})$/);
      if (amtMatch) {
        amounts.push({ value: parseFloat(amtMatch[1].replace(/\./g, '').replace(',', '.')), x: it.x });
      } else if (it.text !== year && it.text !== monthRow.trim().split(/\s/)[0] && !/^\d{1,2}$/.test(it.text) && it.text !== '€') {
        textParts.push(it.text);
      }
    }

    // Check if there are continuation rows (description spanning multiple lines)
    let extraIdx = i + 3;
    while (extraIdx < rows.length) {
      const nextRowItems = rows[extraIdx].items;
      const nextText = nextRowItems.map(it => it.text).join(' ');
      // Stop if we hit another day number (next transaction) or a section header
      if (/^\d{1,2}$/.test(nextRowItems[0]?.text) && extraIdx + 1 < rows.length) {
        const peekMonth = rows[extraIdx + 1]?.items.map(it => it.text).join(' ').trim().toLowerCase().split(/\s/)[0];
        if (DE_MONTHS[peekMonth]) break;
      }
      if (/^DATUM|^PRODUKT|^BARMITTEL|^HINWEISE|^GELDMARKT|Trade Republic|Brunnenstr/i.test(nextText)) break;
      // Collect text and amounts from continuation rows
      for (const it of nextRowItems) {
        const cleaned = it.text.replace(/€/g, '').trim();
        const amtMatch = cleaned.match(/^(\d{1,3}(?:\.\d{3})*,\d{2})$/);
        if (amtMatch) {
          amounts.push({ value: parseFloat(amtMatch[1].replace(/\./g, '').replace(',', '.')), x: it.x });
        } else if (it.text !== '€') {
          textParts.push(it.text);
        }
      }
      extraIdx++;
    }

    // Parse text parts: first word(s) are Typ, rest is Beschreibung
    const fullText = textParts.join(' ').trim();
    // Known Trade Republic types
    const typMatch = fullText.match(/^(Kartentransaktion|Überweisung|Handel|Bonus|Zinsen|Lastschrift|Gutschrift|Dividende)\s*/i);
    if (typMatch) {
      typ = typMatch[1];
      beschreibung = fullText.substring(typMatch[0].length).trim();
    } else {
      beschreibung = fullText;
    }

    // Amounts: typically [eingang or ausgang, saldo] or [eingang, ausgang, saldo]
    // Saldo is always the last (rightmost) amount. Eingang/Ausgang depends on position.
    if (amounts.length >= 2) {
      saldo = amounts[amounts.length - 1].value;
      // If there's exactly 2 amounts, the first is either eingang or ausgang
      // If 3, first is eingang, second is ausgang
      if (amounts.length === 3) {
        eingang = amounts[0].value;
        ausgang = amounts[1].value;
      } else {
        // 2 amounts: determine if eingang or ausgang by checking column position
        // Eingang is usually left of Ausgang. Or: if saldo > previous saldo, it's eingang
        const amt = amounts[0].value;
        // Heuristic: if typ is Überweisung/Bonus/Zinsen/Gutschrift/Dividende → likely income
        if (/überweisung|bonus|zinsen|gutschrift|dividende|incoming/i.test(fullText)) {
          eingang = amt;
        } else {
          ausgang = amt;
        }
      }
    } else if (amounts.length === 1) {
      // Only saldo, skip this row (it's likely a header or summary)
      i = extraIdx;
      continue;
    } else {
      i = extraIdx;
      continue;
    }

    const amount = eingang > 0 ? eingang : ausgang;
    const type = eingang > 0 ? 'income' : 'expense';

    if (amount > 0) {
      const desc = beschreibung || typ || 'Transaktion';
      transactions.push({
        id: uid(),
        date: parseDeDate(dateStr),
        amount,
        type,
        description: typ ? `${typ}: ${beschreibung}` : desc,
        category: guessCategory(desc) || (type === 'income' ? 'sonstiges_e' : 'sonstiges_a'),
        account: 'girokonto',
        tags: [],
        source: 'import',
        createdAt: Date.now(),
        note: 'PDF-Import (Trade Republic)',
      });
    }

    i = extraIdx;
  }

  return transactions;
}

/**
 * Generic bank statement parser fallback
 */
function parseGenericBank(items) {
  const transactions = [];
  // Group into lines by Y
  const yGroups = {};
  for (const item of items) {
    const y = Math.round(item.y);
    if (!yGroups[y]) yGroups[y] = [];
    yGroups[y].push(item);
  }
  const lines = Object.keys(yGroups).map(Number).sort((a, b) => b - a)
    .map(y => yGroups[y].sort((a, b) => a.x - b.x).map(i => i.text).join(' '));

  const dateRe = /(\d{1,2}\.\d{1,2}\.\d{2,4})/;
  const amountRe = /(-?\d{1,3}(?:\.\d{3})*,\d{2})/;

  for (const line of lines) {
    const dateMatch = line.match(dateRe);
    const amountMatch = line.match(amountRe);
    if (!dateMatch || !amountMatch) continue;

    let fullDate = dateMatch[1];
    if (/\.\d{2}$/.test(fullDate)) fullDate = fullDate.replace(/\.(\d{2})$/, '.20$1');

    const numAmount = parseFloat(amountMatch[1].replace(/\./g, '').replace(',', '.'));
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
  const items = await extractPdfItems(file);
  const fullText = items.map(i => i.text).join(' ');
  const isTradeRepublic = /trade\s*republic|TRBKDEBBXXX/i.test(fullText);

  let txs = isTradeRepublic ? parseTradeRepublic(items) : parseGenericBank(items);

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
