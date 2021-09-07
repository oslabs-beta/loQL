import { ourMD5 } from '../helpers/md5';

xdescribe('The hashing function.', () => {
  test('Function should hash string to the same result each time.', () => {
    const result = ourMD5('This is a long string that should be hashed!');
    const result2 = ourMD5('This is a long string that should be hashed!');
    expect(result).toEqual(result2);
  });
});
