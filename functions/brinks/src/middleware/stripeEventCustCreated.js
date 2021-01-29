import debug from 'debug';
import * as Sentry from '@sentry/node';
import compareMemberToCustomer from '../lib/stripe/compareMemberToCustomer';

const dlog = debug('that:api:functions:brinks:stripeEventCustCreatedMw');

export default async function stripeEventCustCreated(req, res, next) {
  dlog('stripe event customerCreated called');

  const { thatBrinks, stripeEvent } = req;
  thatBrinks.stages.push('stripeEventCustCreated');

  if (stripeEvent.type !== 'customer.created') {
    dlog('next(), not type customer.created');
    return next();
  }

  const customer = stripeEvent.data.object;
  const { id: stripeCustomerId, metadata } = customer;
  const { memberId } = metadata;
  Sentry.setTags({
    memberId,
    stripeCustomerId,
  });

  return compareMemberToCustomer({ memberId, stripeCustomerId })
    .then(result => {
      if (!result) {
        thatBrinks.errorMsg(`New Stipe customer validation failed`);
        thatBrinks.sentryLevel = 'error';
        console.log(thatBrinks.errorMsg);
        res.status(200);
        return next(thatBrinks.errorMsg);
      }
      thatBrinks.isProcessed = true;
      return next();
    })
    .catch(err => next(err));

  // Using metadata from customer created retrieve member record(?) and
  // verify matching Stripe customerId
  // match, leave gracefully
  // no match, notify crew of issue
}
