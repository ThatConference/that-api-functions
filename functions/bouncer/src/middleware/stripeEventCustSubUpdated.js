/* eslint-disable no-console */
import debug from 'debug';
import * as Sentry from '@sentry/node';
import { custSubscriptionUpdatedValidate } from '../validate/stripe';

const dlog = debug('that:api:bouncer:stripeEventCustSubUpdated');

export default function stripeEventCustSubUpdated(req, res, next) {
  dlog('stripeEventCustSubUpdated middleware called');

  const { whRes, stripeEvent } = req;
  whRes.stages.push('stripeEventCustSubUpdated');

  if (stripeEvent.type !== 'customer.subscription.updated') {
    dlog('next(), not type customer.subscription.updated');
    return next();
  }

  return Promise.all([
    custSubscriptionUpdatedValidate(stripeEvent).catch(err => {
      Sentry.captureException(err);
      return {
        name: 'custSubscriptionUpdatedValidate',
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
        whRes.error = value.err;
        Sentry.setTag('stripe', 'failed_customerSubscriptionValidation');
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
