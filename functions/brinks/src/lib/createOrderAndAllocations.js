import debug from 'debug';
import createOrderFromCheckout from './createOrderFromCheckout';
import generateAllocationsFromOrder from './generateAllocationsFromOrder';
import orderStore from '../dataSources/cloudFirestore/order';
import getPaymentIntentReceiptUrl from './stripe/getPaymentIntentReceiptUrl';
import applyMembershipAllocationsToMembers from './applyMembershipAllocationsToMembers';

const dlog = debug('that:api:brinks:createOrderAndAllocations');

export default async function createOrderAndAllocations({
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

  let paymentIntentReceiptUrl = null;
  if (newOrder.stripePaymentIntentId) {
    paymentIntentReceiptUrl = await getPaymentIntentReceiptUrl(
      newOrder.stripePaymentIntentId,
    );
  }
  newOrder.stripePaymentIntentReceiptUrl = paymentIntentReceiptUrl;

  return Promise.all([
    orderStore(firestore).transactionWriteOrderAndAllocations({
      newOrder,
      allocations: orderAllocations,
    }),
    applyMembershipAllocationsToMembers({
      order: newOrder,
      allocations: orderAllocations,
      firestore,
    }),
  ]);
}
