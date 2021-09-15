# loQL

A light, modular npm package for performant client-side GraphQL caching with Service Workers and IndexedDB. More detailed information about installing and configuring loQL can be found <a href="https://loql.land/docs">here</a>.

## Installation

Install via [npm](https://www.npmjs.com/package/loql-cache) 

```bash
npm install loql-cache
```
Or with Yarn

```bash
yarn add loql-cache
```

The service worker must also be included in your build folder. With webpack:

```javascript
const path = require('path');

module.exports = {
  entry: {
    bundle: './client/index.js',
    loQL: './node_modules/loql-cache/loQL.js', // Add this line!
  },
  output: {
  path: path.resolve(__dirname, 'public'),
    filename: '[name].js',
    clean: true,
  },
  devServer: {
    static: './client',
  },
};
```

## Register the service worker

```javascript
import { register } from "loql-cache";
register({ gqlEndpoints: ["https://foo.com"] });
```

## Settings


`gqlEndpoints: string[] Required`

Enable caching for specific GraphQL endpoint URLs. Network calls from the browser to any URL not listed here will be ignored by the service worker and the response data will not be cached.

`useMetrics: boolean Optional`

Enable metrics collection. 

`cacheMethod: string Optional`

Desired caching strategy. The loql-cache package supports both "cache-first" and "cache-network" policies.

`cacheExpirationLimit: Integer Optional`

The interval, in milliseconds, after which cached data is considered stale. 

`doNotCacheGlobal: string[] Optional`

Fields on a GraphQL query that will prevent the query from being cached, no matter the endpoint.

`doNotCacheCustom:{ [url]: string[] } Optional`

This setting is like doNotCacheGlobal, but can be used on a per-endpoint basis.

### Example Configuration

```javascript
const loQLConfiguration = {
  gqlEndpoints: ['http://localhost:<###>/api/graphql', 'https://<abc>.com/graphql'],
  useMetrics: false,
  cacheExpirationLimit: 20000,
  cacheMethod: 'cache-network',
  doNotCacheGlobal: [],
  doNotCacheCustom: {
     'http://localhost:<###>/api/graphql': ['password'],
     'https://<abc>.com/graphql': ['account', 'real_time_data'];
  }
};

register(loqlConfiguration);
```

## Features
- Enables offline use: IndexedDB storage provides high-capacity and persistent storage, while keeping reads/writes asynchronous
- Minimum-dependency: No server-side component, avoid the use of large libraries
- Cache validation: Keep data fresh with shorter expiration limits, cache-network strategy, or both!
- Easy-to-use: Install package, register and configure service worker, start caching
- Flexible: Works with GQL queries made as both fetch POST and GET requests
- Easily exempt types of queries from being cached at the global or endpoint-specific level

## Usage Notes
- Caching is currently only supported for query-type operations. Mutations, subscriptions, etc will still run,
  but will not be cached. 
- Cached data normalization feature is disabled.

## Contributing
Contributions are welcome. Please read CONTRIBUTE.md prior to making a Pull Request.

## License
[MIT](https://choosealicense.com/licenses/mit/)
