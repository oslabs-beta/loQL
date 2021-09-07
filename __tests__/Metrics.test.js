import { Metrics } from '../helpers/metrics';

xdescribe('The Metrics class.', () => {
  test('Metrics class should create a new instance with the proper fields and methods.', () => {
    const metrics = new Metrics();
    expect(metrics.isCached).toBe(false);
    expect(typeof metrics.start).toBe('number');
  });
});
