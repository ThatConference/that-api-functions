import debug from 'debug';
import * as Sentry from '@sentry/node';

const dlog = debug('that:api:brinks:stripeEventEndMw');

export default function stripeEventEnd(req, res) {
  dlog('stripeEventEnd called');
  const { thatBrinks } = req;
  thatBrinks.stages.push('stripeEventEnd');

  if (!thatBrinks.isProcessed) {
    Sentry.setContext('thatBrinks', { thatBrinks: JSON.stringify(thatBrinks) });
    const sentryIssueId = Sentry.captureMessage(
      `Unknown Stripe event encountered ${thatBrinks.stripeEventType}`,
      scope => scope.setLevel('error'),
    );
    console.log(
      `unknown stripe event type encountered`,
      thatBrinks,
      sentryIssueId,
    );
    return res.status(200).json(thatBrinks);
  }

  res.status = res.status || 200;

  return res.json(thatBrinks);
}
