import { get } from 'idb-keyval';
import CryptoJS from 'crypto-js';

const simpleHash = str => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash; // Convert to 32bit integer
  }
  return new Uint32Array([hash])[0].toString(36);
};

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

function exists (query) {
  const hash = simpleHash(query);
  return get(hash)
    .then((val) => {
      console.log(val);
      if (val) {
        return val;
      }
    })
    .catch(err => {
      console.log(`Error: ${err}`)
    })
} 

async function runCachingLogic(url, method, headers, body) {
  const doesExist = await exists(body);
  if (doesExist) {
    return doesExist;
  } 
}
