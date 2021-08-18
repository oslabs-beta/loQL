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
    const body = await getBody(fetchEvent);
    const queryResult = await runCachingLogic(url, method, headers, body);
    fetchEvent.respondWith(queryResult);
  }
});

// The main wrapper function for our caching solution
async function runCachingLogic(url, method, headers, body) {
  const hashedQuery = hashQuery(body);
  const cachedData = await checkQueryExists(hashedQuery);
  if (cachedData) {
    console.log('Fetched from cache');
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
  console.log(hashedQuery);
  try {
    const val = await get(hashedQuery);
    return val;
  } catch (err) {
    console.error(err);
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
