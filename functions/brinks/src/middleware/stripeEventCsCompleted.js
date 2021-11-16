import debug from 'debug';
import * as Sentry from '@sentry/node';
import validateCheckoutSession from '../lib/that/validateCheckoutSession';
import createOrderAndAllocations from '../lib/createOrderAndAllocations';
import constants from '../constants';

const dlog = debug('that:api:brinks:stripeEventCsCompletedMw');

export default async function stripeEventCsCompleted(req, res, next) {
  dlog('stripeEventCsCompleted middleware called');

  const orderEvents = req.app.get(constants.BRINKS.ORDER_EVENTS);
  const firestore = req.app.get(constants.BRINKS.FIRESTORE);
  const { thatBrinks, stripeEvent } = req;
  thatBrinks.stages.push('stripeEventCsCompleted');

  if (stripeEvent.type !== 'checkout.session.completed') {
    dlog('next(), not type checkout.session.completed');
    return next();
  }

  const checkoutData = stripeEvent.data.object;

  let validateResult;
  try {
    // validates checkoutSession between database references
    // returning a member and products objects needed later
    validateResult = await validateCheckoutSession({
      checkoutSession: checkoutData,
      firestore,
    });
  } catch (err) {
    Sentry.setTag('stripe', 'validateCheckoutFailed');
    return next(err);
  }
  const { products, member } = validateResult;

  Sentry.setTags({
    memberId: member.id,
    stripeCustomerId: member.stripeCustomerId,
    createdBy: member.id,
  });

  return createOrderAndAllocations({
    stripeEvent,
    products,
    thatBrinks,
    firestore,
  })
    .then(r => {
      dlog('batch write result: %o', r);
      thatBrinks.isProcessed = true;
      const [result] = r;
      const { order, orderAllocations } = result;
      if (typeof order !== 'object') {
        Sentry.setTags({
          order,
          orderAllocations,
        });
        Sentry.setContext('order', { order });
        return next(
          new Error(`Order from createOrderAndAllocations not an object`),
        );
      }

      orderEvents.emit('orderCreated', {
        firestore,
        member,
        products,
        order,
        orderAllocations: orderAllocations ?? [],
      });

      return next();
    })
    .catch(err => next(err));

  // validate stripe event data against database
  // - check memberId<->custId matches
  // - query and check products
  // create new order
  // add tickets/products to orderAllocation collection
}
