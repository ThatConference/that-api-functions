import debug from 'debug';
import { dataSources } from '@thatconference/api';
import createOrderFromCheckout from './createOrderFromCheckout';
import generateAllocationsFromOrder from './generateAllocationsFromOrder';

const dlog = debug('that:api:functions:brinks:createOrderAndAllocations');
const orderStore = dataSources.cloudFirestore.order;

export default function createOrderAndAllocations({
  stripeEvent,
  products,
  thatBrinks,
  firestore,
}) {
  const checkoutSession = stripeEvent.data.object;
  dlog('createOrderAndAllocations called id: %s', checkoutSession.id);

  const newOrder = createOrderFromCheckout({ checkoutSession, products });
  newOrder.stripeEventId = stripeEvent.id;
  newOrder.orderDate = thatBrinks.orderCreatedAt;
  const orderAllocations = generateAllocationsFromOrder({
    order: newOrder,
    orderCreatedAt: thatBrinks.orderCreatedAt,
  });

  // return orderStore(firestore).batchWriteOrderAndAllocations({
  //   newOrder,
  //   allocations: orderAllocations,
  // });

  return orderStore(firestore).transactionWriteOrderAndAllocations({
    newOrder,
    allocations: orderAllocations,
  });
}
