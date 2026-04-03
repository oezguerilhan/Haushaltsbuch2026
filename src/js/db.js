'use strict';

let _db = null;
let _useLocalStorage = false;

export function openDB() {
  if (_db) return Promise.resolve(_db);
  if (_useLocalStorage) return Promise.resolve(null);
  return new Promise((res) => {
    try {
      const r = indexedDB.open('hb3_v1', 1);
      r.onupgradeneeded = e => e.target.result.createObjectStore('kv');
      r.onsuccess = e => { _db = e.target.result; res(_db); };
      r.onerror = () => { _useLocalStorage = true; res(null); };
    } catch {
      _useLocalStorage = true;
      res(null);
    }
  });
}

export async function dbGet(k) {
  if (_useLocalStorage) {
    try { const v = localStorage.getItem('hb_' + k); return v ? JSON.parse(v) : undefined; } catch { return undefined; }
  }
  const db = await openDB();
  if (!db) { _useLocalStorage = true; return dbGet(k); }
  return new Promise((res) => {
    try {
      const r = db.transaction('kv', 'readonly').objectStore('kv').get(k);
      r.onsuccess = () => res(r.result);
      r.onerror = () => { _useLocalStorage = true; res(dbGet(k)); };
    } catch { _useLocalStorage = true; res(dbGet(k)); }
  });
}

export async function dbSet(k, v) {
  if (_useLocalStorage) {
    try { localStorage.setItem('hb_' + k, JSON.stringify(v)); } catch { /* storage full */ }
    return;
  }
  const db = await openDB();
  if (!db) { _useLocalStorage = true; return dbSet(k, v); }
  return new Promise((res) => {
    try {
      const r = db.transaction('kv', 'readwrite').objectStore('kv').put(v, k);
      r.onsuccess = () => res();
      r.onerror = () => { _useLocalStorage = true; dbSet(k, v).then(res); };
    } catch { _useLocalStorage = true; dbSet(k, v).then(res); }
  });
}
