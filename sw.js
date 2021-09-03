import { sw_log, sw_error_log } from './loggers';
import { get, set, setMany } from './db';
import { Metrics } from './Metrics';
import { validSettings } from './index';
import { ourMD5 } from './md5';
import { parse, visit } from 'graphql/language';
import { getIntrospectionQuery, buildClientSchema, printSchema } from 'graphql/utilities';
import { normalizeResult } from './normalizeResult';

/*
 * Grab settings from IDB set during activation.
 * Do this before registering our event listeners.
 */
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
  //fetch schema from backend
  /*try {
    fetch("https://rickandmortyapi.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: getIntrospectionQuery() })
    })
      .then(res => res.json())
      .then(res => {
        writeToCache({hashedQuery: 'rickMortyIntrospectionResult', data: res.data});
        //console.log(res);
      })
  } catch (err) {
    console.log('Error performing schema introspection query');
  }*/
  const clientSchema = await generateClientSchema();
  const result = await printSchema(clientSchema);
  return console.log(result);
});


 Listen for fetch events, and for those to the /graphql endpoint,
 run our caching logic  , passing in information about the request.

self.addEventListener('fetch', async (fetchEvent) => {
  const metrics = new Metrics();
  const clone = fetchEvent.request.clone();
  const { url, method, headers } = clone;
  const urlObject = new URL(url);
  const { gqlEndpoints } = settings;
  const endpoint = urlObject.origin + urlObject.pathname;

  //Check if the fetch request URL matches a graphQL endpoint as defined in settings
  if (gqlEndpoints.indexOf(endpoint) !== -1) {
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
        sw_error_log('There was an error in the caching logic!', err.message);
        return await fetch(clone);
      }
    }
    fetchEvent.respondWith(fetchAndGetResponse());
  }
});

/* 
 The main wrapper function for our caching solution.
 Generates response data, either through API call or from cache,
 and sends it back. Updates the cache asynchronously after response.
*/
async function runCachingLogic({
  urlObject,
  method,
  headers,
  metrics,
  request,
}) {
  const { query, variables } =
    method === 'GET'
      ? getQueryFromUrl(urlObject)
      : await getQueryFromBody(request);

  const metadata = metaParseAST(query);
  if (settings.doNotCacheGlobal && doNotCacheCheck(metadata, urlObject) === true) {
    const responseData = await executeQuery({
      urlObject,
      method,
      headers,
      body,
    });
    return responseData;
  };
  const hashedQuery = ourMD5(query.concat(variables)); // NOTE: Variables could be null, that's okay!
  const body = JSON.stringify({ query, variables });
  const cachedData = await checkQueryExists(hashedQuery);
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
 * Gets the query and variables from a GET request url and returns them
 * EG: 'http://localhost:4000/graphql?query=query\{human(input:\{id:"1"\})\{name\}\}'
 */
function getQueryFromUrl(urlObject) {
  const query = urlObject.searchParams.get('query');
  const variables = urlObject.searchParams.get('variables');
  if (!query)
    throw new Error(`This HTTP GET request is not a valid GQL request: ${url}`);
  return { query, variables };
}

/*
 * Gets the query and variables from a POST request returns them
 */
const getQueryFromBody = async (request) => {
  const { query, variables } = await request.json();
  return { query, variables };
};

// Checks for existence of hashed query in IDB
async function checkQueryExists(hashedQuery) {
  try {
    return await get('queries', hashedQuery);
  } catch (err) {
    sw_error_log('Error getting query from IDB', err.message);
  }
}

/* Returns false if the cacheExpirationLimit has been set,
 * and the lastApiCall occured more than cacheExpirationLimit milliseconds ago
 */
function checkCachedQueryIsFresh(lastApiCall) {
  const { cacheExpirationLimit } = settings;
  if (!cacheExpirationLimit) return true;
  return Date.now() - lastApiCall < cacheExpirationLimit;
}

/* If the query doesn't exist in the cache, then execute
 * the query and return the result.
 */
async function executeQuery({ urlObject, method, headers, body }) {
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

/* Write the result of the query into cache.
 * Add the time it was called to the API for expiration purposes.
 */
function writeToCache({ hashedQuery, data }) {
  if (!data) return;
  set('queries', hashedQuery, { data, lastApiCall: Date.now() })
    .then(() => sw_log('Wrote response to cache.'))
    .catch((err) =>
      sw_error_log('Could not write response to cache', err.message)
    );
}

// Logic to write normalized cache data to indexedDB
async function writeToNormalizedCache({ normalizedData }) {
  const arrayKeyVals = normalizedData.denestedObjects.map(e => Object.entries(e)[0]);
  const saveData = await setMany('queries', arrayKeyVals);
  const rootQuery = await get('queries', 'ROOT_QUERY');
  if (!rootQuery) {
    await set('queries', 'ROOT_QUERY', normalizedData.rootQueryObject)
  } else {
    const expandedRoot = {
      ...rootQuery,
      ...normalizedData.rootQueryObject
    };
    await set('queries', 'ROOT_QUERY', expandedRoot);
  }
}

/*
 * Cache-update functionality (part of config object)
 * When a request comes in from the client, deliver the content from the cache (if possible) as usual.
 * In addition to the normal logic, even if the response is already in the cache, follow through with
 * sending the request to the server, updating the cache upon receipt of response.
 */
async function executeAndUpdate({
  hashedQuery,
  urlObject,
  method,
  headers,
  body,
}) {
  const data = await executeQuery({ urlObject, method, headers, body });
  // NOTE: currently not doing any type of check to see if "new" result is actually different from old data
  writeToCache({ hashedQuery, data });
  console.log('data before normalize =', data);
  const normalizedData = normalizeResult(data.data);
  writeToNormalizedCache({ normalizedData });
  return data;
}

/*
 * Create AST and extract metadata relevant info: operation type (query/mutation/subscription/etc.), fields
 */
function metaParseAST(query) {
  const queryCST = { operationType: '', fields: [] };
  const queryAST = parse(query);
  visit(queryAST, {
    OperationDefinition: {
      enter(node) {
        queryCST.operationType = node.operation;
      },
    },
    SelectionSet: {
      enter(node /*, key, parent, path, ancestors*/) {
        /*console.log("NODE ", node);
        console.log("KEY ", key);
        console.log("PARENT ", parent);
        console.log("PATH ", path); // How to drill into the query to get the exact node
        console.log("ANCESTORS ", ancestors);
        */
        const selections = node.selections;
        selections.forEach((selection) =>
          queryCST.fields.push(selection.name.value)
        );
      },
    },
  });
  return queryCST;
}

/*
 * Check metadata object for inclusion of field names that are included in "doNotCache" Configuration Object
 * setting. If match is found, execute query and return response to client, bypassing the cache for the entire query
 */
function doNotCacheCheck(queryCST, urlObject) {
  const endpoint = urlObject.origin + urlObject.pathname;
  let doNotCache = [];
  const fieldsArray = queryCST.fields;
  if (endpoint in settings.doNotCacheCustom) {
    doNotCache = settings.doNotCacheCustom[endpoint].concat(...settings.doNotCacheGlobal)
  } else {
    doNotCache = [...settings.doNotCacheGlobal];
  }
  for (let i = 0; i < fieldsArray.length; i++) {
    for (let k = 0; k < doNotCache.length; k++) {
      if (fieldsArray[i] == doNotCache[k]) {
        return true;
      }
    }
  }
  return false;
}

async function generateClientSchema(){
  const presult = await get('queries', 'rockMortyIntrospectionResult');
  console.log(presult);
  const result = await buildClientSchema(presult.data);
  return result;
}