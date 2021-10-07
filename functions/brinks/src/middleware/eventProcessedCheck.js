// verify that this stripe event id has not yet been processed.
import debug from 'debug';
import * as Sentry from '@sentry/node';
import isEventProcessed from '../lib/isEventProcessed';
import constants from '../constants';

const dlog = debug('that:api:brinks:eventProcessedCheckMw');

export default function eventProccessedCheck(req, res, next) {
  dlog('eventProccessedCheck called');
  const firestore = req.app.get(constants.BRINKS.FIRESTORE);
  const { thatBrinks, stripeEvent } = req;
  thatBrinks.stages.push('eventProcessCheck');

  return isEventProcessed({ stripeEventId: stripeEvent.id, firestore })
    .then(result => {
      if (result) {
        thatBrinks.errorMsg = `Event ${stripeEvent.id} already processed. leaving gracefully`;
        thatBrinks.isProcessed = true;
        thatBrinks.sentryLevel = 'info';
        console.log(thatBrinks.errorMsg);
        Sentry.setTag('stripe', 'eventSeenAgain');
        res.status(200);
        return next(thatBrinks.errorMsg);
      }
      dlog(`event ${stripeEvent.id} not seen before`);
      return next();
    })
    .catch(err => next(err));
}
