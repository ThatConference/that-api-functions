/* eslint-disable no-console */
import debug from 'debug';
import stripelib from 'stripe';
import * as Sentry from '@sentry/node';
import envConfig from '../envConfig';

const dlog = debug('that:api:bouncer:stripeParseMw');
const stripe = stripelib(envConfig.stripe.apiKey);

export default function stripeEventParse(req, res, next) {
  dlog('stripe event parser called');

  const whRes = {
    bouncer: true,
    isQueued: false,
    isValid: false,
    isInHistory: false,
    stages: ['stripeEventParse'],
  };

  const sig = req.headers['stripe-signature'];
  dlog('here is our sig %s', sig);

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      envConfig.stripe.endpointSecret,
    );
    dlog(
      'signature verification succeeded. Event Type (%s), id: %s',
      event.type,
      event.id,
    );
  } catch (err) {
    console.error('Bork, unable to verify signature %s', err.message);
    whRes.errorMsg = `webhook verfication error: ${err.message}`;
    whRes.error = err;
    req.whRes = whRes;
    Sentry.setTag('stripe', 'hookValidationFailed');
    return next({
      status: 400,
      whRes,
    });
  }

  Sentry.setTags({
    stripeEventType: event.type,
    stripeEventId: event.id,
  });

  req.stripeEvent = event;
  req.whRes = whRes;
  return next();
}
