/* eslint-disable no-console */
import 'dotenv/config';
import express from 'express';
import rateLimiter from 'express-rate-limit';
import debug from 'debug';
import * as Sentry from '@sentry/node';
import responseTime from 'response-time';
import { Firestore } from '@google-cloud/firestore';
import { events as apiEvents } from '@thatconference/api';
import sessions from './mw/sessions';

const dlog = debug('that:functions:that-api-ical-generator');
const api = express();
const firestore = new Firestore();
const favoritesEvents = apiEvents.favorites({ firestore, sentry: Sentry });
api.set('firestore', firestore);
api.set('favoritesEvents', favoritesEvents);
api.set('trust proxy', 1);

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
const defaultVersion = `that-api-ical-generator@${version}`;
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.SENTRY_VERSION || defaultVersion,
  debug: process.env.NODE_ENV === 'development',
});
Sentry.configureScope(scope => {
  scope.setTag('thatApp', 'that-api-ical-generator');
  scope.setTag('subSystem', 'cal-feed');
});

function failure(err, req, res, next) {
  dlog('middleware catcall error %O', err);
  if (process.env.NODE_ENV === 'development') {
    return res.status(500).send(err);
  }
  return res.status(500).json({ ref: res.sentry });
}

function nothere(req, res) {
  return res.status(404).end();
}

function logme(req, res, next) {
  dlog('path:%s', req.path);
  next();
}

const rateLimit = rateLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

export const handler = api
  .use(Sentry.Handlers.requestHandler())
  .use(responseTime())
  .use(logme)
  .use(rateLimit)
  .get('/sessions/:profileSlug/:icsKey', sessions)
  .use('/', nothere)

  .use(Sentry.Handlers.errorHandler())
  .use(failure);

const port = parseInt(process.env.PORT, 10) || 8180;
api.listen(port, () => console.log(`running 🏃‍♂️ http://localhost:${port}`));
