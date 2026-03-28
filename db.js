// db.js — Couche IndexedDB générique
'use strict';

const DB_VERSION = 3;
let _db = null;
let _enterpriseId = null;

const STORES = [
  { name: 'produits',           keyPath: 'id',  indexes: [] },
  { name: 'ventes',             keyPath: 'id',  indexes: [{ name: 'date', key: 'date' }] },
  { name: 'depenses',           keyPath: 'id',  indexes: [{ name: 'date', key: 'date' }] },
  { name: 'credits',            keyPath: 'id',  indexes: [] },
  { name: 'clients',            keyPath: 'id',  indexes: [] },
  { name: 'proformas',          keyPath: 'id',  indexes: [] },
  { name: 'stockMovements',     keyPath: 'id',  indexes: [{ name: 'productId', key: 'productId' }] },
  { name: 'amortizedExpenses',  keyPath: 'id',  indexes: [] },
  { name: 'config',             keyPath: 'key', indexes: [] },
  { name: 'logs',               keyPath: 'id',  indexes: [] },
  { name: 'pendingSync',        keyPath: 'id',  indexes: [] },
];

window.DB = {
  async init(enterpriseId) {
    _enterpriseId = enterpriseId;
    const dbName = `enterpriseDB_${enterpriseId}`;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        for (const store of STORES) {
          if (!db.objectStoreNames.contains(store.name)) {
            const os = db.createObjectStore(store.name, { keyPath: store.keyPath });
            for (const idx of store.indexes) {
              os.createIndex(idx.name, idx.key, { unique: false });
            }
          } else {
            const os = e.target.transaction.objectStore(store.name);
            for (const idx of store.indexes) {
              if (!os.indexNames.contains(idx.name)) {
                os.createIndex(idx.name, idx.key, { unique: false });
              }
            }
          }
        }
      };
      req.onsuccess = (e) => { _db = e.target.result; resolve(); };
      req.onerror = (e) => reject(e.target.error);
    });
  },

  _tx(store, mode = 'readonly') {
    return _db.transaction(store, mode).objectStore(store);
  },

  async getAll(store) {
    return new Promise((resolve, reject) => {
      const req = this._tx(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async get(store, key) {
    return new Promise((resolve, reject) => {
      const req = this._tx(store).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async put(store, item) {
    return new Promise((resolve, reject) => {
      const req = this._tx(store, 'readwrite').put(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async putMany(store, items) {
    return new Promise((resolve, reject) => {
      const tx = _db.transaction(store, 'readwrite');
      const os = tx.objectStore(store);
      let i = 0;
      const next = () => {
        if (i >= items.length) return;
        const req = os.put(items[i++]);
        req.onsuccess = next;
        req.onerror = () => reject(req.error);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      next();
    });
  },

  async delete(store, key) {
    return new Promise((resolve, reject) => {
      const req = this._tx(store, 'readwrite').delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async clear(store) {
    return new Promise((resolve, reject) => {
      const req = this._tx(store, 'readwrite').clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async getByIndex(store, indexName, value) {
    return new Promise((resolve, reject) => {
      const idx = this._tx(store).index(indexName);
      const req = idx.getAll(value);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async count(store) {
    return new Promise((resolve, reject) => {
      const req = this._tx(store).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async replaceAll(store, items) {
    await this.clear(store);
    if (items && items.length > 0) await this.putMany(store, items);
  },

  // Config shortcuts
  async getConfig() {
    const c = await this.get('config', 'main');
    return c ? c.data : null;
  },

  async saveConfig(data) {
    await this.put('config', { key: 'main', data });
  },

  // Log avec trim automatique à 2000 entrées
  async addLog(log) {
    await this.put('logs', log);
    const all = await this.getAll('logs');
    if (all.length > 2000) {
      all.sort((a, b) => a.timestamp < b.timestamp ? -1 : 1);
      const toDelete = all.slice(0, all.length - 2000);
      for (const l of toDelete) await this.delete('logs', l.id);
    }
  },

  // PendingSync queue
  async addPending(item) {
    await this.put('pendingSync', item);
  },

  async flushPending() {
    const items = await this.getAll('pendingSync');
    await this.clear('pendingSync');
    return items;
  },

  async getDBSize() {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      return est.usage || 0;
    }
    return 0;
  }
};
