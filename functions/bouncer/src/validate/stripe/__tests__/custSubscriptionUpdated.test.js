/* eslint-disable arrow-body-style */
import { custSubscriptionUpdatedValidate } from '../index';
import custSubscriptionUpdatedJson from './data/custSubscriptionUpdated.json';

describe('Test customer subscription updated object', () => {
  it('validates against customer subscription updated json', () => {
    // Promise-based test
    return custSubscriptionUpdatedValidate(custSubscriptionUpdatedJson).then(
      result => {
        expect(result).toBe(true);
      },
    );
  });
});
