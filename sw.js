
const getBody = async (e) => {
  const blob = await e.request.blob();
  const body = await blob.text();
  return body;
};

self.addEventListener('fetch', async (fetchEvent) => {
  const { url, method, headers } = fetchEvent.request; // headers is an iterable...
  if (url.endsWith('/graphql')) {
    const body = await getBody(fetchEvent);
    const queryResult = await runCachingLogic(url, method, headers, body);
    fetchEvent.respondWith(queryResult);
  }
});

async function runCachingLogic(url, method, headers, body) {}

async function storeQueryResult(arg) {
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
}
