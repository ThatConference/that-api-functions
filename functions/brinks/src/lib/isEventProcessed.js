// determines if stripe event has already been processed
import debug from 'debug';
import { Firestore } from '@google-cloud/firestore';
import { dataSources } from '@thatconference/api';

const dlog = debug('that:api:functions:brinks:isEventProcessed');
const firestore = new Firestore();
const orderStore = dataSources.cloudFirestore.order;

export default stripeEventId => {
  dlog('isEventProcessed called for %s', stripeEventId);

  return orderStore(firestore)
    .findByStripeEvent(stripeEventId)
    .then(result => result && result.length > 0);
};
