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
  it('throws when order.event is too short', () => {
    manualOrderJson.order.lineItems[0].quantity = 1;
    manualOrderJson.order.event = 'short_id';
    return expect(manualOrderEventValidate(manualOrderJson)).rejects.toThrow(
      'order.event must be at least 12 characters',
    );
  });
  it('throws when eventId is too short', () => {
    manualOrderJson.order.lineItems[0].quantity = 1;
    manualOrderJson.order.event = 'eventId_@_12';
    manualOrderJson.eventId = 'short_id';
    return expect(manualOrderEventValidate(manualOrderJson)).rejects.toThrow(
      'eventId must be at least 12 characters',
    );
  });
});

// these tests are a bit fragile
