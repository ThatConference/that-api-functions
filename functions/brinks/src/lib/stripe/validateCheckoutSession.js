import debug from 'debug';
import * as Sentry from '@sentry/node';
import { dataSources } from '@thatconference/api';

const dlog = debug('that:api:functions:brinks:validateCheckoutSession');
const memberStore = dataSources.cloudFirestore.member;
const productStore = dataSources.cloudFirestore.product;

export default function validateCheckoutSession({
  checkoutSession,
  firestore,
}) {
  dlog('validateCheckoutSession called id: %s', checkoutSession.id);

  const checkoutLineItems = checkoutSession.line_items.data;
  const { metadata } = checkoutSession;
  const { memberId, eventId, productIds: rawProductIds } = metadata;
  const productIds = JSON.parse(rawProductIds);

  const memberFunc = memberStore(firestore).get(memberId);
  const productFunc = productStore(firestore).getBatch(productIds);

  return Promise.all([memberFunc, productFunc]).then(result => {
    const [member, products] = result;
    const errorList = [];
    if (member.stripeCustomerId !== checkoutSession.customer) {
      errorList.push(`member.stripeCustomerId doesn't match stripeCustomerId`);
    }
    if (products.length !== productIds.length) {
      errorList.push(`Not all Products found in product collection`);
    }
    if (
      products.filter(p => p.eventId === eventId).length !== productIds.length
    ) {
      errorList.push(
        `Product(s) in order which doesn't exist in eventId ${eventId}`,
      );
    }
    const matchedLineItems = checkoutLineItems.filter(lineItem =>
      products.some(p => p.processor.itemRefId === lineItem.price.id),
    );
    if (matchedLineItems.length !== checkoutLineItems.length) {
      errorList.push(
        `Checkout Session line items match on products not equal. LineItems: ${checkoutLineItems.length}, Matched: ${matchedLineItems.length}`,
      );
    }

    // TODO: check if product is currently on sale?

    if (errorList.length > 0) {
      Sentry.setContext('products', { products });
      Sentry.setContext('stripeLineItems', {
        stripeLineItems: checkoutSession.lineItems,
      });
      Sentry.setContext('metadata', metadata);
      Sentry.setContext('errors', errorList);
      const issueId = Sentry.captureException(
        new Error('Checkout Session Validation failed', scope =>
          scope.setLevel('error'),
        ),
      );
      throw new Error(
        `Checkout Session Validation falied. Sentry issue id: ${issueId}`,
      );
    }

    return { member, products };
  });
}
