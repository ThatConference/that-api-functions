/* eslint-disable no-console */
import debug from 'debug';
import * as Sentry from '@sentry/node';
import { csCompletedValidate, csMetadataValidate } from '../validate/stripe';
import getExpandedCheckoutSession from '../lib/stripe/getExpandedCheckoutSession';

const dlog = debug('that:api:bouncer:stripeEventCsCompletedMw');

export default async function stripeEventCsCompleted(req, res, next) {
  dlog('stripeEventCsCompleted middleware called');

  const { whRes, stripeEvent } = req;
  whRes.stages.push('stripeEventCsCompleted');

  if (stripeEvent.type !== 'checkout.session.completed') {
    dlog('next(), not type checkout.session.completed ');
    return next();
  }

  let expCheckoutSession;
  try {
    expCheckoutSession = await getExpandedCheckoutSession(
      stripeEvent.data.object.id,
    );
  } catch (err) {
    return next(err);
  }

  // replace checkout session in event object with expanded version.
  stripeEvent.data.object = expCheckoutSession;

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
