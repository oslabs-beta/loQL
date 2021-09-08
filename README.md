# loQL

A light, modular npm package for performant client-side GraphQL caching with Service Workers and IndexedDB.

## Installation

Install via [npm](https://www.npmjs.com/package/loql) 

```bash
npm install loql
```

## Usage

I. Set configuration object:

a. gqlEndpoints (Required): Add GraphQL endpoint URL's to be enabled for caching. (Array of strings)

b. useMetrics (Optional): Enable metrics collection. (Boolean)

c. cacheMethod (Optional): Desired caching strategy. (String)

d. cacheExpirationLimit (Optional): Interval, in milliseconds, at which to refresh cached data. (Integer)

e. doNotCacheGlobal (Optional): Define schema-specific types/fields, whose inclusion in a query will render that query ignored by the caching logic. (Arrays of strings)

f. doNotCacheCustom (Optional): Similar to above, but endpoint-specific. (Object where each key is an endpoint, and the corresponding value is the array of types/fields intended to bypass the cache.

```javascript
{
  gqlEndpoints: ['http://localhost:<###>/api/graphql', 'https://<abc>.com/graphql'],
  useMetric: false,
  cacheExpirationLimit: 20000,
  cacheMethod: 'cache-network',
  doNotCacheGlobal: [],
  doNotCacheCustom: {
     'http://localhost:<###>/api/graphql': ['password'],
     'https://<abc>.com/graphql': ['account', 'real_time_data'];
  }
}
```

## Features
- Enables offline use: IndexedDB storage is high-capacity and persists, while keeping reads/writes asynchronous.
- Minimum-dependency: No server-side component, avoid use of large libraries
- Cache validation: Keep data fresh with shorter expiration limits, or cache-network strategy
- Simple: Install package, configure one mandatory setting, and go
- Flexible: Easily exempt certain types of queries from caching

## Usage Notes (NOTE: Work in progress)
- unsupported operations
- normalization & deep nesting

## Supported Browsers
Desktop: Edge, Firefox, Chrome, Safari, Opera

Mobile: Firefox, Chrome, Android Browser, Samsung Internet

## Contributing
Contributions are welcome. Please read CONTRIBUTE.md prior to making a Pull Request.

## License
[MIT](https://choosealicense.com/licenses/mit/)