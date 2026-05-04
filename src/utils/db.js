const DB_NAME = 'guidepage_db';
const DB_VERSION = 1;

export const STORES = {
  STATE: 'state',
  GUIDE_LIST: 'guide_list',
  OPINIONS: 'opinions',
  EXCEL: 'excel',
};

let _db = null;

const openDB = () => {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      Object.values(STORES).forEach((name) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' });
        }
      });
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
};

export const dbGet = async (storeName, key) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result ? req.result.data : undefined);
    req.onerror = () => reject(req.error);
  });
};

export const dbSet = async (storeName, key, value) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put({ id: key, data: value });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const dbDelete = async (storeName, key) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const clearAllStores = async () => {
  const db = await openDB();
  const storeNames = Object.values(STORES);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite');
    let pending = storeNames.length;
    storeNames.forEach((name) => {
      const req = tx.objectStore(name).clear();
      req.onsuccess = () => { if (--pending === 0) resolve(); };
      req.onerror = () => reject(req.error);
    });
  });
};

// Recoil atom effect for IndexedDB persistence (JSON-serializable values)
export const idbEffect = (storeName, key) => ({ setSelf, onSet }) => {
  dbGet(storeName, key).then((saved) => {
    if (saved !== undefined) setSelf(saved);
  }).catch(() => {});

  onSet((newValue, _, isReset) => {
    if (isReset) {
      dbDelete(storeName, key).catch(() => {});
    } else {
      dbSet(storeName, key, newValue).catch(() => {});
    }
  });
};
