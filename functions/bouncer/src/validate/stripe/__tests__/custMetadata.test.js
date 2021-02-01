/* eslint-disable arrow-body-style */
import { custMetadataValidate } from '../index';
import custCreatedJson from './data/customerCreated.json';

describe('Test customer created metadatada object', () => {
  it('validates against checkout json', () => {
    // Promise-based test
    return custMetadataValidate(custCreatedJson).then(result => {
      expect(result).toBe(true);
    });
  });
});
