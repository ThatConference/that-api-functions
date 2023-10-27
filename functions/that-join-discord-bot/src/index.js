import 'dotenv/config';
import debug from 'debug';
import * as Sentry from '@sentry/node';
import express from 'express';
import { Firestore } from '@google-cloud/firestore';
import responseTime from 'response-time';
import { verifyKey } from 'discord-interactions';
import { security } from '@thatconference/api';
import rateLimiter from 'express-rate-limit';
import config from './envConfig';
import {
  installAllCommands,
  interactionsHandler,
  activityChecks,
  createActivityChannel,
  batchCreateActivityChannels,
  deleteExpiredChannelHandler,
} from './middleware';
import constants from './constants';

const dlog = debug('that:api:functions:join-bot');
const firestore = new Firestore();
const api = express();
const defaultVersion = `that-join-discord-bot@${config.version}`;

api.set('trust proxy', 1);
api.set(constants.THAT_JOIN.FIRESTORE, firestore);

Sentry.init({
  dsn: config.sentry.dsn,
  environment: config.that.environment,
  release: process.env.SENTRY_VERSION || defaultVersion,
  debug: process.env.NODE_ENV === 'development',
  normalizeDepth: 6,
});
Sentry.configureScope(scope => {
  scope.setTags({
    thatApp: 'that-join-discord-bot',
    subSystem: 'api',
  });
});

const rateLimit = rateLimiter({
  windowMs: 1 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

function verifyDiscordSig(req, res, next) {
  dlog('verifyDiscordSig called');
  const signature = req.get('X-Signature-Ed25519');
  const timestamp = req.get('X-Signature-Timestamp');
  const isValidRequest = verifyKey(
    req.rawBody,
    signature,
    timestamp,
    config.discord.publicKey,
  );
  if (!isValidRequest) {
    return res.status(401).end('Bad request signature');
  }
  return next();
}

function thatSigningCheck(req, res, next) {
  const thatSig = req.headers['that-request-signature'] ?? '';
  dlog('thatSigningCheck called with sig %s', thatSig);
  const { signingKey } = config.that;
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
    return res.status(400).json({ message: 'Invalid Request' });
  }

  if (checkResult?.isValid !== true) {
    dlog('THAT signing check faied: %s', checkResult.message);
    Sentry.setContext('payload', { payload });
    Sentry.captureMessage(
      `THAT Signature check failed: ${checkResult?.message}`,
      'info',
    );
    return res.status(401).json({ message: 'Bad THAT Signature' });
  }

  dlog('THAT signing check passed');
  return next();
}

function failure(err, req, res, next) {
  dlog('middleware catchall error %O', err);
  if (res.headersSent) {
    return next(err);
  }
  const { message } = err;
  return res.status(500).json({ message });
}

dlog('starting gcp function handler');
export const handler = api
  .use(Sentry.Handlers.requestHandler())
  .use(rateLimit)
  .post('/interactions', verifyDiscordSig, interactionsHandler)
  .post('/registerCommands', thatSigningCheck, installAllCommands)
  .use(responseTime(), thatSigningCheck, express.json())
  .post('/batchCreateChannels', batchCreateActivityChannels)
  .post('/cleanUpChannels', deleteExpiredChannelHandler)
  .post('/addActivityChannel', activityChecks, createActivityChannel)

  .use(Sentry.Handlers.errorHandler())
  .use(failure);
