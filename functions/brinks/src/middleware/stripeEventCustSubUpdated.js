import debug from 'debug';
import * as Sentry from '@sentry/node';
import constants from '../constants';
import updateSubFromStripeEvent from '../lib/that/updateSubFromStripeEvent';

const dlog = debug('that:api:brinks:stripeEventCustSubUpMw');

export default function stripeEventCustSubUpdated(req, res, next) {
  dlog('stripeEventCustSubUpdated middleware called');

  const orderEvents = req.app.get(constants.BRINKS.ORDER_EVENTS);
  const firestore = req.app.get(constants.BRINKS.FIRESTORE);
  const { thatBrinks, stripeEvent } = req;
  thatBrinks.stages.push('stripeEventCustSubUpdated');

  if (stripeEvent.type !== 'customer.subscription.updated') {
    dlog('next(), not type customer.subscription.updated');
    return next();
  }

  const subData = stripeEvent.data.object;

  // check if cancel_at_period_end has changed.
  if (
    stripeEvent.data?.previous_attributes?.cancel_at_period_end === undefined
  ) {
    dlog(`event does not change cancel_at_period_end, skipping event.`);
    thatBrinks.isProcessed = true;
    return next();
  }

  if (subData.status !== 'active') {
    dlog(
      `event subscription is not active (${subData.status}). skipping event`,
    );
    thatBrinks.isProcessed = true;
    return next();
  }

  const stripeCustId = subData.customer;
  const subscriptionId = subData.id;
  const cancelAtPeriodEnd = subData.cancel_at_period_end;
  const currentPeriodEnd = subData.current_period_end;
  if (
    stripeCustId === undefined ||
    subscriptionId === undefined ||
    cancelAtPeriodEnd === undefined ||
    currentPeriodEnd === undefined
  ) {
    // should never happen fields validated in bouncer
    thatBrinks.errorMsg = `missing data from customer.subscription.updated stripe event object`;
    thatBrinks.sentryLevel = 'error';
    Sentry.setTag('stripe', 'invalid_event_data');
    Sentry.setContext('customer.subscription.updated_data', {
      stripeCustId,
      subscriptionId,
      cancelAtPeriodEnd,
      currentPeriodEnd,
    });
    res.status(200);
    return next(thatBrinks.errorMsg);
  }

  return updateSubFromStripeEvent({
    stripeCustId,
    subscriptionId,
    cancelAtPeriodEnd,
    currentPeriodEnd,
    firestore,
  })
    .then(result => {
      if (result?.result !== true) {
        thatBrinks.errorMsg =
          result.reason ||
          'Stripe Customer id not found or subscription id mismatch';
        thatBrinks.sentryLevel = Sentry.Severity.Warning;
        Sentry.setContext('Subscription Info', {
          stripeCustId,
          subscriptionId,
          cancelAtPeriodEnd,
          currentPeriodEnd,
        });
        Sentry.setTag('stripe', 'stripeCustomerId_subId_notFound');
        res.status(200);
        return next(thatBrinks.errorMsg);
      }

      dlog('update subscription from subscription change complete');
      thatBrinks.isProcessed = true;
      orderEvents.emit('subscriptionChange', {
        member: result.member,
        subscriptionId,
        cancelAtPeriodEnd,
      });

      return next();
    })
    .catch(err => next(err));
}
