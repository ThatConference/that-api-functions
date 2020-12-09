import debug from 'debug';
import stripelib from 'stripe';
import envConfig from '../envConfig';
import pubSub from '../gcp/pubSub';

const dlog = debug('that:api:functions:bouncer:middleware');
const stripe = stripelib(envConfig.stripe.apiKey);

export default function stripeHandler(req, res, next) {
  dlog('verify Stripe request');
  if (req.method !== 'POST') {
    dlog(`Non POST request %s`, req.method);
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.write(`Unsupported request method`);
    res.end();
    return;
  }

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
    dlog('Bork, unable to verify sig %s', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    res.end();
    return;
  }

  switch (event.type) {
    case 'payment_intent.created':
      dlog('payment intent created');
      break;
    case 'payment_intent.succeeded':
      dlog('payment intent succeeded');
      event.someShit = 'Brett set this';
      pubSub
        .sendMessage(event)
        .then(k => dlog('success %o', k))
        .catch(err => dlog('not so good %o', err));
      break;
    case 'charge.succeeded':
      dlog('charge succeded');
      break;
    default:
      throw new Error(`Unhandled Stripe webhook event ${event.type}`);
  }

  res.status(200).json({});
}
