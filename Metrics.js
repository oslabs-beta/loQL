import { set } from 'idb-keyval';
import { sw_log } from './index';

export default class Metrics {
  constructor() {
    this.isCached = false;
    this.start = Date.now();
  }

  save(hash) {
    const timeElapsed = (Date.now() - this.start) / 1000;
    sw_log(`Time elapsed: ${timeElapsed}`);
    sw_log(`isCached: ${this.isCached}`);
  }
}

