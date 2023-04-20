import 'dotenv/config';
import debug from 'debug';
import express from 'express';
import * as Sentry from '@sentry/node';
import responseTime from 'response-time';
import { expressjwt as jwt } from 'express-jwt';
import jwks from 'jwks-rsa';
import { Firestore } from '@google-cloud/firestore';
import { security } from '@thatconference/api';
import envConfig from './envConfig';
import {
  stripeEventParse,
  stripeEventCsCompleted,
  stripeEventCustCreated,
  stripeEventCustSubUpdated,
  stripeEventInvoiceSubscription,
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
  normalizeDepth: 6,
});
Sentry.configureScope(scope => {
  scope.setTag('thatApp', 'bouncer');
  scope.setTag('subSystem', 'checkout');
});

const thatSigningCheck = (req, res, next) => {
  const thatSig = req.headers['that-request-signature'] ?? '';
  dlog('thatSig: %s', thatSig);
  Sentry.configureScope(scope => scope.setTag('thatSig', thatSig));

  const signingKey = envConfig.security.thatRequestSigningKey;
  const thatSigning = security.requestSigning;
  const payload = req.body;
  let checkResult = {};
  try {
    const requestSigning = thatSigning({ signingKey });
    checkResult = requestSigning.verifyRequest({
      thatSig,
      payload,
    });
  } catch (err) {
    dlog('signing error message: %s', err.message);
    Sentry.captureException(err);
    return res.status(400).send('Invalid Request');
  }

  if (checkResult?.isValid !== true) {
    dlog('THAT signing check faied: %s', checkResult.message);
    Sentry.captureMessage(
      `THAT Signature check failed: ${checkResult?.message}`,
      'info',
    );
    return res.status(400).send('Invalid Request');
  }

  dlog('THAT signing check passed');
  return next();
};

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
    dlog('authz');
    // express-jwt v7 changed from user to auth
    req.user = req.auth;
    dlog('user.sub: %o', req.user.sub);
    Sentry.configureScope(scope => scope.setTag('userId', req.user.sub));
    const allowRole = role.map(r => req.user.permissions.includes(r));
    dlog('user perms: %o', req.user.permissions);
    if (allowRole.includes(true)) {
      dlog('passed permissions check');
      next();
    } else {
      dlog('failed permission validation');
      Sentry.setContext('permissions', { user: req.user.permissions });
      Sentry.setTag('auth', 'failedPermissions');
      Sentry.captureException(new Error('failed permissions check'));
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
  .post('/stripe', stripeEventCustSubUpdated)
  .post('/stripe', stripeEventInvoiceSubscription)
  .post('/stripe', stripeEventQueue)
  .post('/stripe', stripeEventEnd)
  .post('/thatmanualorder', thatSigningCheck)
  .post('/thatmanualorder', jwtCheck)
  .post('/thatmanualorder', authz(['admin', 'members']))
  .post('/thatmanualorder', manualMw.manualEventParse)
  .post('/thatmanualorder', manualMw.manualOrderCheckSpeaker)
  .post('/thatmanualorder', manualMw.manualOrderCheckClaim)
  .post('/thatmanualorder', manualMw.manualOrderEventCreated)
  .post('/thatmanualorder', manualMw.manualEventQueue)
  .post('/thatmanualorder', manualMw.manualEventEnd)

  // .use(Sentry.Handlers.errorHandler())
  .use(errorHandler);
