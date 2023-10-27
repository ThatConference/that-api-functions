/**
 * search for and process mulitiple sessions to add to discord.
 * Meant to be run on some cadence, daily or a few times a day.
 */
import debug from 'debug';
import { addFutureActivityChannels } from '../lib/addFutureActivityChannels';
import constants from '../constants';

const dlog = debug('that:api:functions:join-bot:batchCreateActivityChannelsMw');

export function batchCreateActivityChannels(req, res, next) {
  dlog('batchCreateActivityChannels called');
  const firestore = req.app.get(constants.THAT_JOIN.FIRESTORE);
  return addFutureActivityChannels({ firestore })
    .then(result =>
      res.status(result.status).json({
        message: result.message,
        createResults: result.activityResults,
      }),
    )
    .catch(err => next(err));
}
