import { sw_log } from './index';
import { get, set } from 'idb-keyval';
import { MD5, enc } from 'crypto-js';

const getBody = async (e) => {
  const blob = await e.request.blob();
  const body = await blob.text();
  return body;
};

// Listen for fetch events, and for those to the /graphql endpoint,
// run our caching logic, passing in information about the request.
self.addEventListener('fetch', async (fetchEvent) => {
  const { url, method, headers } = fetchEvent.request;
  if (url.endsWith('/graphql')) {
    async function fetchAndGetResponse() {
      try {
        const body = await getBody(fetchEvent);
        const queryResult = await runCachingLogic(url, method, headers, body);
        return new Response(JSON.stringify(queryResult), { status: 200 });
      } catch (err) {
        sw_log('Service worker failure!');
      }
    }
    fetchEvent.respondWith(fetchAndGetResponse());
  }
});

// The main wrapper function for our caching solution
async function runCachingLogic(url, method, headers, body) {
  const hashedQuery = hashQuery(body);
  const cachedData = await checkQueryExists(hashedQuery);
  if (cachedData) {
    sw_log('Fetched from cache');
    console.log(cachedData);
    return cachedData;
  } else {
    const data = await executeQuery(url, method, headers, body);
    writeToCache(hashedQuery, data);
    return data;
  }
}

// Hash the query and convert to hex string
function hashQuery(clientQuery) {
  const hashedQuery = MD5(JSON.stringify(clientQuery));
  return hashedQuery.toString(enc.hex);
}

// Checks for existence of hashed query in IDB
async function checkQueryExists(hashedQuery) {
  sw_log(hashedQuery);
  try {
    const val = await get(hashedQuery);
    return val;
  } catch (err) {
    console.error(err);
  }
}

// If the query doesn't exist in the cache, then execute
// the query and return the result.
async function executeQuery(url, method, headers, body) {
  try {
    const response = await fetch(url, { method, headers, body });
    const data = await response.json();
    return data;
  } catch (err) {
    console.error(err);
  }
}

// Write the result into cache
function writeToCache(hash, queryResult) {
  set(hash, queryResult)
    .then(() => console.log('It worked!'))
    .catch((err) => console.log('It failed!', err));

}
