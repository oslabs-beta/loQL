export const sw_log = (...strings) =>
  strings.forEach((msg) => {
    console.log(`%c ${msg}`, 'color: green; font-weight: bold');
  });

export const sw_error_log = (...strings) =>
  strings.forEach((msg) => {
    console.log(`%c ${msg}`, 'color: red; font-weight: bold');
  });

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

<<<<<<< Updated upstream
/*
export const installing = () => {

}*/
=======
>>>>>>> Stashed changes
