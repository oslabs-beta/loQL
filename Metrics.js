import { set } from "idb-keyval";
import { sw_log } from "./index";
export default class Metrics {
    constructor() {
        this.isCached = false;
        this.start = Date.now();
    };

    save(hash) {
        const timeElapsed = (Date.now() - this.start) / 1000;
        sw_log(`Time elapsed: ${timeElapsed}`);
        sw_log(`isCached: ${this.isCached}`);
    }
}


// let metrics = new Metrics(notCached);
// if(!notCached)
//   let uncachedStart;
//   if (!notCached) uncachedStart = Date.now();
//   else cachedStart = Date.now()

//     if (!notCached) notCached = (Date.now() - uncachedStart)/1000;
//     else cachedEnd = (Date.now() - cachedStart)/1000;
//     console.log("Not cached Speed:", notCached, "Cached speed:", cachedEnd)