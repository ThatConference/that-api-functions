/* eslint-disable no-console */
import debug from 'debug';
import * as Sentry from '@sentry/node';

const dlog = debug('that:api:bouncer:manualEventParseMw');

export default function manualEventParse(req, res, next) {
  dlog('manual event parser called');

  const whRes = {
    bouncer: true,
    isQueued: false,
    isValid: false,
    isInHistory: false,
    stages: ['manualEventParse'],
  };
  req.whRes = whRes;

  if (!req.body.id || !req.body.type) {
    whRes.errorMsg = 'unknown payload received';
    console.log(whRes.errorMsg);
    return next({
      status: 400,
    });
  }

  Sentry.setTags({
    manualEventType: req.body.type,
    manualEventId: req.body.id,
  });

  req.manualEvent = req.body;

  const isProduction = process.env.NODE_ENV === 'production';
  if (req.body.livemode && !isProduction) {
    whRes.errorMsg = 'TEST mode manual THAT event sent to PRODUCTION Bouncer';
    Sentry.setTag('stripe', 'livemode failure');
    Sentry.setContext('that event', JSON.stringify(req.body));
    Sentry.level('error');
    Sentry.captureMessage(whRes.errorMsg); // force capture as 'error'
    console.error(whRes.errorMsg);
    return next({
      status: 400, // Tell GraphQL invalid request
      whRes,
    });
  }

  return next();
}
