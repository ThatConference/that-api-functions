/* eslint-disable no-console */
import debug from 'debug';
import * as Sentry from '@sentry/node';
import { dataSources } from '@thatconference/api';
import { Firestore } from '@google-cloud/firestore';
import pubSub from '../gcp/pubSub';

const dlog = debug('that:api:functions:bouncer:middleware:stripeEventQueue');
const historyStore = dataSources.history;
const firestore = new Firestore();

export default function stripeEventQueue(req, res, next) {
  dlog('stripe event queue to pubsub called');

  const { whRes, stripeEvent } = req;

  if (!whRes.isValid) {
    dlog(`unhandled stripe event passed through, ${stripeEvent.type}`);
    whRes.errorMsg = `Stripe Event ${stripeEvent.type} not handled`;
    return next({
      status: 200,
      whRes,
    });
  }

  dlog(
    'queuing event type %s with id %s to pubsub',
    stripeEvent.type,
    stripeEvent.id,
  );

  return pubSub
    .sendMessage(stripeEvent)
    .then(k => {
      dlog('queue success %o', k);
      whRes.isQueued = true;
      whRes.message = k;
      whRes.status = 200;
    })
    .then(r =>
      historyStore(firestore)
        .stripeEventSet(stripeEvent)
        .then(() => {
          whRes.isInHistory = true;
          whRes.pubsubId = r;
          return next();
        }),
    )
    .catch(err => {
      whRes.error = err;
      whRes.errorMsg = `queuing event in error: ${err.message}`;
      console.log(whRes.errorMsg);
      Sentry.captureException(err);
      return next({
        status: 500,
        whRes,
      });
    });
}
