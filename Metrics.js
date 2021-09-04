import { sw_log, sw_error_log } from './loggers';
import { get, set, keys, getAll } from './db';

export class Metrics {
  constructor() {
    this.isCached = false;
    this.start = Date.now();
  }

  /* 
    Save to IDB, the last time the query was run to the API,
    and the speed of the query. Keep cached queries and uncached queries separate.
    */
  async save(hash) {
    const timeElapsed = Date.now() - this.start;
    const metrics = await get('metrics', hash).catch(sw_error_log);
    if (metrics === undefined) {
      await set('metrics', hash, {
        hash,
        uncachedSpeeds: [timeElapsed],
        cachedSpeeds: [],
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
        }).catch(sw_error_log);
      }
    }
  }
}

export async function cachedAvg(hash) {
  const data = await get('metrics', hash).catch(sw_error_log);
  let totalMilliseconds = 0;
  for (const time of data.cachedSpeeds) {
    totalMilliseconds += time;
  }
  return totalMilliseconds / data.cachedSpeeds.length;
}

export async function uncachedAvg(hash) {
  const data = await get('metrics', hash);
  let totalMilliseconds = 0;
  for (const time of data.uncachedSpeeds) {
    totalMilliseconds += time;
  }
  return totalMilliseconds / data.uncachedSpeeds.length;
}

export async function avgDiff(hash) {
  const cached = await cachedAvg(hash);
  const uncached = await uncachedAvg(hash);
  console.table({
    'Average Time Saved': Number((uncached - cached).toFixed(2)),
    'Average Cached Speed': Number(cached.toFixed(2)),
    'Average Uncached Speed': Number(uncached.toFixed(2)),
  });
}

export async function summary() {
  const store = 'metrics';
  const metricValues = await getAll(store); // An array of objects from the Metrics store
  const individualCachedSpeeds = [];
  const individualUncachedSpeeds = [];
  let uncachedTotalTime = 0; // Total time of all uncached queries
  let cachedTotalTime = 0; // Total time of all cached queries
  let uncachedTotalQueries = 0;
  let cachedTotalQueries = 0;
  let totalUncachedTimeSquared = 0;
  let lastCachedQuery;
  let lastUncachedQuery;

  for (const metricObject of metricValues) {
    let queryUncachedTime = 0;
    let queryCachedTime = 0;
    for (const time of metricObject['uncachedSpeeds']) {
      lastUncachedQuery = time;
      individualUncachedSpeeds.push(time);
      uncachedTotalQueries += 1; // Increments by 1 to elements within uncachedSpeeds
      uncachedTotalTime += time;
      queryUncachedTime += time; // Total amount of time to return data to client, for the individual (uncached) query
    }

    for (const time of metricObject['cachedSpeeds']) {
      individualCachedSpeeds.push(time);
      cachedTotalQueries += 1; //increments by 1 to elements within cachedSpeeds
      cachedTotalTime += time;
      queryCachedTime += time; //total amount of time to return data to client, for the individual (cached) query
    }

    totalUncachedTimeSquared +=
      (queryUncachedTime / metricObject['uncachedSpeeds'].length) *
      metricObject['cachedSpeeds'].length;
  }

  const totalUncachedAvg = Number((uncachedTotalTime / uncachedTotalQueries).toFixed(2));
  const totalCachedAvg = Number((cachedTotalTime / cachedTotalQueries).toFixed(2));
  const percentFaster = ((totalUncachedAvg - totalCachedAvg) / totalCachedAvg) * 100;

  const total = {
    'Uncached Average Time': totalUncachedAvg + 'ms',
    'Cached Average Time': totalCachedAvg + 'ms',
    'Percent Speed Increase From Caching': percentFaster.toFixed(2) + '%',
    'Total Time Saved': totalUncachedTimeSquared - cachedTotalTime + 'ms',
    'Total Query Calls': uncachedTotalQueries + cachedTotalQueries,
    'Created At': new Date(),
  };

  const totalDetail = {
    uncachedAverageTime: totalUncachedAvg,
    cachedAverageTime: totalCachedAvg,
    percent: Number(percentFaster.toFixed(2)),
    totalTimeSaved: totalUncachedTimeSquared - cachedTotalTime,
    totalQueryCalls: uncachedTotalQueries + cachedTotalQueries,
    individualCachedSpeeds,
    individualUncachedSpeeds,
    recentQuery: { averageCachedTime: 1 },
  };

  console.table(total);
  return totalDetail;
}
