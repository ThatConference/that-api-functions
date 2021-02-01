import 'dotenv/config';
import express from 'express';
import * as Sentry from '@sentry/node';
import responseTime from 'response-time';
import { Firestore } from '@google-cloud/firestore';
import {
  stripeEventParse,
  stripeEventCsCompleted,
  stripeEventCustCreated,
  stripeEventQueue,
  stripeEventEnd,
  errorHandler,
} from './middleware';

const api = express();
const firestore = new Firestore();

api.set('firestore', firestore);

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
const defaultVersion = `bouncer@${version}`;
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.SENTRY_VERSION || defaultVersion,
  debug: process.env.NODE_ENV === 'development',
});
Sentry.configureScope(scope => {
  scope.setTag('thatApp', 'bouncer');
  scope.setTag('subSystem', 'checkout');
});

export const handler = api
  .use(Sentry.Handlers.requestHandler())
  .use(responseTime())
  .post('/stripe', stripeEventParse)
  .post('/stripe', stripeEventCsCompleted)
  .post('/stripe', stripeEventCustCreated)
  .post('/stripe', stripeEventQueue)
  .post('/stripe', stripeEventEnd)

  .use(Sentry.Handlers.errorHandler())
  .use(errorHandler);
