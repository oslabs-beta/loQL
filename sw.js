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

async function runCachingLogic(url, method, headers, body) {
  // Hash the query
  // Check whether the query exists in our DB
    // If it does, return the value
  // If not, execute the query (Jae + Harry) and return result into variable
  const result = await executeQuery(url, method, headers, body);
  console.log('result from query =', result);
  // Set the hash and the result in indexDB
  // Return the result to the user
}

async function executeQuery(url, method, headers, body) { 
  return fetch(url, { method, headers, body })
    .then(r => r.json())
    .then(data => {
      return data
    })
    .catch(err => {
      console.error("ERROR IN SW FETCH: ", err);
    })
}