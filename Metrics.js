import { sw_log, sw_error_log } from './loggers';
import { get, set, keys, getAll} from './db';

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
      const metrics = await get('metrics', hash).catch(sw_error_log);
      if (metrics === undefined) {
        await set('metrics', hash, { uncachedSpeeds: [timeElapsed], cachedSpeeds: [] }).catch(sw_error_log);
      } else {
          if (this.isCached) {
            await set('metrics', hash, { ...metrics, cachedSpeeds: metrics.cachedSpeeds.concat(timeElapsed) })
              .catch(sw_error_log);
          } else {
            await set('metrics', hash, { ...metrics, uncachedSpeeds: metrics.uncachedSpeeds.concat(timeElapsed) })
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

export async function summary () {
    const store = 'metrics'
    const metricValues = await getAll(store); // An array of objects from the Metrics store
    const values = {}; //Empty object to store objects from metricValues array
    let uncachedTotalTime = 0; //Total time of all uncached queries
    let cachedTotalTime = 0; //Total time of all cached queries
    let uncachedTotalQueries = 0; 
    let cachedTotalQueries = 0;
    let totalUncachedTimeSquared = 0;

    for (const [key] of Object.entries(metricValues)) {
      values[key] = metricValues[key]; // 
      // console.log('this is the value', metricValues[key], `\n this is the key`, key)
    }
    
    for (const [key, val] of Object.entries(values)) {
      let quertyCachedTime = 0;
      let queryUncachedTime = 0;
      for (const time of values[key]['uncachedSpeeds']) {
        uncachedTotalQueries += 1; //increments by 1 to elements within uncachedSpeeds
        uncachedTotalTime += time; 
        queryUncachedTime += time; //total amount of time to return data to client, for the individual (uncached) query
      }
      for (const time of values[key]['cachedSpeeds']) {
        cachedTotalQueries += 1; //increments by 1 to elements within cachedSpeeds
        cachedTotalTime += time;
        quertyCachedTime += time; //total amount of time to return data to client, for the individual (cached) query
      }
      totalUncachedTimeSquared += ((queryUncachedTime/values[key]['uncachedSpeeds'].length) * values[key]['cachedSpeeds'].length);
    }

    const totalUncachedAvg = Number((uncachedTotalTime / uncachedTotalQueries).toFixed(2));
    const totalCachedAvg = Number((cachedTotalTime / cachedTotalQueries).toFixed(2));
    const percentFaster = ((totalUncachedAvg - totalCachedAvg)/totalCachedAvg*100)
    const total = {
      'Uncached Avgerage Time': (totalUncachedAvg + 'ms'),
      'Cached Avgerage Time': (totalCachedAvg + 'ms'),
      'Percent Speed Increase From Caching': (percentFaster.toFixed(2) + '%'),
      'Total Time Saved': ((totalUncachedTimeSquared - cachedTotalTime) + 'ms'),
      //multiply total # of queries x avg uncached time
      'Total Query Calls': uncachedTotalQueries + cachedTotalQueries,
      'Created At': new Date()
    }

    console.table(total);
    //write total to metric object store
    // set('Summary', 'totals', total).catch(sw_error_log);
    return total;
  };