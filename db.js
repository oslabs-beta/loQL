import { openDB } from 'idb';

// Creates two new IDB object stores, one for metrics and one for queries
const dbPromise = openDB('gql-store', 1, {
  upgrade(db) {
    db.createObjectStore('metrics');
    db.createObjectStore('queries');
    db.createObjectStore('settings');
  },
});

// Functions for interacting with metrics ObjectStore
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

export async function setMany(name, objectStore, keyValuePairs) {
  const db = await openDB(name);
  const transaction = db.transaction(objectStore, 'readwrite');
  await Promise.all(
    keyValuePairs.map(([val, key]) => transaction.store.put(key, val)),
    transaction.done
  );
}

export async function getAll (name) {
  return (await dbPromise).getAll(name);
}

export async function keys(name) {
  return (await dbPromise).getAllKeys(name);
}

