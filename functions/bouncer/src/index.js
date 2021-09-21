import 'dotenv/config';
import debug from 'debug';
import express from 'express';
import * as Sentry from '@sentry/node';
import responseTime from 'response-time';
import jwt from 'express-jwt';
import jwks from 'jwks-rsa';
import { Firestore } from '@google-cloud/firestore';
import envConfig from './envConfig';
import {
  stripeEventParse,
  stripeEventCsCompleted,
  stripeEventCustCreated,
  stripeEventQueue,
  stripeEventEnd,
  errorHandler,
} from './middleware';
import * as manualMw from './middleware/thatManual';

const api = express();
const firestore = new Firestore();
const dlog = debug('that:api:bouncer');

api.set('firestore', firestore);

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

const jwtCheck = jwt({
  secret: jwks.expressJwtSecret({
    cache: JSON.parse(envConfig.security.jwksCache || true),
    rateLimit: JSON.parse(envConfig.security.jwksRateLimit || true),
    jwksRequestsPerMinute: envConfig.security.jwksRpm || 5,
    jwksUri: envConfig.security.jwksUri,
  }),
  audience: envConfig.security.audience,
  issuer: envConfig.security.issuer,
  algorithms: ['RS256'],
});

function authz(role) {
  return (req, res, next) => {
    Sentry.setTag('userId', req.user.sub);
    if (req.user.permissions.includes(role)) {
      dlog('passed permissions check');
      next();
    } else {
      dlog('failed permission validation');
      Sentry.setContext('permissions', JSON.stringify(req.user.permissions));
      Sentry.setTag('auth', 'failedPermissions');
      res.status(401).send('Permissions Denied');
    }
  };
}

export const handler = api
  .use(Sentry.Handlers.requestHandler())
  .use(responseTime())
  .post('/stripe', stripeEventParse)
  .post('/stripe', stripeEventCsCompleted)
  .post('/stripe', stripeEventCustCreated)
  .post('/stripe', stripeEventQueue)
  .post('/stripe', stripeEventEnd)
  .post('/thatmanualorder', jwtCheck)
  .post('/thatmanualorder', authz('admin'))
  .post('/thatmanualorder', manualMw.manualEventParse)
  .post('/thatmanualorder', manualMw.manualOrderEventCreated)
  .post('/thatmanualorder', manualMw.manualEventQueue)
  .post('/thatmanualorder', manualMw.manualEventEnd)

  // .use(Sentry.Handlers.errorHandler())
  .use(errorHandler);
