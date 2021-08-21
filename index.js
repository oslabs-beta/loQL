import { sw_log, sw_error_log } from './loggers';

export const register = () => {
  if (navigator.serviceWorker) {
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
