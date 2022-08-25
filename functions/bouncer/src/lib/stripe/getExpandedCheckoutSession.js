import debug from 'debug';
import stripelib from 'stripe';
import envConfig from '../../envConfig';

const dlog = debug('that:api:bouncer:getExpandedCheckoutSession');
const stripe = stripelib(envConfig.stripe.apiSecretKey, {
  apiVersion: envConfig.stripe.apiVersion,
});

export default function getExpandedCheckoutSession(checkoutSessionId) {
  dlog('getExpandedCheckoutSession called for %s', checkoutSessionId);

  return stripe.checkout.sessions.retrieve(checkoutSessionId, {
    expand: ['line_items', 'total_details.breakdown'],
  });
}
