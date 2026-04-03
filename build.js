#!/usr/bin/env node
'use strict';

/**
 * Build script: bundles all ES modules into a single haushaltsbuch.html
 * that works over file:// protocol (no HTTP server needed).
 *
 * Usage: node build.js
 * Output: ./haushaltsbuch.html (bundled single-file)
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');

// Topologically sorted module order (dependencies come first)
const MODULE_ORDER = [
  'src/js/constants.js',
  'src/js/db.js',
  'src/js/charts.js',
  'src/js/modal.js',
  'src/js/utils.js',
  'src/js/state.js',
  'src/js/pdfParser.js',
  'src/js/views/dashboard.js',
  'src/js/views/transactions.js',
  'src/js/views/recurring.js',
  'src/js/views/charts.js',
  'src/js/views/import.js',
  'src/js/views/settings.js',
  'src/js/forms/transaction.js',
  'src/js/forms/batch.js',
  'src/js/forms/split.js',
  'src/js/router.js',
  'src/js/app.js',
];

function stripImportsExports(code) {
  return code
    // Remove import statements (single and multi-line)
    .replace(/^\s*import\s+\{[^}]*\}\s+from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*import\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*import\s+\w+\s+from\s+['"][^'"]+['"];?\s*$/gm, '')
    // Remove "export " prefix but keep the declaration
    .replace(/^\s*export\s+(const|let|var|function|class|async\s+function)\s/gm, '$1 ')
    // Remove "export { ... }" and "export { ... } from ..."
    .replace(/^\s*export\s+\{[^}]*\}\s*(from\s+['"][^'"]+['"])?\s*;?\s*$/gm, '')
    // Remove "export default"
    .replace(/^\s*export\s+default\s+/gm, '')
    // Remove standalone 'use strict' (we'll add one at the top)
    .replace(/^\s*'use strict'\s*;?\s*$/gm, '')
    // Clean up excessive blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Read HTML template from src/
let html = fs.readFileSync(path.join(SRC, 'haushaltsbuch.html'), 'utf-8');

// Bundle all JS modules
// Modules whose exports are only consumed internally (not by app.js event handlers)
// don't need global exposure. Leaf modules (constants, db, charts, modal, utils) are
// consumed by everything, so they stay in global scope.
// These modules stay in global scope (no IIFE wrapping).
// All others get IIFE-wrapped, with exported functions assigned to global vars.
const GLOBAL_SCOPE = new Set([
  'src/js/constants.js', 'js/db.js', 'js/charts.js', 'js/modal.js',
  'src/js/utils.js', 'js/state.js', 'js/router.js', 'js/app.js',
]);

const jsChunks = MODULE_ORDER.map(modPath => {
  const filePath = path.join(ROOT, modPath);
  if (!fs.existsSync(filePath)) {
    console.warn(`  Warning: ${modPath} not found, skipping`);
    return '';
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  let stripped = stripImportsExports(raw);

  // Wrap non-global modules in IIFE to avoid name collisions
  if (!GLOBAL_SCOPE.has(modPath)) {
    // Find all function declarations and top-level const/let assignments to expose
    const exportedNames = [];
    // Match "function name(" or "async function name("
    for (const m of raw.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) {
      exportedNames.push(m[1]);
    }
    // Match "export let name" or "export const name"
    for (const m of raw.matchAll(/export\s+(?:let|const)\s+(\w+)/g)) {
      exportedNames.push(m[1]);
    }
    // Match "export { name, ... }"
    for (const m of raw.matchAll(/export\s*\{([^}]+)\}/g)) {
      m[1].split(',').map(s => s.trim()).filter(Boolean).forEach(n => exportedNames.push(n));
    }

    const unique = [...new Set(exportedNames)];
    const expose = unique.length
      ? `\n${unique.map(n => `window.${n} = ${n};`).join('\n')}`
      : '';
    stripped = `(function(){${stripped}${expose}\n})();`;
  }

  return `// ── ${modPath} ${'─'.repeat(Math.max(0, 55 - modPath.length))}─\n${stripped}`;
});

// Escape </script sequences that would prematurely close <script> tag in HTML
// Only escape </script and </style, not all </ (which breaks regex literals like /<\/g)
let rawJs = jsChunks.filter(Boolean).join('\n\n');
rawJs = rawJs.replace(/<\/script/gi, '<\\/script').replace(/<\/style/gi, '<\\/style');
const bundledJs = `'use strict';\n\n${rawJs}`;

// Replace the module script tag with inline script
// Use split/join instead of replace to avoid $ replacement patterns in bundledJs
const marker = '<script type="module" src="js/app.js"></script>';
const idx = html.indexOf(marker);
if (idx >= 0) {
  html = html.substring(0, idx) + '<script>\n' + bundledJs + '\n<\/script>' + html.substring(idx + marker.length);
} else {
  console.error('ERROR: Could not find module script tag in HTML');
  process.exit(1);
}

// Write bundled HTML to root
fs.writeFileSync(path.join(ROOT, 'haushaltsbuch.html'), html, 'utf-8');

// Summary
const htmlSize = fs.statSync(path.join(ROOT, 'haushaltsbuch.html')).size;
console.log('Build complete!');
console.log(`  haushaltsbuch.html  (${(htmlSize / 1024).toFixed(1)} KB)`);
console.log('');
console.log('Open haushaltsbuch.html directly in your browser (Doppelklick!)');
