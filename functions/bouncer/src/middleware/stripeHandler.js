/* eslint-disable no-console */
import debug from 'debug';
import stripelib from 'stripe';
import * as Sentry from '@sentry/node';
import envConfig from '../envConfig';
import pubSub from '../gcp/pubSub';
import {
  csCompletedValidate,
  csMetadataValidate,
  custCreatedValidate,
  custMetadataValidate,
} from '../validate/stripe';

const dlog = debug('that:api:functions:bouncer:middleware');
const stripe = stripelib(envConfig.stripe.apiKey);

export default async function stripeHandler(req, res, next) {
  dlog('stripe handler called');
  const whRes = {
    bouncer: true,
    queued: false,
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
    dlog('signature verification succeeded. Event Type:', event.type);
  } catch (err) {
    console.error('Bork, unable to verify signature %s', err.message);
    whRes.error = `webhook verfication error: ${err.message}`;
    Sentry.captureMessage(whRes.error);
    res.status(400).json(whRes);
    return;
  }

  Sentry.setTags({
    stripeEventType: event.type,
    stripeEventId: event.id,
  });
  switch (event.type) {
    case 'checkout.session.completed':
      // check stripe object (stripe issue)
      try {
        await csCompletedValidate(event);
      } catch (err) {
        Sentry.setTag('check', 'csComleteValidate');
        Sentry.captureException(err);
        whRes.error = err.message;
        res.status(400).json(whRes);
      }
      // check metadata (our issue)
      try {
        await csMetadataValidate(event);
      } catch (err) {
        Sentry.setTag('check', 'csMetadataValidate');
        Sentry.captureException(err);
        whRes.error = err.message;
        res.status(200).json(whRes);
      }
      // check if seen before
      //   no. race condition with queue
      break;
    case 'customer.created':
      // check stripe object
      try {
        await custCreatedValidate(event);
      } catch (err) {
        Sentry.setTag('check', custCreatedValidate);
        Sentry.captureException(err);
        whRes.error = err.message;
        res.status(400).json(whRes);
      }
      // check metadata
      try {
        await custMetadataValidate(event);
      } catch (err) {
        Sentry.setTag('check', 'custMetadataValidate');
        Sentry.captureException(err);
        whRes.error = err.message;
        res.status(200).json(whRes);
      }
      break;
    default:
      whRes.error = `unhandled Stripe webhook event received ${event.type}`;
      console.log(whRes.error);
      Sentry.captureMessage(whRes.error);
      res.status(200).json(whRes);
  }

  dlog('queuing event type %s', event.type);
  event.someShit = 'Brett set this';
  pubSub
    .sendMessage(event)
    .then(k => {
      dlog('queue success %o', k);
      whRes.queued = true;
      whRes.message = k;
      res.status(200).json(whRes);
    })
    .catch(err => {
      dlog('queued not so good %o', err);
      Sentry.captureException(err);
      whRes.error = err.message;
      res.status(500).json(whRes);
    });
}
