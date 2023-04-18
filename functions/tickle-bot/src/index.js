import 'dotenv/config';
import express from 'express';
import debug from 'debug';
import responseTime from 'response-time';
import * as Sentry from '@sentry/node';
import { Firestore } from '@google-cloud/firestore';
import queries from './queries';
import sendGraphReq from './sendGraphReq';
import { ticketNotifications, meetThatMatching } from './middleware';
import constants from './constants';

const dlog = debug('that:api:ticklebot');
const api = express();
const firestore = new Firestore();

api.set(constants.TICKLEBOT.FIRESTORE, firestore);
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.THAT_ENVIRONMENT,
  release: process.env.SENTRY_VERSION || 'that-tickle-bot@local',
  debug: process.env.NODE_ENV === 'development',
  normalizeDepth: 6,
});

Sentry.configureScope(scope => {
  scope.setTag('thatApp', 'that-tickle-bot');
});

function failure(err, req, res, next) {
  dlog('middleware catch-all error %O', err);
  // Sentry.captureException(err);
  res.set('Content-type', 'application/json').status(500).json({
    err: err.message,
    sentryId: res.sentry,
  });
}

function slackDigest(hours) {
  dlog('call slackDigest with %d', hours);
  return (req, res, next) => {
    // We only want to include socials on hourly request, not morning daily (24)
    let query = queries.slackDigestQueueUpSocials.graphQl;
    if (hours !== 1) query = queries.slackDigest.graphQl;

    const variables = {
      communityInput: {
        slug: 'that',
      },
      hours,
      start: hours === 1 ? 'NEXT_HOUR' : 'CURRENT_HOUR',
    };

    return sendGraphReq({ query, variables }).then(result => {
      dlog('result of graph req %o', result);
      if (!result) {
        next(new Error('No result returned from THAT API'));
      } else {
        res
          .set('content-type', 'application/json')
          .status(200)
          .json(result.data)
          .end();
      }
    });
  };
}

function thatStats(req, res, next) {
  dlog('call thatStats');
  const query = queries.communityStats.graphQl;
  const variables = {
    communityInput: {
      slug: 'that',
    },
  };
  return sendGraphReq({ query, variables }).then(result => {
    if (!result) {
      next(new Error('No result returned from THAT API'));
    } else {
      dlog('result of graph req %O', result);
      res
        .set('content-type', 'application/json')
        .status(200)
        .json(result.data)
        .end();
    }
  });
}

function queueUpSocials(req, res, next) {
  dlog('call queueSocials');
  const query = queries.queueUpSocials.graphQl;
  const variables = {
    communityInput: {
      slug: 'that',
    },
  };
  return sendGraphReq({ query, variables }).then(result => {
    dlog('result of graph req %o', result);
    if (!result) {
      next(new Error('No result returned from THAT API'));
    } else {
      res.status(200).json(result.data);
    }
  });
}

export const handler = api
  .use(Sentry.Handlers.requestHandler())
  .use(responseTime())
  .use('/dailydigest', slackDigest(24))
  .use('/hourlydigest', slackDigest(1))
  .use('/thatstats', thatStats)
  .use('/queueUpSocials', queueUpSocials)
  .use('/ticketNotification', ticketNotifications)
  .use('/engagementMeetThatMatching', meetThatMatching)

  .use(Sentry.Handlers.errorHandler())
  .use(failure);
