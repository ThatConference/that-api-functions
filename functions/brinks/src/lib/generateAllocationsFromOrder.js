import debug from 'debug';

const dlog = debug('that:api:brinks:generateAllocationsFromOrder');

export default function generateAllocationsFromOrder({
  order,
  orderCreatedAt,
}) {
  dlog('generateAllocationsFromOrder called');

  const { lineItems } = order;
  const orderAllocations = [];

  // create an allocation for each quantity of each line item
  lineItems.forEach(lineItem => {
    const qty = lineItem.quantity;
    const { isBulkPurchase } = lineItem;
    dlog(`line item isBulkPurchase: %s, qty: %d`, isBulkPurchase, qty);
    for (let i = 0; i < qty; i += 1) {
      // note, we don't have an order id yet
      const allocation = {
        event: order.event,
        purchasedBy: order.member,
        product: lineItem.product,
        productType: lineItem.productType,
        uiReference: lineItem.uiReference || null,
        orderType: order.orderType,
        eventActivities: lineItem.eventActivities,
        isAllocated: !isBulkPurchase,
        allocatedTo: isBulkPurchase ? null : order.member,
        hasCheckedIn: false,
        hasCompletedQuestions: false,
        tshirtSize: null,
        hoodieSize: null,
        dietaryRequirement: null,
        dietaryOther: null,
        enrollmentStatus: 'NOT_STARTED',
        purchaseStatus: 'COMPLETE',
        createdAt: orderCreatedAt,
        lastUpdatedAt: orderCreatedAt,
        lastUpdatedBy: order.createdBy,
      };
      orderAllocations.push(allocation);
    }
  });

  return orderAllocations;
}

/*
 * isBulkPurchase
 * when false the purchase is for the individual
 * and will be auto-alocated to them.
 * Quantity validations have already been done before this call
 */
