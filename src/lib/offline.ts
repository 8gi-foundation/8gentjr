// ---------------------------------------------------------------------------
// Offline-first IndexedDB wrapper for 8gent Jr
// Raw IDB — no library dependencies
// ---------------------------------------------------------------------------

const DB_NAME = "8gentjr";
const DB_VERSION = 1;
const STORES = ["cards", "grids", "settings"] as const;

export type StoreName = (typeof STORES)[number];

// ---------------------------------------------------------------------------
// Card type (matches AAC card shape used across the app)
// ---------------------------------------------------------------------------
export interface CachedCard {
  id: string;
  label: string;
  emoji?: string;
  category?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Open / upgrade the database
// ---------------------------------------------------------------------------
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store);
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

/** Put a value into a store by key. */
export async function put<T>(store: StoreName, key: string, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/** Get a value from a store by key. Returns undefined if not found. */
export async function get<T>(store: StoreName, key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => {
      db.close();
      resolve(req.result as T | undefined);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

// ---------------------------------------------------------------------------
// Card-specific helpers
// ---------------------------------------------------------------------------

const CARDS_KEY = "aac-cards";

/** Cache an array of AAC cards to IndexedDB. */
export async function cacheCards(cards: CachedCard[]): Promise<void> {
  await put("cards", CARDS_KEY, cards);
}

/** Retrieve cached AAC cards. Returns empty array if nothing cached. */
export async function getCachedCards(): Promise<CachedCard[]> {
  const cards = await get<CachedCard[]>("cards", CARDS_KEY);
  return cards ?? [];
}

// ---------------------------------------------------------------------------
// Online / offline detection
// ---------------------------------------------------------------------------

/** Synchronous snapshot of current connectivity. */
export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}
