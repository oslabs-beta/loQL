import { setMany, set } from './db';
import { sw_log, sw_error_log } from './loggers';
import { avgDiff, cachedAvg, uncachedAvg, summary } from './Metrics';
import { getIntrospectionQuery, buildClientSchema, printSchema } from 'graphql/utilities';
import { parse, visit } from 'graphql/language';

// gqlEndpoints: an array of urls, as strings, listing every graphql endpoint which may be queried from the client api
// useMetrics: Enable or disable saving caching metrics to IndexDB
// cacheMethod: Process for requesting and serving data to client
// cacheExpirationLimit: Amount of time (in milliseconds) before data is refetched from API, not served from cache
// doNotCache: An object where all keys besides the default "global" are endpoints, and the corresponding value
//    is an array of strings that correspond to specific types whose inclusion in a query exempts it from caching
//    doNotCache.global is an array of strings (objects/scalars) and whose inclusion will exempt a query response
//    from being cached regardless of the GraphQL request endpoint. An empty array for custom endpoint keys will
//    exempt all reponses from the respective endpoint key
export const validSettings = [
  'gqlEndpoints',
  'useMetrics',
  'cacheMethod',
  'cacheExpirationLimit',
  'doNotCacheGlobal',
  'doNotCacheCustom',
];

export const defaultSettings = {
  gqlEndpoints: [],
  useMetrics: true,
  cacheMethod: 'cache-first',
  cacheExpirationLimit: null,
  doNotCacheGlobal: [],
  doNotCacheCustom: {},
};

// Upon SW activation, sw.js will invoke an introspection query to the endpoints specified in settings.
// Successful query response will generate a clientSchema, from which the data will be parsed and
// used to populate this global object
export const clientSchema = {};

/* Registers service worker pulled in during build steps of webpack/parcel/etc.
 * Also creates settings in IDB for service worker passed during registration step.
 * Only creates settings that are contained in the validSettings array.
 */
export const register = async (userSettings) => {
  let settings;
  const clientSchemaInfo = {};

  try {
    settings = userSettings ? { ...defaultSettings, ...userSettings } : defaultSettings;
  } catch (err) {
    throw new Error('Please pass an object to configure the cache.');
  }

  Object.keys(settings).forEach((key) => {
    if (!validSettings.includes(key)) {
      throw new Error(`${key} is not a valid configuration setting`);
    }
  });

  if (navigator.serviceWorker) {
    await setMany('settings', Object.entries(settings));
    setupMetrics();
    navigator.serviceWorker
      .register('./sw.js')
      .then((_) => {
        sw_log('Service worker registered.');
      })
      .catch((err) => {
        sw_log('Service worker not registered.');
        console.log(err);
      });

    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log(event);
    });
  } else {
    sw_log('Service workers are not possible on this browser.');
  }

  //const clientSchema = {};
  //generate client schema from introspection query and save to DB
  try {
    await fetch('https://rickandmortyapi.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: getIntrospectionQuery() }),
    })
      .then((res) => res.json())
      .then(async (res) => {
        if (res.data) {
          console.log(res.data);
          clientSchema.data = buildClientSchema(res.data);
          console.log(typeof clientSchema.data);
          sw_log(printSchema(clientSchema.data));
          console.log(parse(res.data.__schema));
          //await set('schema', 'Schema', clientSchema.data );
          
          //console.log(clientSchema.data);
          /* const ourData = { data: clientSchema };
          const strSch = JSON.stringify(clientSchema._queryType);
          await set('schema', 'Schema', ourData);
          sw_log('Client schema succesfully added to IndexedDB'); */
        } //else { sw_log('Error adding client schema to IndexedDB') }
<<<<<<< HEAD
      })
      //await set('schema', 'Schema', res.data );
      //sw_log(JSON.stringify(clientSchema.data));
      console.log(clientSchema);
      
=======
      });
    //await set('schema', 'Schema', res.data );
    //sw_log(JSON.stringify(clientSchema.data));
    console.log(clientSchema.data);
>>>>>>> 8a041783aa8c0a4e5630ea9a145fcf08c8acf65a
  } catch (err) {
    sw_log('Error executing schema introspection query');
  }
};

export function setupMetrics() {
  window.avgDiff = avgDiff; // The total time saved for a particular query
  window.cachedAvg = cachedAvg; // The average speed for a particular query in the cache
  window.uncachedAvg = uncachedAvg; // The average speed for a particular query from the API
  window.summary = summary; // Prints the number of cached queries, and information aobut each of them
}
