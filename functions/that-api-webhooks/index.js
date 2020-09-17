require('dotenv').config();
const Sentry = require('@sentry/node');
const debug = require('debug');

const dlog = debug('that:api:functions:hooks');

Sentry.init({ dsn: process.env.SENTRY_NODE_DSN });

const express = require('express');
const { auth } = require('./mw/auth');
const docusignComplete = require('./hooks/receive/docusignComplete');
const auth0signup = require('./hooks/receive/auth0SignUp');

const app = express();

// eslint-disable-next-line no-unused-vars
function failure(err, req, res, next) {
  dlog('middleware catcall error %O', err);
  Sentry.captureException(err);
  res.set('Content-type', 'application/json').status(500).json(err);
}

exports.hooks = app
  .use(auth)
  .use('/docusignComplete', docusignComplete)
  .use('/auth0signup', auth0signup)

  .use(failure);
