/* eslint-disable no-console */
import debug from 'debug';
import * as Sentry from '@sentry/node';
import { custCreatedValidate, custMetadataValidate } from '../validate/stripe';

const dlog = debug('that:api:functions:bouncer:stripeEventCustCreated');

export default function stripeEventCustCreated(req, res, next) {
  dlog('stripe event customer created called');

  const { whRes, stripeEvent } = req;

  if (stripeEvent.type !== 'customer.created') {
    dlog('next(), not type customer.created');
    return next();
  }

  return Promise.all([
    custCreatedValidate(stripeEvent).catch(err => {
      Sentry.captureException(err);
      return {
        name: 'custCreatedValidate',
        status: 400,
        err,
      };
    }),
    custMetadataValidate(stripeEvent).catch(err => {
      Sentry.captureException(err);
      return {
        name: 'custMetadataValidate',
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
