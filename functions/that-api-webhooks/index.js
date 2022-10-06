require('dotenv').config();
const Sentry = require('@sentry/node');
const debug = require('debug');
const express = require('express');
const { name, version } = require('./package.json');

const dlog = debug('that:api:functions:hooks');

const defaultVersion = `${name}@${version}`;
Sentry.init({
  dsn: process.env.SENTRY_NODE_DSN ?? '',
  environment: process.env.SENTRY_ENVIRONMENT ?? 'development',
  release: defaultVersion,
  debug: process.env.NODE_ENV === 'development',
});
Sentry.setTag('thatApp', 'that-api-webhooks');

const { auth } = require('./mw/auth');
const docusignComplete = require('./hooks/receive/docusignComplete');
const auth0signup = require('./hooks/receive/auth0SignUp');
const auth0signup2 = require('./hooks/receive/auth0SignUp2');

const app = express();

// eslint-disable-next-line no-unused-vars
function failure(err, req, res, next) {
  dlog('middleware catcall error %O', err);
  const referenceId = Sentry.captureException(err);
  res.status(500).json({ referenceId });
}

exports.hooks = app
  .use(auth)
  .post('/docusignComplete', docusignComplete)
  .post('/auth0signup', auth0signup)
  .post('/v2/auth0signup', auth0signup2)

  .use(failure);
