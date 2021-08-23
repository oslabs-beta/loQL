import { sw_log, sw_error_log } from './loggers';
import { get, set } from './db';

export default class Metrics {
  constructor() {
    this.isCached = false;
    this.start = Date.now();
  }

  /* 
    Save to IDB, the last time the query was run to the API,
    and the speed of the query. Keep cached queries and uncached queries separate.
    */
  async save(hash) {
    const timeElapsed = (Date.now() - this.start) / 1000;
    const lastRun = new Date();
    const metrics = await get('metrics', hash).catch(sw_error_log);
    if (metrics === undefined) {
      await set('metrics', hash, {
        uncachedSpeeds: [timeElapsed],
        cachedSpeeds: [],
        lastRun,
      }).catch(sw_error_log);
    } else {
      if (this.isCached) {
        await set('metrics', hash, {
          ...metrics,
          cachedSpeeds: metrics.cachedSpeeds.concat(timeElapsed),
        }).catch(sw_error_log);
      } else {
        await set('metrics', hash, {
          ...metrics,
          uncachedSpeeds: metrics.uncachedSpeeds.concat(timeElapsed),
          lastRun,
        }).catch(sw_error_log);
      }
    }
  }
}
