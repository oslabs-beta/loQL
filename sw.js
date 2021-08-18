import { get, set } from 'idb-keyval';
import CryptoJS from 'crypto-js';

console.log(1);

addEventListener('onClick', function exists () {
  console.log(2)
  get(hash)
    .then((val) => {
      console.log(3)
      const hash = CryptoJS.MD5(val);
      if (val === hash) {
        return val;
      }
    })
    .catch(err => {
      console.log(`Error: ${err}`)
    })
} ) 