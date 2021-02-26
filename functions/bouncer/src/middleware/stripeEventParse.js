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

  const isProduction = process.env.NODE_ENV === 'production';
  if (event.livemode && !isProduction) {
    whRes.errorMsg = 'TEST mode stripe event sent to PRODUCTION Bouncer';
    Sentry.setTag('stripe', 'livemode failure');
    Sentry.setContext('stripe event', JSON.stringify(event));
    Sentry.level(Sentry.Severity.Error);
    Sentry.captureMessage(whRes.errorMsg); // force capture as 'error'
    console.error(whRes.errorMsg);
    return next({
      status: 200, // resolve the hook, we dont' want it sent again
      whRes,
    });
  }

  return next();
}
