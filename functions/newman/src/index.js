import 'dotenv/config';
import express from 'express';
import debug from 'debug';
import * as Sentry from '@sentry/node';
import responseTime from 'response-time';
import { Firestore } from '@google-cloud/firestore';
import { errorHandler, queueReader } from './middleware';

const dlog = debug('that:function:newman');
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
const defaultVersion = `newman@${version}`;
dlog('setting up');
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.THAT_ENVIRONMENT,
  release: process.env.SENTRY_VERSION || defaultVersion,
  debug: process.env.NODE_ENV === 'development',
});
Sentry.configureScope(scope => {
  scope.setTags({
    thatApp: 'newman',
    subSystem: 'messaging',
  });
});

export const handler = api
  .use(Sentry.Handlers.requestHandler())
  .use(responseTime())
  .post('/queuereader', queueReader)

  .use(errorHandler);
