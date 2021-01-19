/* eslint-disable arrow-body-style */
import { csMetadataValidate } from '../index';
import checkoutJson from './data/checkoutCompleteEvent.json';

describe('Test checkout complete object', () => {
  it('validates against checkout json', () => {
    // Promise-based test
    return csMetadataValidate(checkoutJson).then(result => {
      expect(result).toBe(true);
    });

    // expect(csMetadata({ metadata })).toBe(true);
  });
});
