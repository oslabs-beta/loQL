import { ourMD5 } from '../helpers/md5';

describe('The hashing function.', () => {
  test('Function should hash string to the same result each time.', () => {
    const result = ourMD5('This is a long string that should be hashed!');
    const result2 = ourMD5('This is a long string that should be hashed!');
    expect(result).toEqual(result2);
  });

  test('Two strings should yield different results.', () => {
    const result = ourMD5('This is a short string');
    const result2 = ourMD5('This is a long string that should be hashed!');
    expect(result).not.toEqual(result2);
  });
});
