import debug from 'debug';

const dlog = debug('that:api:functions:brinks:createOrderFromCheckout');

// member and products must be validated before being processed here
export default function createOrderFromCheckout({ checkoutSession, products }) {
  dlog('createOrderFromCheckout called id: %s', checkoutSession.id);

  const { metadata } = checkoutSession;
  const { memberId, eventId } = metadata;
  const checkoutLineItems = checkoutSession.line_items.data;

  // build line items off of checkout session lineitem list pulling in product
  // match verifications done in verification section
  const lineItems = checkoutLineItems.map(stripeLi => {
    const product = products.find(
      p => p.processor.itemRefId === stripeLi.price.id,
    );
    return {
      product: product.id,
      quantity: stripeLi.quantity,
      unitPrice: stripeLi.price.unit_amount / 100,
      totalAmount: stripeLi.amount_total / 100,
      stripeProductId: stripeLi.price.product,
    };
  });

  const { breakdown } = checkoutSession.total_details;
  const discounts = breakdown
    ? breakdown.discounts.map(d => ({
        amount: d.amount,
        promotionCode: d.discount.promotion_code,
        name: d.discount.coupon.name,
        amountOff: d.discount.coupon.amount_off,
        percentOff: d.discount.coupon.percent_off,
      }))
    : [];

  const now = new Date();
  const newOrder = {
    member: memberId,
    event: eventId,
    stripePaymentIntentId: checkoutSession.payment_intent,
    stripeCheckoutSessionId: checkoutSession.id,
    stripeMode: checkoutSession.mode,
    stripeSubscription: checkoutSession.subscription,
    stripeLivemode: checkoutSession.livemode,
    total: checkoutSession.amount_total / 100,
    amountDiscounted: checkoutSession.total_details.amount_discount,
    discounts,
    lineItems,
    createdAt: now,
    lastUpdatedAt: now,
    createdBy: memberId,
    lastUpdatedBy: memberId,
  };

  return newOrder;
}
