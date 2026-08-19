/* ==========================================================================
   db.js — IndexedDB wrapper for Mobile Repair POS
   All data lives locally in IndexedDB. No cloud, no network required.
   ========================================================================== */

const DB_NAME = 'mobileRepairPOS';
const DB_VERSION = 1;

const STORES = {
  customers: 'id',
  jobOrders: 'id',
  technicians: 'id',
  parts: 'id',
  suppliers: 'id',
  payments: 'id',
  settings: 'key',
  activityLogs: 'id'
};

let _db = null;

/** Open (or create/upgrade) the database. Resolves once ready. */
function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db);

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains('customers')) {
        const s = db.createObjectStore('customers', { keyPath: 'id' });
        s.createIndex('name', 'name', { unique: false });
        s.createIndex('mobile', 'mobile', { unique: false });
      }

      if (!db.objectStoreNames.contains('jobOrders')) {
        const s = db.createObjectStore('jobOrders', { keyPath: 'id' });
        s.createIndex('jobOrderNumber', 'jobOrderNumber', { unique: true });
        s.createIndex('customerId', 'customerId', { unique: false });
        s.createIndex('status', 'status', { unique: false });
        s.createIndex('imei', 'imei', { unique: false });
        s.createIndex('technicianId', 'technicianId', { unique: false });
        s.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('technicians')) {
        db.createObjectStore('technicians', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('parts')) {
        const s = db.createObjectStore('parts', { keyPath: 'id' });
        s.createIndex('name', 'name', { unique: false });
      }

      if (!db.objectStoreNames.contains('suppliers')) {
        db.createObjectStore('suppliers', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('payments')) {
        const s = db.createObjectStore('payments', { keyPath: 'id' });
        s.createIndex('jobOrderId', 'jobOrderId', { unique: false });
        s.createIndex('date', 'date', { unique: false });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains('activityLogs')) {
        const s = db.createObjectStore('activityLogs', { keyPath: 'id' });
        s.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    req.onsuccess = (e) => {
      _db = e.target.result;
      resolve(_db);
    };

    req.onerror = (e) => reject(e.target.error);
  });
}

function tx(storeName, mode = 'readonly') {
  return _db.transaction(storeName, mode).objectStore(storeName);
}

/* -------------------------- Generic CRUD helpers -------------------------- */

const DB = {
  async init() {
    await openDB();
  },

  add(storeName, obj) {
    return new Promise((resolve, reject) => {
      const req = tx(storeName, 'readwrite').add(obj);
      req.onsuccess = () => resolve(obj);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  put(storeName, obj) {
    return new Promise((resolve, reject) => {
      const req = tx(storeName, 'readwrite').put(obj);
      req.onsuccess = () => resolve(obj);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  get(storeName, key) {
    return new Promise((resolve, reject) => {
      const req = tx(storeName).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  getAll(storeName) {
    return new Promise((resolve, reject) => {
      const req = tx(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const req = tx(storeName, 'readwrite').delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  clear(storeName) {
    return new Promise((resolve, reject) => {
      const req = tx(storeName, 'readwrite').clear();
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  getByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const req = tx(storeName).index(indexName).getAll(value);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  getOneByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const req = tx(storeName).index(indexName).get(value);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  /** Replace an entire store's contents (used by restore). */
  async replaceAll(storeName, records) {
    await this.clear(storeName);
    for (const rec of records) {
      await this.put(storeName, rec);
    }
  },

  storeNames() {
    return Object.keys(STORES);
  }
};

window.DB = DB;
