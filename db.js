import { openDB } from 'idb';

/* Creates three new IDB object stores:
 * Queries (stores actual data)
 * Metrics (stores metadata about queries)
 * Settings (stores user settings for service worker)
 */
const dbPromise = openDB('gql-store', 1, {
  upgrade(db) {
    db.createObjectStore('metrics');
    db.createObjectStore('queries');
    db.createObjectStore('settings');
    db.createObjectStore('schema');
  },
});

/* Functions for interacting with metrics ObjectStore.
 * These functions allow the service worker to get and set data.
 */
export async function get(name, key) {
  return (await dbPromise).get(name, key);
}

export async function del(name, key) {
  return (await dbPromise).delete(name, key);
}

export async function set(name, key, val) {
  return (await dbPromise).put(name, val, key);
}

export async function clear(name) {
  return (await dbPromise).clear(name);
}

export async function setMany(objectStore, keyValuePairs) {
  const db = await openDB('gql-store');
  const transaction = db.transaction([objectStore], 'readwrite');
  await Promise.all(
    keyValuePairs.map(([val, key]) => transaction.store.put(key, val)),
    transaction.done
  );
}

export async function getAll(name) {
  return (await dbPromise).getAll(name);
}

export async function keys(name) {
  return (await dbPromise).getAllKeys(name);
}
