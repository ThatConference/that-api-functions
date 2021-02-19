import debug from 'debug';
import * as Sentry from '@sentry/node';
import validateManualOrder from '../lib/that/validateManualOrder';
import thatCreateOrderAndAllocations from '../lib/that/createOrderAndAllocations';

const dlog = debug('that:api:brinks:thatEventManualOrderCreatedMw');

export default async function thatEventManualOrderCreated(req, res, next) {
  dlog('thatEventManualOrderCreated middleware called');

  const firestore = req.app.get('firestore');
  const { thatBrinks, stripeEvent } = req;
  thatBrinks.stages.push('thatEventManualOrderCreated');

  if (stripeEvent.type !== 'that.order.manual.created') {
    dlog('next(), not type that.order.manual.created');
    return next();
  }

  dlog('stripeEvent:: %o', stripeEvent);
  const orderData = stripeEvent.order;

  Sentry.setTags({
    memberId: orderData.member,
    adminSubmitted: orderData.adminSubmitted,
  });

  await validateManualOrder({ orderData, firestore });

  return thatCreateOrderAndAllocations({
    orderData,
    thatBrinks,
    firestore,
  })
    .then(r => {
      dlog('orders written result: %o', r);
      thatBrinks.isProcessed = true;
      return next();
    })
    .catch(err => next(err));
}
