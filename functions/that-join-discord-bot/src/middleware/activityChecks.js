/**
 * Validates provided session to ensure it exists, in the future, and is type OPEN_SPACE
 */
import debug from 'debug';
import { validateActivity } from '../lib/that/activity';
import constants from '../constants';

const dlog = debug('that:api:functions:join-bot:activityChecksMw');

export function activityChecks(req, res, next) {
  dlog('activityChecks middleware called');
  const firestore = req.app.get(constants.THAT_JOIN.FIRESTORE);
  const { sessionId } = req.body;
  dlog('checking sessionId: %s', sessionId);
  if (!sessionId) throw new Error('sessionId is a required parameter');

  return validateActivity({ sessionId, firestore }).then(result => {
    dlog('result: %o', {
      isValid: result.isValid,
      returnStatus: result.returnStatus,
      message: result.message,
    });
    if (result.isValid) {
      req.activity = result.activity;
      return next();
    }

    return res.status(result.returnStatus).json({ message: result.message });
  });
}
