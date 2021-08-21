import { openDB } from 'idb';

// Creates two new IDB object stores, one for metrics and one for queries
const dbPromise = openDB('gql-store', 1, {
  upgrade(db) {
    db.createObjectStore('metrics');
    db.createObjectStore('queries')
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

export async function keys(name) {
  return (await dbPromise).getAllKeys(name);
}