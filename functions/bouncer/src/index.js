import 'dotenv/config';
import express from 'express';
import debug from 'debug';
import * as Sentry from '@sentry/node';
import responseTime from 'response-time';
import {
  stripeEventParse,
  stripeEventCsCompleted,
  stripeEventCustCreated,
  stripeEventQueue,
  stripeEventEnd,
  errorHandler,
} from './middleware';

const dlog = debug('that:api:functions:bouncer');
const api = express();

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

function postSession(req, res) {
  /*
   *
   */
  if (req.method === 'POST') {
    dlog('dump: %o', req.body);
    res.end();
  } else {
    dlog(`Non POST request %s`, req.method);
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.write(`Unsupported request method`);
    res.end();
  }
}

export const handler = api
  .use(Sentry.Handlers.requestHandler())
  .use(responseTime())
  .use('/newsession', postSession)
  .post('/stripe', stripeEventParse)
  .post('/stripe', stripeEventCsCompleted)
  .post('/stripe', stripeEventCustCreated)
  .post('/stripe', stripeEventQueue)
  .post('/stripe', stripeEventEnd)

  .use(Sentry.Handlers.errorHandler())
  .use(errorHandler);
