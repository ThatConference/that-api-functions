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
  return next();
}
