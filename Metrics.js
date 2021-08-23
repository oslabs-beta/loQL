import { sw_log, sw_error_log } from './loggers';
import { get, set } from './db';

export class Metrics {
    constructor() {
        this.isCached = false;
        this.start = Date.now();
    };

    /* 
    Save to IDB, the last time the query was run to the API,
    and the speed of the query. Keep cached queries and uncached queries separate.
    */
    async save(hash) {
      const timeElapsed = (Date.now() - this.start);
      const lastAPICall = new Date();
      const metrics = await get('metrics', hash).catch(sw_error_log);
      if (metrics === undefined) {
        await set('metrics', hash, { uncachedSpeeds: [timeElapsed], cachedSpeeds: [], lastAPICall }).catch(sw_error_log);
      } else {
          if (this.isCached) {
            await set('metrics', hash, { ...metrics, cachedSpeeds: metrics.cachedSpeeds.concat(timeElapsed) })
              .catch(sw_error_log);
          } else {
            await set('metrics', hash, { ...metrics, uncachedSpeeds: metrics.uncachedSpeeds.concat(timeElapsed), lastAPICall })
              .catch(sw_error_log);
          }
      }
    }
};

export async function cachedAvg (hash) {
  const data = await get('metrics', hash).catch(sw_error_log);
  console.log(data)
  let totalMilliseconds = 0;
  for (const time of data.cachedSpeeds) {
    totalMilliseconds += time;
  }
  return totalMilliseconds / data.cachedSpeeds.length; 
}

export async function uncachedAvg (hash) {
  const data = await get('metrics', hash);
  console.log(data)
  let totalMilliseconds = 0;
  for (const time of data.uncachedSpeeds) {
    totalMilliseconds += time;
  }
  return totalMilliseconds / data.uncachedSpeeds.length;
}

export async function avgDiff (hash) {
  const cached = await cachedAvg(hash);
  const uncached = await uncachedAvg(hash);
  console.table({
    'Average Time Saved': Number((uncached - cached).toFixed(2)),
    'Average Cached Speed': Number(cached.toFixed(2)),
    'Average Uncached Speed': Number(uncached.toFixed(2))
 });
};

