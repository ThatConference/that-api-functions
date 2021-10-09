/* eslint-disable arrow-body-style */
import { invoiceSubscriptionValidate } from '../index';
import invoiceSubscriptionJson from './data/invoiceSubscription.json';

describe('Test invoice subscription object', () => {
  it('validates against invoice subscription json', () => {
    // Promise-based test
    return invoiceSubscriptionValidate(invoiceSubscriptionJson).then(result => {
      expect(result).toBe(true);
    });
  });
});
