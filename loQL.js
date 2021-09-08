import { sw_log, sw_error_log } from './helpers/loggers';
import { get, set, setMany } from './helpers/initializeIndexDb';
import { Metrics } from './helpers/metrics';
import { validSettings } from './index';
import { ourMD5 } from './helpers/md5';
import { parse, visit } from 'graphql/language';

/*
 * Grab settings from IDB set during activation.
 * Do this before registering our event listeners.
 */
const settings = {};
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

/*
 Listen for fetch events, and for those to the /graphql endpoint,
 run our caching logic  , passing in information about the request.
*/
self.addEventListener('fetch', async (fetchEvent) => {
  const metrics = new Metrics();
  const clone = fetchEvent.request.clone();
  const { url, method, headers } = clone;
  const urlObject = new URL(url);
  const { gqlEndpoints } = settings;
  const endpoint = urlObject.origin + urlObject.pathname;

  /* Executes request and delivers response. */
  async function fetchAndGetResponse() {
    try {
      const { data, hashedQuery } = await runCachingLogic({
        urlObject,
        method,
        headers,
        metrics,
        request: fetchEvent.request,
      });
      metrics.save(hashedQuery);
      return new Response(JSON.stringify(data), { status: 200 });
    } catch (err) {
      /* Global error catch. Catches errors and logs more detailed information. */
      sw_error_log('There was an error in the caching logic!', err);
      return await fetch(clone);
    }
  }
  /* Check if the fetch request URL matches a graphQL endpoint as defined in settings. */
  if (gqlEndpoints.indexOf(endpoint) !== -1) {
    fetchEvent.respondWith(fetchAndGetResponse());
  }

});

/* 
 The main wrapper function for our caching solution.
 Generates response data, either through API call or from cache,
 and sends it back. Updates the cache asynchronously after response.
*/
async function runCachingLogic({ urlObject, method, headers, metrics, request }) {
  let query, variables;
  try {
    ({ query, variables } =
      method === 'GET' ? getQueryFromUrl(urlObject) : await getQueryFromBody(request));
  } catch (err) {
    sw_error_log('There was an error getting the query/variables from the request!');
    throw err;
  }

  /* Extract metadata from the query in order to parse through
   * our normalized cache. Skip caching logic if query contains fields that are part of
   * the doNotCache configuration object.
   */
  const metadata = metaParseAST(query);
  if (settings.doNotCacheGlobal && doNotCacheCheck(metadata, urlObject, settings) === true) {
    let responseData;
    try {
      responseData = await executeQuery({
        urlObject,
        method,
        headers,
        body,
      });
    } catch (err) {
      sw_error_log('There was an error getting the response data!');
      throw err;
    }

    return responseData;
  }
  let cachedData;
  let hashedQuery;
  let body;
  try {
    hashedQuery = ourMD5(query.concat(variables)); // NOTE: Variables could be null, that's okay!
    body = JSON.stringify({ query, variables });
    cachedData = await checkQueryExists(hashedQuery);
  } catch (err) {
    sw_error_log('There was an error getting the cached data!');
    throw err;
  }

  /* If the data is in the cache and the cache is fresh, then
   * return the data from the cache. If data is stale or not in cache,
   * then execute the query to the API and update the cache.
   */

  if (cachedData && checkCachedQueryIsFresh(cachedData.lastApiCall)) {
    metrics.isCached = true;
    sw_log('Fetched from cache');
    if (settings.cacheMethod === 'cache-network') {
      executeAndUpdate({ hashedQuery, urlObject, method, headers, body });
    }
    return { data: cachedData, hashedQuery };
  } else {
    const data = await executeAndUpdate({
      hashedQuery,
      urlObject,
      method,
      headers,
      body,
    });
    return { data, hashedQuery };
  }
}

/*
 * Gets the query and variables from a GET request url and returns them.
 * EG: 'http://localhost:4000/graphql?query=query\{human(input:\{id:"1"\})\{name\}\}'
 */
export function getQueryFromUrl(urlObject) {
  const query = urlObject.searchParams.get('query');
  const variables = urlObject.searchParams.get('variables');
  if (!query) throw new Error(`This HTTP GET request is not a valid GQL request: ${urlObject}`);
  return { query, variables };
}

