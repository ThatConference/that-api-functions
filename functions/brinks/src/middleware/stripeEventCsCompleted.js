import debug from 'debug';
import * as Sentry from '@sentry/node';
import validateCheckoutSession from '../lib/stripe/validateCheckoutSession';
import createOrderAndAllocations from '../lib/createOrderAndAllocations';

const dlog = debug('that:api:functions:brinks:stripeEventCsCompletedMw');

export default async function stripeEventCsCompleted(req, res, next) {
  dlog('stripeEventCsCompleted middleware called');

  const { thatBrinks, stripeEvent } = req;
  thatBrinks.stages.push('stripeEventCsCompleted');

  if (stripeEvent.type !== 'checkout.session.completed') {
    dlog('next(), not type checkout.session.completed');
    return next();
  }

  const checkoutData = stripeEvent.data.object;

  let validateResult;
  try {
    validateResult = await validateCheckoutSession(checkoutData);
  } catch (err) {
    return next(err);
  }
  const { products, member } = validateResult;

  Sentry.setTags({
    memberId: member.id,
    stripeCustomerId: member.stripeCustomerId,
  });

  return createOrderAndAllocations({
    stripeEvent,
    products,
    thatBrinks,
  })
    .then(r => {
      dlog('batch write result: %o', r);
      thatBrinks.isProcessed = true;
      return next();
    })
    .catch(err => next(err));

  // validate stripe event data against database
  // - check memberId<->custId matches
  // - query and check products
  // create new order
  // add tickets/products to orderAllocation collection
}
