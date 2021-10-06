import debug from 'debug';
import stripelib from 'stripe';
import envConfig from '../../envConfig';

const dlog = debug('that:api:bouncer:getExpandedCheckoutSession');
const stripe = stripelib(envConfig.stripe.apiSecretKey);

export default function getExpandedInvoiceSubscription(invoiceId) {
  dlog('getExpandedCheckoutSession called for %s', invoiceId);

  return stripe.invoices.retrieve(invoiceId, {
    expand: ['subscription'],
  });
}
