'use strict';

export function svgGrouped(data, { h = 220, keys = [], colors = [], lkey = 'label' } = {}) {
  if (!data.length || !keys.length) return noData();
  const max = Math.max(...data.flatMap(d => keys.map(k => d[k] || 0)), 1);
  const pL = 48, pB = 28, pT = 14, pR = 8, bw = 14, bg = 4, gg = 10;
  const gw = keys.length * (bw + bg) - bg;
  const totalW = data.length * (gw + gg) + pL + pR;
  const ch = h - pT - pB;
  let bars = '', labs = '', grid = '';
  for (let i = 0; i <= 4; i++) { const y = pT + ch * (1 - i / 4); const v = max * i / 4; const l = v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v) + '€'; grid += `<line x1="${pL}" y1="${y.toFixed(1)}" x2="${totalW - pR}" y2="${y.toFixed(1)}" stroke="#2a251e" stroke-width="1"/><text x="${pL - 4}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#7a7060" font-size="9">${l}</text>`; }
  data.forEach((d, i) => { const gx = pL + gg / 2 + i * (gw + gg); keys.forEach((k, j) => { const bh = Math.max((d[k] || 0) / max * ch, 1); bars += `<rect x="${(gx + j * (bw + bg)).toFixed(1)}" y="${(pT + ch - bh).toFixed(1)}" width="${bw}" height="${bh.toFixed(1)}" fill="${colors[j] || '#888'}" rx="2"/>`; }); labs += `<text x="${(gx + gw / 2).toFixed(1)}" y="${h - 6}" text-anchor="middle" fill="#7a7060" font-size="10">${d[lkey] || ''}</text>`; });
  return `<svg viewBox="0 0 ${totalW} ${h}" style="width:100%;height:${h}px">${grid}${bars}${labs}</svg>`;
}

export function svgBars(data, { h = 180, singleColor = '#e8a020', lkey = 'label', vkey = 'value' } = {}) {
  if (!data.length) return noData();
  const max = Math.max(...data.map(d => d[vkey] || 0), 1);
  const pL = 48, pB = 28, pT = 14, pR = 8, bw = 28, bg = 10;
  const totalW = data.length * (bw + bg) + pL + pR + bg;
  const ch = h - pT - pB; let bars = '', labs = '', grid = '';
  for (let i = 0; i <= 4; i++) { const y = pT + ch * (1 - i / 4); const v = max * i / 4; const l = v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v) + '€'; grid += `<line x1="${pL}" y1="${y.toFixed(1)}" x2="${totalW - pR}" y2="${y.toFixed(1)}" stroke="#2a251e" stroke-width="1"/><text x="${pL - 4}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#7a7060" font-size="9">${l}</text>`; }
  data.forEach((d, i) => { const x = pL + bg + i * (bw + bg); const bh = Math.max((d[vkey] || 0) / max * ch, 1); bars += `<rect x="${x}" y="${(pT + ch - bh).toFixed(1)}" width="${bw}" height="${bh.toFixed(1)}" fill="${singleColor}" rx="3"/>`; labs += `<text x="${(x + bw / 2).toFixed(1)}" y="${h - 6}" text-anchor="middle" fill="#7a7060" font-size="9">${String(d[lkey] || '').slice(0, 8)}</text>`; });
  return `<svg viewBox="0 0 ${totalW} ${h}" style="width:100%;height:${h}px">${grid}${bars}${labs}</svg>`;
}

export function svgDonut(items, { r = 68, sw = 22, w = 150, h = 150 } = {}) {
  if (!items.length) return noData();
  const total = items.reduce((s, d) => s + (d.value || 0), 0); if (!total) return noData();
  const circ = 2 * Math.PI * r; let off = circ / 4, arcs = '';
  items.forEach(d => { const dash = circ * d.value / total; arcs += `<circle cx="${w / 2}" cy="${h / 2}" r="${r}" fill="none" stroke="${d.color}" stroke-width="${sw}" stroke-dasharray="${dash.toFixed(2)} ${(circ - dash).toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"/>`; off -= dash; });
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${arcs}</svg>`;
}

export function svgLine(data, { h = 200, keys = [], colors = [], lkey = 'label' } = {}) {
  if (!data.length || !keys.length) return noData();
  const all = data.flatMap(d => keys.map(k => d[k] || 0)); const max = Math.max(...all, 1);
  const pL = 48, pB = 28, pT = 14, pR = 14, cw = 580 - pL - pR, ch = h - pT - pB; const step = cw / Math.max(data.length - 1, 1);
  let lines = '', dots = '', grid = '', labs = '';
  for (let i = 0; i <= 4; i++) { const y = pT + ch * (1 - i / 4); const v = max * i / 4; const l = v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v) + '€'; grid += `<line x1="${pL}" y1="${y.toFixed(1)}" x2="${580 - pR}" y2="${y.toFixed(1)}" stroke="#2a251e" stroke-width="1"/><text x="${pL - 4}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#7a7060" font-size="9">${l}</text>`; }
  data.forEach((d, i) => { const x = pL + i * step; labs += `<text x="${x.toFixed(1)}" y="${h - 6}" text-anchor="middle" fill="#7a7060" font-size="10">${d[lkey] || ''}</text>`; });
  keys.forEach((k, ki) => { const pts = data.map((d, i) => [pL + i * step, pT + ch * (1 - (d[k] || 0) / max)]); const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' '); lines += `<path d="${path}" fill="none" stroke="${colors[ki]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`; pts.forEach(p => { dots += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="${colors[ki]}"/>`; }); });
  return `<svg viewBox="0 0 580 ${h}" style="width:100%;height:${h}px">${grid}${lines}${dots}${labs}</svg>`;
}

export function noData() {
  return '<div class="empty" style="padding:32px;font-size:12px">Keine Daten vorhanden</div>';
}

export function legend(items) {
  return `<div style="display:flex;flex-wrap:wrap;gap:8px 16px;margin-top:10px">${items.map(i => `<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted)"><span class="cdot" style="background:${i.color}"></span>${i.label}</div>`).join('')}</div>`;
}
