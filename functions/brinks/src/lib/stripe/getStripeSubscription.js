import debug from 'debug';
import stripelib from 'stripe';
import envConfig from '../../envConfig';

const dlog = debug('that:api:brinks:getStripeSubscription');
const stripe = stripelib(envConfig.stripe.apiSecretKey, {
  apiVersion: envConfig.stripe.apiVersion,
});

export default function getStripeSubscription(subscriptionId) {
  dlog('getStripeSubscriptiong called for %s', subscriptionId);
  return stripe.subscriptions.retrieve(subscriptionId);
}
