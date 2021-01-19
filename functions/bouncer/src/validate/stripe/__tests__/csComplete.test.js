/* eslint-disable arrow-body-style */
import { csCompleteValidate } from '../index';
import checkoutJson from './data/checkoutCompleteEvent.json';

describe('Test checkout complete object', () => {
  it('validates against checkout json', () => {
    // Promise-based test
    return csCompleteValidate(checkoutJson).then(result => {
      expect(result).toBe(true);
    });
  });
});
