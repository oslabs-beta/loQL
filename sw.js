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

function exists (query) {
  const hash = CryptoJS.MD5(query);
  return get(hash.toString(CryptoJS.enc.hex))
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
