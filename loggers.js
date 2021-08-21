export const sw_log = (...strings) =>
  strings.forEach((msg) => {
    console.log(`%c ${msg}`, 'color: green; font-weight: bold');
  });

export const sw_error_log = (...strings) =>
  strings.forEach((msg) => {
    console.log(`%c ${msg}`, 'color: red; font-weight: bold');
  });
