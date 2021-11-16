import debug from 'debug';
import * as Sentry from '@sentry/node';
import validateManualOrder from '../lib/that/validateManualOrder';
import thatCreateOrderAndAllocations from '../lib/that/createOrderAndAllocations';
import constants from '../constants';

const dlog = debug('that:api:brinks:thatEventManualOrderCreatedMw');

export default async function thatEventManualOrderCreated(req, res, next) {
  dlog('thatEventManualOrderCreated middleware called');

  const orderEvents = req.app.get(constants.BRINKS.ORDER_EVENTS);
  const firestore = req.app.get(constants.BRINKS.FIRESTORE);
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
      const { order, orderAllocations, orderId } = r;
      thatBrinks.isProcessed = true;
      if (typeof order === 'object') order.id = orderId;
      else {
        Sentry.setTags({
          order,
          orderAllocations,
          orderId,
        });
        Sentry.setContext('order', { order });
        return next(
          new Error(`Order from thatCreateOrderAndAllocations not an object`),
        );
      }

      orderEvents.emit('orderCreated', {
        firestore,
        products,
        order,
        orderAllocations: orderAllocations || [],
      });

      return next();
    })
    .catch(err => next(err));
}
