import debug from 'debug';

const dlog = debug('that:api:functions:brinks:generateAllocationsFromOrder');

export default function generateAllocationsFromOrder({
  order,
  orderCreatedAt,
}) {
  dlog('generateAllocationsFromOrder called');

  const { lineItems } = order;
  const orderAllocations = [];

  lineItems.forEach(lineItem => {
    const qty = lineItem.quantity;
    for (let i = 0; i < qty; i += 1) {
      // note, we don't have an order id yet
      const allocation = {
        event: order.event,
        purchasedBy: order.member,
        product: lineItem.product,
        isClaimed: false,
        createdAt: orderCreatedAt,
        lastUpdatedAt: orderCreatedAt,
      };
      orderAllocations.push(allocation);
    }
  });

  return orderAllocations;
}
