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
  thatEventManualOrderCreated,
  stripeEventEnd,
  errorHandler,
} from './middleware';
import orderEventEmitter from './lib/events/orders';

const dlog = debug('that:api:brinks');
const api = express();
const firestore = new Firestore();

api.set('firestore', firestore);
api.set('orderEvents', orderEventEmitter());

let version;
(async () => {
  let p;
  try {
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
