const Sentry = require('@sentry/node');
require('dotenv').config();

Sentry.init({ dsn: process.env.SENTRY_NODE_DSN });

const express = require('express');
const { auth } = require('./mw/auth');
const docusignComplete = require('./hooks/receive/docusignComplete');

const app = express();
app.use(auth);
app.use('/docusignComplete', docusignComplete);
app.use('/auth0signup', {});

exports.hooks = app;
