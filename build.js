#!/usr/bin/env node
'use strict';

/**
 * Build script: bundles all ES modules into a single haushaltsbuch.html
 * that works over file:// protocol (no HTTP server needed).
 *
 * Usage: node build.js
 * Output: dist/haushaltsbuch.html (+ sw.js, manifest.json, icon.svg)
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

// Topologically sorted module order (dependencies come first)
const MODULE_ORDER = [
  'js/constants.js',
  'js/db.js',
  'js/charts.js',
  'js/modal.js',
  'js/utils.js',
  'js/state.js',
  'js/pdfParser.js',
  'js/views/dashboard.js',
  'js/views/transactions.js',
  'js/views/recurring.js',
  'js/views/charts.js',
  'js/views/import.js',
  'js/views/settings.js',
  'js/forms/transaction.js',
  'js/forms/batch.js',
  'js/forms/split.js',
  'js/router.js',
  'js/app.js',
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

// Create dist directory
if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

// Read HTML template
let html = fs.readFileSync(path.join(ROOT, 'haushaltsbuch.html'), 'utf-8');

// Bundle all JS modules
// Modules whose exports are only consumed internally (not by app.js event handlers)
// don't need global exposure. Leaf modules (constants, db, charts, modal, utils) are
// consumed by everything, so they stay in global scope.
const GLOBAL_SCOPE = new Set([
  'js/constants.js', 'js/db.js', 'js/charts.js', 'js/modal.js',
  'js/utils.js', 'js/state.js', 'js/app.js',
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

// Write bundled HTML
fs.writeFileSync(path.join(DIST, 'haushaltsbuch.html'), html, 'utf-8');

// Copy static assets
for (const file of ['manifest.json', 'icon.svg']) {
  const src = path.join(ROOT, file);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(DIST, file));
}

// Write simplified service worker for dist (single-file)
const sw = `// Haushaltsbuch 2026 — Service Worker (bundled)
'use strict';
const CACHE_NAME = 'hb2026-v4';
const APP_SHELL = ['./haushaltsbuch.html', './manifest.json', './icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.protocol === 'chrome-extension:' || url.origin !== self.location.origin) return;
  const isShell = APP_SHELL.some(f => event.request.url.endsWith(f.replace('./', '/')));
  if (isShell || url.pathname === '/' || url.pathname.endsWith('haushaltsbuch.html')) {
    event.respondWith(caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(res => { if (res.ok) { const clone = res.clone(); caches.open(CACHE_NAME).then(c => c.put(event.request, clone)); } return res; }).catch(() => cached);
      return cached || network;
    }));
    return;
  }
  event.respondWith(fetch(event.request).then(res => { if (res.ok) { const clone = res.clone(); caches.open(CACHE_NAME).then(c => c.put(event.request, clone)); } return res; }).catch(() => caches.match(event.request)));
});
`;
fs.writeFileSync(path.join(DIST, 'sw.js'), sw, 'utf-8');

// Summary
const htmlSize = fs.statSync(path.join(DIST, 'haushaltsbuch.html')).size;
console.log('Build complete!');
console.log(`  dist/haushaltsbuch.html  (${(htmlSize / 1024).toFixed(1)} KB)`);
console.log('  dist/sw.js');
console.log('  dist/manifest.json');
console.log('  dist/icon.svg');
console.log('');
console.log('Open dist/haushaltsbuch.html directly in your browser (file:// works!)');
