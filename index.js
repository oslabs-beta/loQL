import { setMany } from './db';
import { sw_log, sw_error_log } from './loggers';
import { avgDiff, cachedAvg, uncachedAvg, summary } from './Metrics';

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
  'doNotCache',
  'doNotCachev2',
];

export const defaultSettings = {
  gqlEndpoints: [],
  useMetrics: true,
  cacheMethod: 'cache-first',
  cacheExpirationLimit: null,
  doNotCache: [],
  doNotCachev2: { 
    global: [null],
  },
};

/* Registers service worker pulled in during build steps of webpack/parcel/etc.
 * Also creates settings in IDB for service worker passed during registration step.
 * Only creates settings that are contained in the validSettings array.
 */
export const register = async (userSettings) => {
  let settings;
  try {
    settings = userSettings
      ? { ...defaultSettings, ...userSettings }
      : defaultSettings;
  } catch (err) {
    throw new Error('Please pass an object to configure the cache.');
  }

  Object.keys(settings).forEach((key) => {
    if (!validSettings.includes(key)) {
      throw new Error(`${key} is not a valid configuration setting`);
    }
  });

  if (navigator.serviceWorker) {
    await setMany('gql-store', 'settings', Object.entries(settings));
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
};

export function setupMetrics() {
  window.avgDiff = avgDiff; // The total time saved for a particular query
  window.cachedAvg = cachedAvg; // The average speed for a particular query in the cache
  window.uncachedAvg = uncachedAvg; // The average speed for a particular query from the API
  window.summary = summary; // Prints the number of cached queries, and information aobut each of them
}
