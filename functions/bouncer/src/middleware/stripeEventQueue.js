/* eslint-disable no-console */
import debug from 'debug';
import * as Sentry from '@sentry/node';
import { dataSources } from '@thatconference/api';
import pubSub from '../gcp/pubSub';

const dlog = debug('that:api:bouncer:middleware:stripeEventQueueMw');
const historyStore = dataSources.cloudFirestore.history;

export default function stripeEventQueue(req, res, next) {
  dlog('stripe event queue to pubsub called');

  const firestore = req.app.get('firestore');
  const { whRes, stripeEvent } = req;
  whRes.stages.push('stripeEventQueue');

  if (!whRes.isValid) {
    dlog(`unhandled stripe event passed through, ${stripeEvent.type}`);
    whRes.errorMsg = `Stripe Event ${stripeEvent.type} not handled`;
    Sentry.setTag('stripe', 'unknownEventType');
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
          dlog('write history record done');
          whRes.isInHistory = true;
          whRes.pubsubId = r;
          return next();
        }),
    )
    .catch(err => {
      whRes.error = err;
      whRes.errorMsg = `queuing event in error: ${err.message}`;
      console.log(whRes.errorMsg);
      Sentry.setTag('pubsub', 'queueFailure');
      return next(err);
    });
}
