// Using __typename to avoid data duplication of similar types
// Disadvantage: If schema introspection is not turned on, this will break

// ALL POKEMON
// query {
//   pokemon {
//     name
//     id
//     generation_id
//     environment {
//       isWater
//     }
//   trainers {
//     }
//   }
// }

// Query for a array of nested result
// query {
//   pokemon {
//     environment {
//        isWater 
//     }
//   }
// }

// query {
//   pokemon {
//     food {
//        carnivore 
//     }
//   }

// }

const result = {
  pokemon: [
    { 
      name: "jooglypoof", 
      id: 69, 
      generation_id: 3,
      environment: {
        isWater: false
      }
    },
    { 
      name: "rock-head", 
      id: 70, 
      generation_id: 3,
      environment: {
        isWater: false
      }
    }
  ],
  trainer: [
    { 
      name: "ash ketchum", 
      id: 1, 
      gym: {
        isOpen: true
      }
    },
    { 
      name: "misty kasumi", 
      id: 2, 
      gym: {
        isOpen: false
      }
    }
  ],
};

const cache = {
ROOT_QUERY: {
  pokemon: [
    uniqueId1: ,
    uniqueId2: ,
    
  ],
  trainer {

  }
}
};

const finalObject = {}

function normalizeResult (result) {
// For every key in our result, recursively call normalizeResult with that key value...

// Separate 

}

function createUniqueId (prevKey, currentField) {
return prevKey + currentField
};

const { splitObj, fullObj } = normalizeResult(result);

console.log(splitObj, fullObj);


/*
What would be stored as key-values in indexDB
{
__typename + id1 : {..., environment : __typename + id1 + environment},
__typename + id2 : {},
__typename + id3 : {},
__typename + id4 : {},
__typename + id5 : {},
__typename + id1 + environment = {},
__typename + id2 + environment = {},
__typename + id3 + environment = {},
__typename + id4 + environment = {},
__typename + id5 + environment = {},
ROOT_QUERY : {
  pokemon: [
    { __ref: __typename + id1 },
    { __ref: __typename + id2 },
    { __ref: __typename + id3 },
    { __ref: __typename + id4 },
    { __ref: __typename + id5 },
  ],
  pokemon({id : 69})
}
}

Parking lot items
* handling arguments to store unique root queries
* handling cases where ID is not being returned as result
* putting shit together to send back to the client

*/

//  How to query for specific pokemon
//  query {
//    pokemon({ id: 69 }){
//      name
//      id
//      generation_id
//   }
// }