import { setMany } from './helpers/initializeIndexDb';
import { sw_log, sw_error_log } from './helpers/loggers';
import { avgDiff, cachedAvg, uncachedAvg, summary } from './helpers/metrics';

/* gqlEndpoints: An array of endpoint URLs, as strings, to explicitly allow added endpoints to be queried from the client API.
 * useMetrics: Enable or disable saving caching metrics to IndexedDB.
 * cacheMethod: Desired strategy for serving/updating cached data to the client.
 * cacheExpirationLimit: Amount of time (in milliseconds) before cached data is refetched from GraphQL endpoint.
 * doNotCacheGlobal: An array of strings (types, as per the endpoint-specific GQL schema),
 * and whose inclusion will exempt a query response from being cached regardless of the GraphQL request endpoint.
 * doNotCacheCustom: An object where each key is an endpoint, and the corresponding value is an array of strings that references specific types,
 * (as defined in the GQL schema) whose inclusion in a query will exempt it from caching.
 */

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

/* Registers service worker pulled in during build steps of webpack/parcel/etc.
 * Also creates settings in IDB for service worker passed during registration step.
 * Only creates settings that are contained in the validSettings array.
 */
export const register = async (userSettings) => {
  let settings;
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
      .register('./loQL.js')
      .then((_) => {
        sw_log('Service worker registered.');
      })
      .catch((err) => {
        sw_error_log('Service worker not registered.');
        console.error(err);
      });
  } else {
    sw_log('Service workers are not possible on this browser.');
  }
};

export function setupMetrics() {
  window.avgDiff = avgDiff; // The total time saved for a particular query
  window.cachedAvg = cachedAvg; // The average speed for a particular query in the cache
  window.uncachedAvg = uncachedAvg; // The average speed for a particular query from the API
  window.summary = summary; // Prints the number of cached queries, and information about each of them
}
