import { get } from 'idb-keyval';
import CryptoJS from 'crypto-js';

const getBody = async (e) => {
  const blob = await e.request.blob();
  const body = await blob.text();
  return body;
};

self.addEventListener('fetch', async (fetchEvent) => {
  const { url, method, headers } = fetchEvent.request; // headers is an iterable...
  if (url.endsWith('/graphql')) {
    const body = await getBody(fetchEvent);
    const queryResult = await runCachingLogic(url, method, headers, body);
    fetchEvent.respondWith(queryResult);
  }
});

async function runCachingLogic(url, method, headers, body) {
  const doesExist = await exists(body);
  if (doesExist) {
    return doesExist;
  } else {
    await executeQuery(url, method, headers, body);
  }
}

async function executeQuery(url, method, headers, body) { 
  return fetch(url, { method, headers, body })
    .then(r => r.json())
    .then(data => {
      return data
    })
    .catch(err => {
      console.error("ERROR IN SW FETCH: ", err);
    })
}

function exists (query) {
  const hash = CryptoJS.MD5(query); //hashes query using CryptoJS.Md5
  return get(hash.toString(CryptoJS.enc.hex)) //encodes hash from hex format
    .then((val) => {
      if (val) { //checks to see if value exists within IndexDB, if it doesn't, idb-keyval will return undefined for us
        return val;
      }
    })
    .catch(err => {
      console.log(`Error: ${err}`)
    })
};