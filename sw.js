

// -- JR --> function executeNonCachedAndStoreToDB

// add event listener for fetch request
// hash the query and check if hashed query exists in indexDB
// if it doesn't
  // let the original fetch from client execute to graphQL server
  // then store the response to key of cached query

// source
// https://stackoverflow.com/questions/15306611/check-if-indexeddb-objectstore-already-contains-key
// https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/add


self.addEventListener('fetch', (event) => {
  // hash the query string using Konstantin's hash function
  console.log('fetchEvent.request = ', fetchEvent.request);
  // console.log('fetchEvent.request.body =', fetchEvent.request.body);
  const hashedQuery = function KonstantinHash(/* getbody result */);

  // check if that query key exists in indexDB
  const req = objectStore.openCursor(hashedQuery);

  req.onsuccess = function(e) {
    const cursor = e.target.result;
    if (!cursor) {
      // if key does not exist
      // let the original fetch from client execute to GraphQL server
      // change this later from hard coded
      fetch('/api/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            query: `
            query GetHumanQuery($id: String!) {
                human(input: {id: $id }) {
                  id
                }
              }
            `,
            variables: {
                id: "jBWMVGjm50l5LGwepDoty"
            }
        })
      })
        .then(r => r.json())
        .then(data => {
          // store this response data to indexDB at that cached query key
          console.log('response from query:', data)
          console.log('hashed query key to store to =', hashedQuery);
          objectStore.add(data, hashedQuery);
        });
    } else {
      // if key already exists --> might not need this
    }
  }
})