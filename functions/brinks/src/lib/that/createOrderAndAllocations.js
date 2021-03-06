// createOrderAndAllocations from THAT event flow
import debug from 'debug';
import generateAllocationsFromOrder from '../generateAllocationsFromOrder';
import orderStoreFunc from '../../dataSources/cloudFirestore/order';

const dlog = debug('that:api:brinks:that:createOrderAndAllocations');

export default function createOrderAndAllocations({
  orderData,
  products,
  thatBrinks,
  firestore,
}) {
  dlog('createOrderAndAllocations for THAT event called');

  // update order (createOrderFrom `checkout` not required)
  const newLineItems = orderData.lineItems.map(li => {
    const product = products.find(p => p.id === li.productId);
    const newLi = {
      ...li,
      product: li.productId,
      productType: product.type,
      unitPrice: 0,
      totalAmount: 0,
    };
    delete newLi.productId;
    return newLi;
  });
  const now = new Date();
  const newOrder = {
    ...orderData,
    total: 0,
    amountDiscounted: '100%',
    createdAt: now,
    lastUpdatedAt: now,
    createdBy: orderData.createdBy,
    lastUpdatedBy: orderData.createdBy,
    stripeEventId: thatBrinks.stripeEventId, // The id used to verify if processed already (thatEvent.id)
    stripePaymentIntentReceiptUrl: null,
    lineItems: newLineItems,
    status: orderData.status ? orderData.status : 'COMPLETE',
  };

  const orderAllocations = generateAllocationsFromOrder({
    order: newOrder,
    orderCreatedAt: newOrder.orderDate,
  });

  dlog('newOrder:: %o', newOrder);
  dlog('orderAllocations:: %o', orderAllocations);

  let orderStore;
  try {
    orderStore = orderStoreFunc(firestore);
  } catch (err) {
    return Promise.reject(err);
  }

  return orderStore.transactionWriteOrderAndAllocations({
    newOrder,
    allocations: orderAllocations,
  });
}
