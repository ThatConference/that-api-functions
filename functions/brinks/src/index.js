import 'dotenv/config';
import express from 'express';
import debug from 'debug';
import * as Sentry from '@sentry/node';
import responseTime from 'response-time';
import { Firestore } from '@google-cloud/firestore';
import {
  decodeMessage,
  eventProcessedCheck,
  stripeEventCsCompleted,
  stripeEventCustCreated,
  stripeEventCustSubUpdated,
  stripeEventInvoicePaid,
  thatEventManualOrderCreated,
  stripeEventEnd,
  errorHandler,
} from './middleware';
import orderEventEmitter from './lib/events/orders';
import constants from './constants';

const dlog = debug('that:api:brinks');
const api = express();
const firestore = new Firestore();

api.set(constants.BRINKS.FIRESTORE, firestore);
api.set(constants.BRINKS.ORDER_EVENTS, orderEventEmitter());

let version;
(async () => {
  let p;
  try {
    // eslint-disable-next-line import/no-unresolved
    p = await import('./package.json');
  } catch {
    p = await import('../package.json');
  }
  version = p.version;
})();
const defaultVersion = `brinks@${version}`;
dlog('setting up');
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.THAT_ENVIRONMENT,
  release: process.env.SENTRY_VERSION || defaultVersion,
  debug: process.env.NODE_ENV === 'development',
  normalizeDepth: 6,
});
Sentry.configureScope(scope => {
  scope.setTags({
    thatApp: 'brinks',
    subSystem: 'checkout',
  });
});

// eslint-disable-next-line no-unused-vars
function dumpBody(req, res, next) {
  dlog('dump body called');
  console.log('method::', req.method);
  console.log('body::', req.body);
  // res.status(200).end();
  next();
}

export const handler = api
  .use(Sentry.Handlers.requestHandler())
  .use(responseTime())
  .post('/stripe-event', decodeMessage)
  .post('/stripe-event', eventProcessedCheck)
  .post('/stripe-event', stripeEventCsCompleted)
  .post('/stripe-event', stripeEventCustCreated)
  .post('/stripe-event', stripeEventCustSubUpdated)
  .post('/stripe-event', stripeEventInvoicePaid)
  .post('/stripe-event', thatEventManualOrderCreated)
  .post('/stripe-event', stripeEventEnd)

  // .use(Sentry.Handlers.errorHandler())
  .use(errorHandler);

/* steps
 * decode message
 * check if already processed
 * middleware per event type to process
 * handle no matching event type (queue for review, etc.)
 */
