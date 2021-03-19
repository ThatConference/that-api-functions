/* eslint-disable no-console */
import * as Sentry from '@sentry/node';

export default function errorHandler(err, req, res, next) {
  console.log(`errorHandler called: ${err.message}`);
  Sentry.captureException(err);
  res.status(500).json({ err: err.message });
}
