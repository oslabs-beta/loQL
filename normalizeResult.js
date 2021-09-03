// this assumes results at top level comes in as an array
// NODE FIX THIS : make sure it accounts for if just object
const rootQueryObject = {};
const denestedObjects = [];

/* If top level result is an array, denest every object in it.
* If it's an object, start denesting immediately.
*/

export function normalizeResult(result) {
 for (const key in result) {
   rootQueryObject[key] = `loql__${key}`;
   const value = result[key];
   if (Array.isArray(value)) {
     rootQueryObject[key] = flattenArray({ value, childKey: key });
   } else {
     flatObjAndWrite({ object: result[key], parentKey: key });
   }
 }

 return { rootQueryObject, denestedObjects };
}

/*
* Takes an object, and a parent key. Recursively goes through keys
* in object, and writes all to denestedObjects array. If result at key is a
* primitive, write to result. If object, set to result of recursive call.
* If array, set to mapped value of flattenedArray.
*/
function flatObjAndWrite({ object, parentKey }) {
 const result = {};
 for (const key in object) {
   const value = object[key];
   if (Array.isArray(value)) {
     let childKey = parentKey + '_' + key;
     result[key] = flattenArray({ value, childKey });
   } else if (typeof value === 'object' && value !== null) {
     let childKey = parentKey + '_' + key;
     result[key] = flatObjAndWrite({ object: value, parentKey: childKey });
   } else {
     result[key] = value;
   }
 }

 denestedObjects.push({ [parentKey]: result });
 return 'loql__' + parentKey;
}

/*
* Takes an array, loops over every value in the array.
* For every object, calls flattenObject, then returns the ref.
* For every non-object, returns the value directly.
*/
function flattenArray({ value, childKey }) {
 return value.map((subArrayVal) => {
   if (typeof subArrayVal === 'object' && subArrayVal !== null) {
     if (!subArrayVal.id) return subArrayVal;
     const uniqueKey = childKey + '_' + subArrayVal.id; // Add id...
     return flatObjAndWrite({
       object: subArrayVal,
       parentKey: uniqueKey,
     });
   }
   return subArrayVal;
 });
}


// /* 
//   Accepts the result from the GQL server and de-nests the object, 
//   returning an array of unique references, each of which point to an object that only contains primitive values. 
//   The primitive values can point to other de-nested objects.
// */
// export function normalizeResult(result) {
//   const rootQueryObject = {};
//   const denestedObjects = [];
//   // Set top-level key of query type in result object.
//   // NOTE: Somehow include the arguments? JSON.stringify?
//   for (const key in result) {
//     rootQueryObject[key] = `loql__${key}`;
//     recurse({ data: result[key], parentKey: key });
//   }
//   /* 
//     Recursively build unique keys for every object that contains only primitive results, 
//     by keeping track of the relationship between parent/child objects.
//     Pushes those key/value pairs into de-nestedObjects at every depth.
//   */
//   function recurse({ data, parentKey }) {
//     const result = {};

//     /*
//     * When the data is an array, create a unique identifier for each element in the array using its ID property, and add that to the "result" object.
//     * When the data is an object, grab every value inside of it. We will set primitive values directly on the result object. However, when the value is an array or an object, we will denest it and create a reference key in our result that points to the denested object.
//     */
//     for (const key in data) {
//       const value = data[key];
//       if (Array.isArray(value)) {
//         let childKey = parentKey + '_' + key;
//         result[key] = value.map((subArrayVal) => {
//           // Must provide unique ID for caching of array values.
//           if (subArrayVal.id === undefined) return subArrayVal;
//           if (typeof subArrayVal === 'object' && subArrayVal !== null) {
//             const uniqueKey = childKey + '_' + subArrayVal.id;
//             return recurse({ data: subArrayVal, parentKey: uniqueKey });
//           }
//           return subArrayVal;
//         });
//       } else if (typeof value === 'object' && value !== null) {
//         let childKey = parentKey + '_' + key;
//         result[key] = recurse({ data: value, parentKey: childKey });
//       } else {
//         result[key] = value;
//       }
//     }

//     // We will push into our denestedObjects array an object that contains 
//     // only primitives or references to other denested objects.
//     if (rootQueryObject[parentKey]) {
//       denestedObjects.push({ [parentKey]: Object.values(result) });
//     } else {
//       denestedObjects.push({ [parentKey]: result });
//     }
//     // The loql__ prefix helps to distinguish between results that 
//     // are strings and results that are references (but are string types).
//     return 'loql__' + parentKey;
//   }

//   return { rootQueryObject, denestedObjects };
// }