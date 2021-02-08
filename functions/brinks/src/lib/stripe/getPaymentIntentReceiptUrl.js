import debug from 'debug';
import stripelib from 'stripe';
import envConfig from '../../envConfig';

const dlog = debug('that:api:functions:brinks:getPaymentIntnentReceiptUrl');
const stripe = stripelib(envConfig.stripe.apiSecretKey);

export default function getPaymentIntentReceiptUrl(paymentIntentId) {
  dlog('getPaymentIntentReceiptUrl called for %s', paymentIntentId);

  return stripe.paymentIntents
    .retrieve(paymentIntentId)
    .then(pi => pi.charges.data[0].receipt_url);
}
