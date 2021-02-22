import { EventEmitter } from 'events';
import debug from 'debug';
import slackNotification from '../notifications/slack';

const dlog = debug('that:api:brinks:events:order');

export default function orderEvents() {
  const orderEventEmitter = new EventEmitter();
  dlog('order event emitter created');

  function sendNewOrderSlack({ order, products, member }) {
    dlog('sendNewOrderSlack called');
    slackNotification.newOrder({ order, products, member });
  }

  orderEventEmitter.on('orderCreated', sendNewOrderSlack);

  return orderEventEmitter;
}
