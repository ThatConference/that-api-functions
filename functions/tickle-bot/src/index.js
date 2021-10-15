import 'dotenv/config';
import connect from 'connect';
import debug from 'debug';
import responseTime from 'response-time';
import * as Sentry from '@sentry/node';
import queries from './queries';
import sendGraphReq from './sendGraphReq';

const dlog = debug('that:api:functions:ticklebot');
const api = connect();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.THAT_ENVIRONMENT,
  release: process.env.SENTRY_VERSION || 'that-tickle-bot@local',
  debug: process.env.NODE_ENV === 'development',
});

Sentry.configureScope(scope => {
  scope.setTag('thatApp', 'that-tickle-bot');
});

function failure(err, req, res, next) {
  dlog('middleware catcall error %O', err);
  Sentry.captureException(err);
  res.set('Content-type', 'application/json').status(500).json(err);
}

function slackDigest(hours) {
  dlog('call slackDigest with %d', hours);
  return (req, res) => {
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

    sendGraphReq({ query, variables }).then(result => {
      dlog('result of graph req %o', result);
      res
        .set('content-type', 'application/json')
        .status(200)
        .json(result.data)
        .end();
    });
  };
}

function thatStats(req, res) {
  dlog('call thatStats');
  const query = queries.communityStats.graphQl;
  const variables = {
    communityInput: {
      slug: 'that',
    },
  };
  return sendGraphReq({ query, variables }).then(result => {
    dlog('result of graph req %O', result);
    res
      .set('content-type', 'application/json')
      .status(200)
      .json(result.data)
      .end();
  });
}

function queueUpSocials(req, res) {
  dlog('call queueSocials');
  const query = queries.queueUpSocials.graphQl;
  const variables = {
    communityInput: {
      slug: 'that',
    },
  };
  return sendGraphReq({ query, variables }).then(result => {
    dlog('result of graph req %o', result);
    res.status(200).json(result.data);
  });
}

export const handler = api
  .use(responseTime())
  .use('/dailydigest', slackDigest(24))
  .use('/hourlydigest', slackDigest(1))
  .use('/thatstats', thatStats)
  .use('/queueUpSocials', queueUpSocials)

  .use(failure);
