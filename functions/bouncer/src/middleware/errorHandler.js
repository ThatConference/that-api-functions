/* eslint-disable no-console */
import * as Sentry from '@sentry/node';

export default function errorHandler(err, req, res, next) {
  const { whRes, stripeEvent } = req;

  // for unknown errors
  if (err instanceof Error) {
    console.log(`errorHandler: ${err.message}`);
    // not sure if this error needs to be renewed:
    Sentry.captureException(err);
    return res.status(500).json(whRes);
  }

  // for known errors
  if (err.status === 200) {
    Sentry.captureMessage(whRes.errorMsg, scope => scope.setLevel('info'));
  } else {
    Sentry.captureException(new Error(whRes.error));
  }
  console.log(`errorHandler known error: ${whRes.errorbMsg}`);
  return res.status(err.status || 400).json(whRes);
}
