import debug from 'debug';
import * as Sentry from '@sentry/node';
import { dataSources } from '@thatconference/api';

const dlog = debug('that:api:brinks:validateManualOrder');
const productStoreFunc = dataSources.cloudFirestore.product;

export default function validateManualOrder({ orderData, firestore }) {
  dlog('validateManualOrder called');
  let eventId;
  let lineItems;
  let productIds;
  let productStore;
  try {
    eventId = orderData.event;
    lineItems = orderData.lineItems;
    productIds = lineItems.map(li => li.productId);
    productStore = productStoreFunc(firestore);
  } catch (err) {
    return Promise.reject(err);
  }

  return productStore.getBatch(productIds).then(products => {
    const errorList = [];
    if (products.length !== productIds.length) {
      errorList.push(
        `Not all products in manual order found in product collection`,
      );
    }
    if (
      products.filter(p => p.eventId === eventId).length !== productIds.length
    ) {
      errorList.push(
        `Product(s) in manual order which don't exist in eventId ${eventId}`,
      );
    }
    if (products.filter(p => p.type === 'MEMBERSHIP').length > 0) {
      errorList.push(
        `'MEMBERSHIP' type products cannot be added to manual orders`,
      );
    }

    if (errorList.length > 0) {
      Sentry.setContext('products', { products });
      Sentry.setContext('order', { orderData });
      Sentry.setContext('errors', errorList);
      const issueId = Sentry.captureException(
        new Error('Manual order validation failed', scope =>
          scope.setLevel('error'),
        ),
      );
      throw new Error(
        `Manual order validation falied. Sentry issue id: ${issueId}`,
      );
    }

    return { products };
  });
}
