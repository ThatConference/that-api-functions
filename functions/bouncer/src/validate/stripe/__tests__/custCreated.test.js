/* eslint-disable arrow-body-style */
import { custCreatedValidate } from '../index';
import custCreatedJson from './data/customerCreated.json';

describe('Test customer created object', () => {
  it('validates against checkout json', () => {
    // Promise-based test
    return custCreatedValidate(custCreatedJson).then(result => {
      expect(result).toBe(true);
    });
  });
});
