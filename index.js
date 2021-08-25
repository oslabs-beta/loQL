import { setMany } from './db';
import { sw_log, sw_error_log } from './loggers';
import { avgDiff, cachedAvg, uncachedAvg, summary } from './Metrics';

/* validSettings are the settings the user can specify. They are:
 * useMetrics: Enable or disable saving caching metrics to IndexDB
 * cacheMethod: Process for requesting and serving data to client
 * cacheExpirationLimit: Amount of time (in milliseconds) before data is refetched from API, not served from cache
 * doNotCache: Array of strings corresponding to from GraphQL object types to be excluded from caching
 */
export const validSettings = [
  'useMetrics',
  'cacheMethod',
  'cacheExpirationLimit',
  'doNotCache',
];

export const defaultSettings = {
  useMetrics: true,
  cacheMethod: 'cache-first',
  cacheExpirationLimit: null,
  doNotCache: [],
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
