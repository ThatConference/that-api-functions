/* eslint-disable arrow-body-style */
import { csCompletedValidate } from '../index';
import checkoutJson from './data/checkoutCompleteEvent.json';

describe('Test checkout complete object', () => {
  it('validates against checkout json', () => {
    // Promise-based test
    return csCompletedValidate(checkoutJson).then(result => {
      expect(result).toBe(true);
    });
  });
});
