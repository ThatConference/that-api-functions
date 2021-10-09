/* eslint-disable no-console */
import debug from 'debug';
import * as Sentry from '@sentry/node';
import { invoiceSubscriptionValidate } from '../validate/stripe';
import getExpandedInvoiceSubscription from '../lib/stripe/getExpandedInvoiceSubscription';

const dlog = debug('that:api:bouncer:stripEventInvoiceSubscription');

export default async function stripeEventInvoiceSubscription(req, res, next) {
  dlog('stripeEventInvoiceSubscription middleware called');

  const { whRes, stripeEvent } = req;
  whRes.stages.push('stripeEventInvoiceSubscription');

  if (stripeEvent.type !== 'invoice.paid') {
    dlog('next(), not type invoice.paid');
    return next();
  }

  let expInvoiceSubscription;
  try {
    expInvoiceSubscription = await getExpandedInvoiceSubscription(
      stripeEvent.data.object.id,
    );
  } catch (err) {
    Sentry.setTag('stripe', 'failed_getExpendedInvoiceSubscription');
    return next(err);
  }

  // preplace the invoice in the stripe event object with expanded version
  stripeEvent.data.object = expInvoiceSubscription;

  return Promise.all([
    invoiceSubscriptionValidate(stripeEvent).catch(err => {
      Sentry.captureException(err);
      return {
        name: 'invoiceSubscriptionValidate',
        status: 400,
        err,
      };
    }),
  ])
    .then(result => {
      const errors = result.reduce((acc, cur) => {
        if (cur.name) {
          acc.push(cur);
        }
        return acc;
      }, []);
      if (errors.length > 0) {
        const [value] = errors;
        console.log(`error validating ${value.name}`);
        Sentry.setTag('check', value.name);
        whRes.errorMsg = value.err.message;
        Sentry.setTag('stripe', 'failed_invoiceSubscriptionValidation');
        return next({
          status: value.status,
          whRes,
        });
      }

      req.whRes.isValid = true;
      return next();
    })
    .catch(err => next(err));
}
