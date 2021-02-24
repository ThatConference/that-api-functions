import { EventEmitter } from 'events';
import debug from 'debug';
import * as Sentry from '@sentry/node';
import slackNotification from '../notifications/slack';
import setFollowPurchasedEvents from '../setFollowPurchasedEvents';
import { SetFollowError } from '../errors';

const dlog = debug('that:api:brinks:events:order');

export default function orderEvents() {
  const orderEventEmitter = new EventEmitter();
  dlog('order event emitter created');

  function sendNewOrderSlack({ order, products, member }) {
    dlog('sendNewOrderSlack called');
    slackNotification.newOrder({ order, products, member });
  }

  function setFollowEventOnPurchase({ firestore, orderAllocations }) {
    dlog('setFollowEventOnPurcase called');
    setFollowPurchasedEvents({ orderAllocations, firestore }).catch(err =>
      process.nextTick(() => orderEventEmitter.emit('setFollowError', err)),
    );
  }

  function sendEventErrorToSentry(error) {
    dlog('orderEventEmitter error:: %o', error);
    Sentry.configureScope(scope => {
      scope.setTag('eventEmitter', 'functionError');
      scope.setLevel(Sentry.Severity.Warning);
      Sentry.captureException(error);
    });
  }

  orderEventEmitter.on('orderCreated', sendNewOrderSlack);
  orderEventEmitter.on('orderCreated', setFollowEventOnPurchase);

  orderEventEmitter.on('setFollowError', err =>
    sendEventErrorToSentry(new SetFollowError(err.message)),
  );
  orderEventEmitter.on('error', err => sendEventErrorToSentry(err));

  return orderEventEmitter;
}
