import debug from 'debug';
import * as Sentry from '@sentry/node';
import constants from '../constants';
import updateSubFromStripeEvent from '../lib/that/updateSubFromStripeEvent';

const dlog = debug('that:api:brinks:stripeEventInoicePaidMw');

export default function stripeEventInvoicePaid(req, res, next) {
  dlog('stripeEventInvoicePaid middleware called');

  const firestore = req.app.get(constants.BRINKS.FIRESTORE);
  const orderEvents = req.app.get(constants.BRINKS.ORDER_EVENTS);
  const { thatBrinks, stripeEvent } = req;

  if (stripeEvent.type !== 'invoice.paid') {
    dlog('next(), not type invoice.paid');
    return next();
  }

  const invoiceData = stripeEvent.data.object;

  if (invoiceData?.subscription?.current_period_end === undefined) {
    // not a subscription invoice (we assume?)
    // or first subscription invoice
    thatBrinks.isProcessed = true;
    Sentry.setContext('invoice.paid', {
      eventId: stripeEvent.id,
      invoiceId: invoiceData.id,
      customer: invoiceData.customer,
    });
    Sentry.captureMessage(
      `Stripe event 'invoice.paid' not a subscription invoice`,
      scope => scope.setLevel(Sentry.Severity.Warning),
    );
    return next();
  }

  const firstInvoiceCheck = 3600 * 24; // one day (seconds)
  const startDrift =
    invoiceData.subscription.start_date -
    invoiceData.subscription.current_period_start;
  dlog('startDrift', startDrift);
  // check if first subscription invoice. If yes, ignore
  // Stripe states there is a possibility of drift between these date due to
  // subscription back-dating. This is here, just in case...
  if (Math.abs(startDrift) < firstInvoiceCheck) {
    dlog('next(), first invoice for subscription. ignoring');
    thatBrinks.isProcessed = true;
    return next();
  }

  const stripeCustId = invoiceData.customer;
  const subscriptionId = invoiceData.subscription.id;
  const cancelAtPeriodEnd = invoiceData.subscription.cancel_at_period_end;
  const currentPeriodEnd = invoiceData.subscription.current_period_end;
  if (
    !stripeCustId === undefined ||
    !subscriptionId === undefined ||
    !cancelAtPeriodEnd === undefined ||
    !currentPeriodEnd === undefined
  ) {
    // should never happen fields validated in bouncer
    thatBrinks.errorMsg = `missing data from customer.subscription.updated stripe event object`;
    thatBrinks.sentryLevel = 'error';
    console.log(thatBrinks.errorMsg);
    Sentry.setTag('stripe', 'invalid_event_data');
    Sentry.setContext('invoice.paid_data', {
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
      if (!result?.result) {
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

      dlog('update subscription from invoice.paid complete');
      thatBrinks.isProcessed = true;
      orderEvents.emit('subscriptionRenew', {
        member: result.member,
        subscriptionId,
      });

      return next();
    })
    .catch(err => next(err));
}
