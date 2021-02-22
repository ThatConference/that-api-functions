// determines if stripe event has already been processed
import debug from 'debug';
import orderStore from '../dataSources/cloudFirestore/order';

const dlog = debug('that:api:brinks:isEventProcessed');

export default ({ stripeEventId, firestore }) => {
  dlog('isEventProcessed called for %s', stripeEventId);

  return orderStore(firestore)
    .findByStripeEvent(stripeEventId)
    .then(result => result && result.length > 0);
};
