import { setMany } from './db';
import { sw_log, sw_error_log } from './loggers';
import { avgDiff, cachedAvg, uncachedAvg } from "./Metrics";


// Register service worker pulled in during webpack build step.
// And create settings in IDB for service worker passed during registration step. Only create settings that are valid.
export const validSettings = ['useMetrics', 'cacheMethod', 'cacheExpirationLimit']; // ** added cacheExpirationLimit
export const register = async (settings) => {
  if (navigator.serviceWorker) {
    await setMany(
      'gql-store',
      'settings',
      Object.entries(settings).filter(([key, val]) =>
        validSettings.includes(key)
      )
    );
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

      navigator.serviceWorker.addEventListener('message', event => {
        console.log(event);
      });

  } else {
    sw_log('Service workers are not possible on this browser.');
  }
};

// Developers can call these functions in the console to get metrics
export function setupMetrics() {
  window.avgDiff = avgDiff; // The total time saved for a particular query
  window.cachedAvg = cachedAvg; // The average speed for a particular query in the cache
  window.uncachedAvg = uncachedAvg; // The average speed for a particular query from the API
  // window.summary = summary // Prints the number of cached queries, and information aobut each of them
}
