import * as Sentry from '@sentry/node';

export default function errorHandler(err, req, res, next) {
  const { thatBrinks } = req;
  Sentry.setContext('thatBrinks', { thatBrinks: JSON.stringify(thatBrinks) });

  // unknown error
  if (err instanceof Error) {
    console.log(`errorHandler: ${err.message}`);
    const issueId = Sentry.captureException(err);
    return res.status(500).json({ issueId });
  }

  if (res.status === 200 && thatBrinks.isProcessed) {
    return next();
  }
  // known(ish) errors
  let issueId;
  if (res.status === 200) {
    issueId = Sentry.captureMessage(thatBrinks.errorMsg, scope =>
      scope.setLevel('info'),
    );
  }
  console.log(`errorHandler known error: ${thatBrinks.errorMsg}`);
  const out = {
    sentryIssueId: issueId,
    errorMsg: thatBrinks.errorMsg,
  };
  return res.json(out);
}
