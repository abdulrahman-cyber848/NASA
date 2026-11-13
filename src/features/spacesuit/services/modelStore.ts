import { KEYS, migrateLegacyModelDb } from '@/lib/brand';

// Persistent, browser-local storage for a user-supplied spacesuit mesh.
//
// The Smithsonian Armstrong A7L scan cannot be fetched by this server (Cloudflare
// Turnstile + WAF), so the user supplies their own download. Storing it in
// IndexedDB means they load it ONCE and it survives reloads, navigation and new
// sessions — the file never leaves the browser and is never uploaded anywhere.

const DB_NAME = KEYS.modelsDb;
const STORE = 'meshes';
const KEY = 'spacesuit';
const DB_VERSION = 1;

export interface StoredMesh {
  blob: Blob;
  name: string;
  savedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

/** Persist the mesh so it is still there after a reload. Resolves false if the
 *  browser refuses (private mode / quota) — the session still works in memory. */
export async function saveMesh(blob: Blob, name: string): Promise<boolean> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const record: StoredMesh = { blob, name, savedAt: Date.now() };
      tx.objectStore(STORE).put(record, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('write failed'));
      tx.onabort = () => reject(tx.error ?? new Error('write aborted'));
    });
    db.close();
    return true;
  } catch {
    return false;
  }
}

export async function loadMesh(): Promise<StoredMesh | null> {
  await migrateLegacyModelDb();
  try {
    const db = await openDB();
    const rec = await new Promise<StoredMesh | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as StoredMesh) ?? null);
      req.onerror = () => reject(req.error ?? new Error('read failed'));
    });
    db.close();
    if (!rec || !(rec.blob instanceof Blob)) return null;
    return rec;
  } catch {
    return null;
  }
}

export async function clearMesh(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('delete failed'));
    });
    db.close();
  } catch {
    /* nothing persisted — ignore */
  }
}
