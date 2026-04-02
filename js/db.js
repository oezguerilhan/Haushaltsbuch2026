'use strict';

let _db = null;

export function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((res, rej) => {
    const r = indexedDB.open('hb3_v1', 1);
    r.onupgradeneeded = e => e.target.result.createObjectStore('kv');
    r.onsuccess = e => { _db = e.target.result; res(_db); };
    r.onerror = e => rej(e.target.error);
  });
}

export async function dbGet(k) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const r = db.transaction('kv', 'readonly').objectStore('kv').get(k);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function dbSet(k, v) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const r = db.transaction('kv', 'readwrite').objectStore('kv').put(v, k);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}