/*
 * Gets the query and variables from a POST request returns them.
 */
export async function getQueryFromBody(request) {
  let query, variables;
  try {
    ({ query, variables } = await request.json());
  } catch (err) {
    sw_error_log('We couldn\'t get the query from the request body!');
    throw err;
  }
  return { query, variables };
}

// Checks for existence of hashed query in IDB.
export async function checkQueryExists(hashedQuery) {
  try {
    return await get('queries', hashedQuery);
  } catch (err) {
    sw_error_log('Error getting query from IDB', err.message);
  }
}

/* Returns false if the cacheExpirationLimit has been set,
 * and the lastApiCall occured more than cacheExpirationLimit milliseconds ago.
 */
export function checkCachedQueryIsFresh(lastApiCall) {
  try {
    const { cacheExpirationLimit } = settings;
    if (!cacheExpirationLimit) return true;
    return Date.now() - lastApiCall < cacheExpirationLimit;
  } catch (err) {
    sw_error_log('Could not check if cached query is fresh inside settings.');
    throw err;
  }
}

/* If the query doesn't exist in the cache, then execute
 * the query and return the result.
 */
export async function executeQuery({ urlObject, method, headers, body }) {
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

/* Write the result of the query to the cache,
 * and add the time it was called to the API for expiration purposes.
 */
export async function writeToCache({ hashedQuery, data }) {
  if (!data) return;
  try {
    await set('queries', hashedQuery, { data, lastApiCall: Date.now() });
    sw_log('Wrote response to cache.');
  } catch (err) {
    sw_error_log('Could not write response to cache!', err.message);
    throw err;
  }
}

/* Logic to write normalized cache data to indexedDB */
export async function writeToNormalizedCache({ normalizedData }) {
  const arrayKeyVals = normalizedData.denestedObjects.map((e) => Object.entries(e)[0]);
  const saveData = await setMany('queries', arrayKeyVals);
  const rootQuery = await get('queries', 'ROOT_QUERY');
  if (!rootQuery) {
    await set('queries', 'ROOT_QUERY', normalizedData.rootQueryObject);
  } else {
    const expandedRoot = {
      ...rootQuery,
      ...normalizedData.rootQueryObject,
    };
    await set('queries', 'ROOT_QUERY', expandedRoot);
  }
}

/*
 * Cache-update functionality (part of configuration object)
 * When a request comes in from the client, deliver the content from the cache (if possible) as usual.
 * In addition to the normal logic, even if the response is already in the cache, follow through with
 * sending the request to the server, updating the cache upon receipt of response.
 */
export async function executeAndUpdate({ hashedQuery, urlObject, method, headers, body }) {
  const data = await executeQuery({ urlObject, method, headers, body });
  writeToCache({ hashedQuery, data });

  /* This feature is still under development. */
  // const normalizedData = normalizeResult(data.data);
  // writeToNormalizedCache({ normalizedData });
  return data;
}

/*
 * Generate an AST from GQL query string, and extract: operation type (query/mutation/subscription/etc), and fields.
 * Returns this metadata as an object (queryCST).
 */
export function metaParseAST(query) {
  const queryCST = { operationType: '', fields: [] };
  const queryAST = parse(query);
  visit(queryAST, {
    OperationDefinition: {
      enter(node) {
        queryCST.operationType = node.operation;
      },
    },
    SelectionSet: {
      enter(node, kind, parent, path, ancestors) {
        const selections = node.selections;
        selections.forEach((selection) => queryCST.fields.push(selection.name.value));
      },
    },
  });
  return queryCST;
}

/*
 * Check metadata object for inclusion of field names that are included in "doNotCache" Configuration Objects.
 * If match is found, execute query and return response to client, bypassing the cache for the entire query.
 */
export function doNotCacheCheck(queryCST, urlObject, settings) {
  const endpoint = urlObject.origin + urlObject.pathname;
  let doNotCache = [];
  const fieldsArray = queryCST.fields;
  if (endpoint in settings.doNotCacheCustom) {
    doNotCache = settings.doNotCacheCustom[endpoint].concat(...settings.doNotCacheGlobal);
  } else {
    doNotCache = settings.doNotCacheGlobal;
  }

  for (const field of fieldsArray) {
    if (doNotCache.includes(field)) return true;
  }

  return false;
}
