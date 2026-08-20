// Persists an uploaded File in IndexedDB, keyed by a generated assetId that
// travels in the /editor URL (?assetId=...). Unlike sessionStorage/a
// module-level variable, this survives a hard refresh of /editor — IndexedDB
// natively supports storing Blob/File values, so no base64 encoding is
// needed and there's no meaningful size ceiling for our 25MB/200MB caps.
const DB_NAME = "creativeflow-assets";
const STORE_NAME = "pending-assets";
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAsset(id: string, file: File): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(file, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadAsset(id: string): Promise<File | null> {
  const db = await openDatabase();
  try {
    const stored = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (stored instanceof File) return stored;
    if (stored instanceof Blob) return new File([stored], "asset", { type: stored.type });
    return null;
  } finally {
    db.close();
  }
}
