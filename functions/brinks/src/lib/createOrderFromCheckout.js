import debug from 'debug';

const dlog = debug('that:api:brinks:createOrderFromCheckout');

// member and products must be validated before being processed here
export default function createOrderFromCheckout({ checkoutSession, products }) {
  dlog('createOrderFromCheckout called id: %s', checkoutSession.id);

  const { metadata } = checkoutSession;
  const {
    memberId,
    eventId,
    checkoutLineItems: metadataCoLineItmes,
  } = metadata;
  const coLineItems = JSON.parse(metadataCoLineItmes);
  dlog('coLineItems::%o', coLineItems);
  const checkoutSessionLineItems = checkoutSession.line_items.data;

  // build line items off of checkout session lineitem list pulling in product
  // match verifications done in verification section
  const lineItems = checkoutSessionLineItems.map(stripeLi => {
    const product = products.find(
      p => p.processor.itemRefId === stripeLi.price.id,
    );
    const coLineItem = coLineItems.find(co => co.productId === product.id);
    return {
      product: product.id,
      quantity: stripeLi.quantity,
      unitPrice: stripeLi.price.unit_amount / 100,
      totalAmount: stripeLi.amount_total / 100,
      stripeProductId: stripeLi.price.product,
      isBulkPurchase: coLineItem.isBulkPurchase,
      productType: product.type,
      uiReference: product.uiReference || null,
      eventActivities: product.eventActivities ?? [],
    };
  });

  // save discount code information
  const { breakdown } = checkoutSession.total_details;
  const discounts = Array.isArray(breakdown?.discounts)
    ? breakdown.discounts.map(d => ({
        amount: d.amount,
        promotionCode: d.discount.promotion_code,
        name: d.discount.coupon.name,
        amountOff: d.discount.coupon.amount_off,
        percentOff: d.discount.coupon.percent_off,
        couponId: d.discount.coupon.id,
      }))
    : [];

  const now = new Date();
  const newOrder = {
    member: memberId,
    event: eventId,
    stripePaymentIntentId: checkoutSession.payment_intent,
    stripeCheckoutSessionId: checkoutSession.id,
    stripeMode: checkoutSession.mode,
    stripeSubscriptionId: checkoutSession.subscription,
    stripeLivemode: checkoutSession.livemode,
    total: checkoutSession.amount_total / 100,
    amountDiscounted: checkoutSession.total_details.amount_discount / 100,
    discounts,
    lineItems,
    createdAt: now,
    lastUpdatedAt: now,
    createdBy: memberId,
    lastUpdatedBy: memberId,
    status: 'COMPLETE',
    orderType: 'REGULAR',
  };

  return newOrder;
}
