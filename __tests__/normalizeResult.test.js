import { normalizeResult } from '../helpers/normalizeResult';

xdescribe('Normalizer.', () => {
  test('Function should successfully normalize single object', () => {
    const result = normalizeResult({ one: 1, two: 2, three: 3 });
  });
});
