import debug from 'debug';
import * as Sentry from '@sentry/node';
import validateManualOrder from '../lib/that/validateManualOrder';
import thatCreateOrderAndAllocations from '../lib/that/createOrderAndAllocations';

const dlog = debug('that:api:brinks:thatEventManualOrderCreatedMw');

export default async function thatEventManualOrderCreated(req, res, next) {
  dlog('thatEventManualOrderCreated middleware called');

  const orderEvents = req.app.get('orderEvents');
  const firestore = req.app.get('firestore');
  const { thatBrinks, stripeEvent } = req;
  thatBrinks.stages.push('thatEventManualOrderCreated');

  if (stripeEvent.type !== 'that.order.manual.created') {
    dlog('next(), not type that.order.manual.created');
    return next();
  }

  dlog('stripeEvent:: %o', stripeEvent);
  const orderData = stripeEvent.order;
  orderData.orderDate = new Date(orderData.orderDate);

  Sentry.setTags({
    memberId: orderData.member,
    stripeCustomerId: 'n/a',
    createdBy: orderData.createdBy,
  });

  const { products } = await validateManualOrder({ orderData, firestore });

  return thatCreateOrderAndAllocations({
    orderData,
    products,
    thatBrinks,
    firestore,
  })
    .then(r => {
      dlog('orders written result: %o', r);
      const { order, orderAllocations } = r;
      thatBrinks.isProcessed = true;
      orderEvents.emit('orderCreated', {
        firestore,
        products,
        order: order || {},
        orderAllocations: orderAllocations || [],
      });

      return next();
    })
    .catch(err => next(err));
}
