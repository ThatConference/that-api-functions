/* eslint-disable arrow-body-style */
import { manualOrderEventValidate } from '../index';
import manualOrderJson from './data/manualThatOrderCreated.json';

describe('Test manual order event object validation', () => {
  it('validates checkoutCompleteEvent.json correctly', () => {
    return manualOrderEventValidate(manualOrderJson).then(result => {
      expect(result).toBe(true);
    });
  });
  it('will pass without a status property', () => {
    delete manualOrderJson.order.status;
    return manualOrderEventValidate(manualOrderJson).then(result => {
      expect(result).toBe(true);
    });
  });
  it('throws on wrong isBulkPurchase quantity (> 1)', () => {
    manualOrderJson.order.lineItems[0].quantity = 3;
    return expect(manualOrderEventValidate(manualOrderJson)).rejects.toThrow(
      'order.lineItems[0].quantity must be less than or equal to 1',
    );
  });
});
