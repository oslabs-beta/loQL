/*
 * Makes logs from the service worker green and bold!
 */
export const sw_log = (...strings) =>
  strings.forEach((msg) => {
    console.log(`%c ${msg}`, 'color: green; font-weight: bold');
  });

/*
 * Makes errors from the service worker red and bold!
 */
export const sw_error_log = (...strings) =>
  strings.forEach((msg) => {
    console.log(`%c ${msg}`, 'color: red; font-weight: bold');
  });
