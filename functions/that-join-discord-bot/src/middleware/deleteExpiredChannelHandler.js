import debug from 'debug';
import { removeExpiredChannels } from '../lib/removeExpiredChannels';
import constants from '../constants';

const dlog = debug('that:api:functions:join-bot:delete-expired-channel-mw');
export async function deleteExpiredChannelHandler(req, res, next) {
  dlog('deleteExpiredChannelHandler middleware called');
  const firestore = req.app.get(constants.THAT_JOIN.FIRESTORE);

  return removeExpiredChannels({ firestore })
    .then(result =>
      res.status(result.status).json({
        message: result.message,
        channelResults: result.channelResults,
      }),
    )
    .catch(err => next(err));
}
