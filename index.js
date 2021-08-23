import { setMany } from './db';
import { sw_log, sw_error_log } from './loggers';

// Register service worker pulled in during webpack build step.
// And create settings in IDB for service worker passed during registration step. Only create settings that are valid.
export const validSettings = ['useMetrics', 'optimize'];
export const register = async (settings) => {
  if (navigator.serviceWorker) {
    await setMany(
      'gql-store',
      'settings',
      Object.entries(settings).filter(([key, val]) =>
        validSettings.includes(key)
      )
    );
    navigator.serviceWorker
      .register('./sw.js')
      .then((_) => {
        sw_log('Service worker registered.');
      })
      .catch((err) => {
        sw_log('Service worker not registered.');
        console.log(err);
      });
  } else {
    sw_log('Service workers are not possible on this browser.');
  }
};
