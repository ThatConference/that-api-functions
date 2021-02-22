/* eslint-disable no-console */
import * as Sentry from '@sentry/node';

export default function errorHandler(err, req, res, next) {
  let { whRes } = req;
  if (!whRes || !whRes.stages) whRes = { stages: [] };
  whRes.stages.push('errorHandler');
  Sentry.setContext('whRes', JSON.stringify(whRes));

  // for unknown errors
  if (err instanceof Error) {
    console.log(`errorHandler unknown error: ${err.message}`);
    const issueId = Sentry.captureException(err);
    whRes.sentryIssueId = issueId;
    return res.status(500).json(whRes);
  }

  // for known errors
  let issueId;
  if (err.status === 200) {
    issueId = Sentry.captureMessage(whRes.errorMsg, scope =>
      scope.setLevel('info'),
    );
  } else {
    issueId = Sentry.captureException(new Error(whRes.error));
  }
  console.log(`errorHandler known error: ${whRes.errorMsg}`);
  whRes.sentryIssueId = issueId;
  return res.status(err.status || 400).json(whRes);
}
