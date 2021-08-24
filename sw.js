import { sw_log, sw_error_log } from './loggers';
import { get, set } from './db';
import { Metrics, avgDiff } from './Metrics';
import { validSettings } from './index';
import { ourMD5 } from './md5';

// Grab settings from IDB set during activation.
// Do this before registering our event listeners.
let settings = {};
self.addEventListener('activate', async () => {
  try {
    await Promise.all(
      validSettings.map(async (setting) => {
        const result = await get('settings', setting);
        settings[setting] = result;
      })
    );
    sw_log('Service worker settings initialized.');
  } catch (err) {
    sw_error_log('Could not initialize service worker settings.');
  }
});

// Listen for fetch events, and for those to the /graphql endpoint,
// run our caching logic  , passing in information about the request.
self.addEventListener('fetch', async (fetchEvent) => {
  const metrics = new Metrics();
  const clone = fetchEvent.request.clone();
  const { url, method, headers } = clone;
  const urlObject = new URL(url);
  if (urlObject.pathname.endsWith('/graphql')) {
    async function fetchAndGetResponse() {
      try {
        const body = await getBody(fetchEvent);
        const [queryResult, hashedQuery] = await runCachingLogic(
          urlObject,
          method,
          headers,
          body,
          metrics
        );
        metrics.save(hashedQuery);
        return new Response(JSON.stringify(queryResult), { status: 200 });
      } catch (err) {
        sw_error_log('There was an error in the caching logic!', err.message);
        return await fetch(clone);
      }
    }
    fetchEvent.respondWith(fetchAndGetResponse());
  }
});

// Gets the body from the request and returns it
const getBody = async (e) => {
  const blob = await e.request.blob();
  const body = await blob.text();
  return body;
};

// The main wrapper function for our caching solution
async function runCachingLogic(urlObject, method, headers, body, metrics) {
  let query = method === 'GET' ? getQueryFromUrl(urlObject) : body;
  const hashedQuery = ourMD5(query);
  const cachedData = await checkQueryExists(hashedQuery);
  if (cachedData && checkCachedQueryIsFresh(cachedData)) {
    metrics.isCached = true;
    sw_log('Fetched from cache');
    executeAndUpdate(hashedQuery, [urlObject, method, headers, body, metrics]);
    return [cachedData, hashedQuery];
  } else {
    const data = await executeAndUpdate(hashedQuery, [
      urlObject,
      method,
      headers,
      body,
      metrics,
    ]);
    return [data, hashedQuery];
  }
}

// If a GET method, we need to pull the query off the url
// and use that instead of the POST body
// EG: 'http://localhost:4000/graphql?query=query\{human(input:\{id:"1"\})\{name\}\}'
function getQueryFromUrl(urlObject) {
  const query = decodeURI(urlObject.searchParams.get('queries', 'query'));
  if (!query)
    throw new Error(`This HTTP GET request is not a valid GQL request: ${url}`);
  return query;
}

// Checks for existence of hashed query in IDB
async function checkQueryExists(hashedQuery) {
  try {
    return await get('queries', hashedQuery);
  } catch (err) {
    sw_error_log('Error getting query from IDB', err.message);
  }
}

// Returns false if the cacheExpirationLimit has been set,
// and the lastApiCall occured more than cacheExpirationLimit milliseconds ago
function checkCachedQueryIsFresh({ lastApiCall }) {
  const { cacheExpirationLimit } = settings;
  if (!cacheExpirationLimit) return true;
  return Date.now() - lastApiCall < cacheExpirationLimit;
}

// If the query doesn't exist in the cache, then execute
// the query and return the result.
async function executeQuery(urlObject, method, headers, body, metrics) {
  try {
    const options = { method, headers };
    if (method === 'POST') {
      options.body = body;
    }
    const response = await fetch(urlObject.href, options);
    const data = await response.json();
    return data;
  } catch (err) {
    sw_error_log('Error executing query', err.message);
  }
}

// Write the result into cache
function writeToCache(hash, queryResult) {
  if (!queryResult) return;
  set('queries', hash, { data: queryResult, lastApiCall: Date.now() })
    .then(() => sw_log('Wrote response to cache.'))
    .catch((err) =>
      sw_error_log('Could not write response to cache', err.message)
    );
}

/*
Cache-update functionality (part of config object)
When a request comes in from the client, deliver the content from the cache (if possible) as usual.
In addition to the normal logic, even if the response is already in the cache, follow through with 
sending the request to the server, updating the cache upon receipt of response.
*/

async function executeAndUpdate(hashedQuery, queryParams) {
  const data = await executeQuery(...queryParams);
  // currently not doing any type of check to see if "new" result is actually different from old data
  writeToCache(hashedQuery, data);
  return data;
}
