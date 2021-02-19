/* eslint-disable no-console */
import debug from 'debug';
import { dataSources } from '@thatconference/api';
import pubSub from '../../gcp/pubSub';

const dlog = debug('that:api:bouncer:middleware:manualEventQueueMw');
const historyStore = dataSources.cloudFirestore.history;

export default function manualEventQueue(req, res, next) {
  dlog('manual event queue to pubsub called');

  const firestore = req.app.get('firestore');
  const { whRes, manualEvent } = req;
  whRes.stages.push('manualEventQueue');

  if (!whRes.isValid) {
    dlog(`unhandled THAT event passed through, ${manualEvent.type}`);
    whRes.errorMsg = `THAT Event ${manualEvent.type} not handled`;
    return next({
      status: 406,
      whRes,
    });
  }

  dlog(
    'queuing event type %s with id %s to pubsub',
    manualEvent.type,
    manualEvent.id,
  );

  return pubSub
    .sendMessage(manualEvent)
    .then(k => {
      dlog('queue success %o', k);
      whRes.isQueued = true;
      whRes.message = k;
      whRes.status = 200;
    })
    .then(r =>
      historyStore(firestore)
        .thatEventSet(manualEvent)
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
      return next(err);
    });
}
