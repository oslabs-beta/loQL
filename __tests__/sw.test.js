import { doNotCacheCheck } from '../sw';

describe('doNotCacheCheck', () => {
  const settings = {
    gqlEndpoints: ['https://myapi.com/graphql', 'https://spiderman.com/graphql'],
    useMetrics: true,
    cacheMethod: 'cache-first',
    cacheExpirationLimit: null,
    doNotCacheGlobal: ['password'],
    doNotCacheCustom: { 'https://spiderman.com/graphql': ['villans'] },
  };

  test('Function should return true if sensitive data is found in global check.', () => {
    const urlObject = new URL('https://myapi.com/graphql');
    const queryCST = { operationType: 'query', fields: ['password', 'name', 'email'] };
    const result = doNotCacheCheck(queryCST, urlObject, settings);
    expect(result).toBe(true);
  });

  test('Function should return false if sensitive data is not found in global check.', () => {
    const urlObject = new URL('https://myapi.com/graphql');
    const queryCST = { operationType: 'query', fields: ['name', 'email'] };
    const result = doNotCacheCheck(queryCST, urlObject, settings);
    expect(result).toBe(false);
  });

  test('Function should return true if sensitive data is found in specific url.', () => {
    const urlObject = new URL('https://spiderman.com/graphql');
    const queryCST = { operationType: 'query', fields: ['name', 'villans'] };
    const result = doNotCacheCheck(queryCST, urlObject, settings);
    expect(result).toBe(true);
  });

  test('Function should return false if sensitive data is not found in specific url.', () => {
    const urlObject = new URL('https://spiderman.com/graphql');
    const queryCST = { operationType: 'query', fields: ['name', 'hometown'] };
    const result = doNotCacheCheck(queryCST, urlObject, settings);
    expect(result).toBe(false);
  });
});
