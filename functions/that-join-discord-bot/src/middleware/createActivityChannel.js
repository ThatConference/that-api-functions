/**
 * For provided sessionId review and set up the things
 */
import debug from 'debug';
import { addActivityChannel } from '../lib/addActivityChannelAction';
import constants from '../constants';

const dlog = debug('that:api:functions:join-bot:addActivityChannelMw');

export function createActivityChannel(req, res, next) {
  dlog('addActivityChannel middleware called');
  const firestore = req.app.get(constants.THAT_JOIN.FIRESTORE);
  const { activity } = req;

  return addActivityChannel({ firestore, activity })
    .then(result =>
      res.status(result.status).json({
        message: result.message,
        activity: result?.activity?.title ?? null,
      }),
    )
    .catch(err => next(err));
}
