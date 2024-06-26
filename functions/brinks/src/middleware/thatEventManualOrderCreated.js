import debug from 'debug';
import * as Sentry from '@sentry/node';
import { dataSources } from '@thatconference/api';
import validateManualOrder from '../lib/that/validateManualOrder';
import thatCreateOrderAndAllocations from '../lib/that/createOrderAndAllocations';
import constants from '../constants';

const dlog = debug('that:api:brinks:thatEventManualOrderCreatedMw');
const memberStoreFunc = dataSources.cloudFirestore.member;

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

  const memberStore = memberStoreFunc(firestore);
  let member;
  try {
    member = await memberStore.get(orderData.member);
  } catch (err) {
    return next(err);
  }
  if (!member?.email) {
    return next(new Error(`No member found for id ${orderData.member}`));
  }

  let products;
  try {
    ({ products } = await validateManualOrder({ orderData, firestore }));
  } catch (err) {
    return next(err);
  }

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
      if (typeof order !== 'object') {
        Sentry.setTags({
          order,
          orderAllocations,
        });
        Sentry.setContext('order', { order });
        return next(
          new Error(`Order from thatCreateOrderAndAllocations not an object`),
        );
      }

      orderEvents.emit(constants.ORDER_EVENT_EMITTER.ORDER_CREATED, {
        firestore,
        products,
        order,
        orderAllocations: orderAllocations || [],
        member,
      });

      return next();
    })
    .catch(err => next(err));
}
