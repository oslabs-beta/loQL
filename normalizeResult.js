/* 
  Accepts the result from the GQL server and de-nests the object, 
  returning an array of unique references, each of which point to an object that only contains primitive values. 
  The primitive values can point to other de-nested objects.
*/
export function normalizeResult (result) {
  const rootQueryObject = {};
  const denestedObjects = [];

  // Set top-level key of query type in result object.
  // NOTE: Somehow include the arguments? JSON.stringify?
  for(const key in result) {
    rootQueryObject[key] = recurse({ data: result[key], parentKey: key })
  };
  
  /* 
    Recursively build unique keys for every object that contains only primitive results, 
    by keeping track of the relationship between parent/child objects.
    Pushes those key/value pairs into de-nestedObjects at every depth.
  */
  function recurse({ data, parentKey }) {
    const result = {};
    // When the data is an array, create a unique identifier for each element in the array using its ID property, and add that to the "result" object.
    if (Array.isArray(data)) {
      for(const val of data) {
        let childKey = parentKey + '_' + val.id; // NOTE: User's may configure..
        result[childKey] = recurse({ data: val, parentKey: childKey });
      }
    } else {
      // When the data is an object, grab every value inside of it. We will set primitive values directly on the result object. However, when the value is an array or an object, we will denest it and create a reference key in our result that points to the denested object.
      for(const key in data) {
        const value = data[key];
        if(Array.isArray(value)) {
          let childKey = parentKey + '_' + key;
          result[key] = value.map((subArrayVal) => {
            if (typeof subArrayVal === 'object' && subArrayVal !== null) {
              const uniqueKey = childKey + '_' + subArrayVal.id;
              return recurse({ data: subArrayVal, parentKey: uniqueKey });
            }
            return subArrayVal;
          });
        } else if (typeof value === 'object' && value !== null) {      
          let childKey = parentKey + '_' + key;          
          result[key] = recurse({ data: value, parentKey: childKey })
        } else {  
          result[key] = value;
        }
      }
    }

    // We will push into our denestedObjects array an object that contains only primitives or references to other denested objects.
    denestedObjects.push({ [parentKey]: result });
    // The loql__ prefix helps to distinguish between results that are strings and results that are references (but are string types).
    return "loql__" + parentKey;
  };

  console.log('rootQueryObject =', rootQueryObject);
  console.log('denestedObjects =', denestedObjects);
  return { rootQueryObject, denestedObjects };
}