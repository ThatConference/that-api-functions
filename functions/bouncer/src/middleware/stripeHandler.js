/* eslint-disable no-console */
import debug from 'debug';
import stripelib from 'stripe';
import envConfig from '../envConfig';
import pubSub from '../gcp/pubSub';

const dlog = debug('that:api:functions:bouncer:middleware');
const stripe = stripelib(envConfig.stripe.apiKey);

const eventsToQueue = ['checkout.session.completed', 'customer.created'];

export default function stripeHandler(req, res, next) {
  dlog('stripe handler called');
  const whRes = {
    bouncer: true,
    queued: false,
  };

  const sig = req.headers['stripe-signature'];
  dlog('here is our sig %s', sig);

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      envConfig.stripe.endpointSecret,
    );
    dlog('signature verification succeeded. Event Type:', event.type);
  } catch (err) {
    console.error('Bork, unable to verify sig %s', err.message);
    whRes.error = `webhook verfication error: ${err.message}`;
    res.status(400).json(whRes);
    return;
  }

  if (eventsToQueue.includes(event.type)) {
    dlog('queuing event type %s', event.type);
    event.someShit = 'Brett set this';
    pubSub
      .sendMessage(event)
      .then(k => {
        dlog('queue success %o', k);
        whRes.queued = true;
        whRes.message = k;
        res.status(200).json(whRes);
      })
      .catch(err => {
        dlog('not so good %o', err);
        whRes.error = err.message;
        res.status(500).json(whRes);
      });
  } else {
    console.log(`unhandled Stripe webhook event received ${event.type}`);
    whRes.error = `unhandled Stripe webhook event received ${event.type}`;
    res.status(200).json(whRes);
  }
}
