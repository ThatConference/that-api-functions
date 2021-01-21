/* eslint-disable no-console */
import debug from 'debug';
import * as Sentry from '@sentry/node';
import { csCompletedValidate, csMetadataValidate } from '../validate/stripe';

const dlog = debug('that:api:functions:bouncer:stripeEventCsCompleted');

export default function stripeEventCsCompleted(req, res, next) {
  dlog('stripe event checkout session succeeded called');

  const { whRes, stripeEvent } = req;

  if (stripeEvent.type !== 'checkout.session.completed') {
    dlog('next(), not type checkout.session.completed ');
    return next();
  }

  return Promise.all([
    csCompletedValidate(stripeEvent).catch(err => {
      Sentry.captureException(err);
      return {
        name: 'csCompletedValidate',
        status: 400,
        err,
      };
    }),
    csMetadataValidate(stripeEvent).catch(err => {
      Sentry.captureException(err);
      return {
        name: 'csMetadataValidate',
        status: 200,
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
