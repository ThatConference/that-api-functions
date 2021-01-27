import debug from 'debug';
import stripelib from 'stripe';
import envConfig from '../../envConfig';

const dlog = debug('that:api:functions:brinks:getExpandedCheckoutSession');
const stripe = stripelib(envConfig.stripe.apiSecretKey);

export default function getExpandedCheckoutSession(checkoutSessionId) {
  dlog('getExpandedCheckoutSession called');

  return stripe.checkout.sessions.retrieve(checkoutSessionId, {
    expand: ['line_items'],
  });
}
