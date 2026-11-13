// Single source of truth for the product name and its storage identifiers.
//
// The site was previously called LUNASCOPE. Renaming must not silently discard
// anyone's preferences, guest access, saved simulation config or uploaded 3D
// model, so the legacy keys below are migrated forward once on first load.

export const BRAND = 'LunaNav';
export const BRAND_AR = 'لوناناف';

/** Current storage identifiers. */
export const KEYS = {
  guest: 'lunanav:guest',
  prefs: 'lunanav:prefs:v1',
  dustConfig: 'lunanav-dust-config',
  modelsDb: 'lunanav-models',
  session: 'lunanav_session',
} as const;

/** Identifiers used before the rename. Kept only for one-time migration. */
export const LEGACY = {
  guest: 'lunascope:guest',
  prefs: 'lunascope:prefs:v1',
  dustConfig: 'lunascope-dust-config',
  modelsDb: 'lunascope-models',
  session: 'lunascope_session',
} as const;

let migrated = false;

/**
 * Copy any pre-rename localStorage values onto the new keys, then remove the
 * old ones. Never overwrites a value that already exists under the new key.
 * Safe to call repeatedly; runs at most once per page load.
 */
export function migrateLegacyStorage(): void {
  if (migrated || typeof window === 'undefined') return;
  migrated = true;
  try {
    for (const k of ['guest', 'prefs', 'dustConfig'] as const) {
      const oldKey = LEGACY[k];
      const newKey = KEYS[k];
      const oldVal = window.localStorage.getItem(oldKey);
      if (oldVal === null) continue;
      if (window.localStorage.getItem(newKey) === null) {
        window.localStorage.setItem(newKey, oldVal);
      }
      window.localStorage.removeItem(oldKey);
    }
  } catch {
    /* storage blocked (private mode) — nothing to migrate */
  }
}

/**
 * Move a persisted spacesuit mesh from the old IndexedDB database to the new
 * one. Resolves quietly if there is nothing to move or storage is unavailable.
 */
export async function migrateLegacyModelDb(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const readLegacy = () => new Promise<unknown | null>(resolve => {
    let req: IDBOpenDBRequest;
    try { req = indexedDB.open(LEGACY.modelsDb); } catch { resolve(null); return; }
    req.onupgradeneeded = () => {
      // Database did not exist: abort so we do not create an empty legacy DB.
      try { req.transaction?.abort(); } catch { /* ignore */ }
      resolve(null);
    };
    req.onerror = () => resolve(null);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('meshes')) { db.close(); resolve(null); return; }
      try {
        const tx = db.transaction('meshes', 'readonly');
        const get = tx.objectStore('meshes').get('spacesuit');
        get.onsuccess = () => { db.close(); resolve(get.result ?? null); };
        get.onerror = () => { db.close(); resolve(null); };
      } catch { db.close(); resolve(null); }
    };
  });

  const record = await readLegacy();
  if (!record) return;
  try {
    const db = await new Promise<IDBDatabase | null>(resolve => {
      const req = indexedDB.open(KEYS.modelsDb, 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains('meshes')) d.createObjectStore('meshes');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    if (!db) return;
    await new Promise<void>(resolve => {
      const tx = db.transaction('meshes', 'readwrite');
      tx.objectStore('meshes').put(record, 'spacesuit');
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
    db.close();
    try { indexedDB.deleteDatabase(LEGACY.modelsDb); } catch { /* ignore */ }
  } catch {
    /* leave the legacy record in place rather than losing it */
  }
}
