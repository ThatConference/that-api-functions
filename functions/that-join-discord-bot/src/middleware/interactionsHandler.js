/* eslint-disable camelcase */
/**
 * application commands handler
 * if not an appliaction command request falls through
 */
import debug from 'debug';
import { InteractionType, InteractionResponseType } from 'discord-interactions';
import { validateActivity } from '../lib/that/activity';
import { addActivityChannel } from '../lib/addActivityChannelAction';
import constants from '../constants';

const dlog = debug('that:api:functions:join-bot:interactionsHandlerMw');

export async function interactionsHandler(req, res) {
  dlog('interactionsHandler middleware called');
  const firestore = req.app.get(constants.THAT_JOIN.FIRESTORE);
  const { type, data } = req.body;

  // Verifcation reqests
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    if (name === 'that') {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'which conference?',
        },
      });
    }
    if (name === 'add-activity') {
      dlog('whats in data? %O', data);
      const { options } = data;
      const activityId =
        options?.find(o => o.name === 'activity_id')?.value ?? '';
      let message = '';
      if (activityId) {
        // activityChecks
        const vaRes = await validateActivity({
          sessionId: activityId,
          firestore,
          allowAllSessionTypes: false,
        });
        dlog('result: %o', {
          isValid: vaRes.isValid,
          returnStatus: vaRes.returnStatus,
          message: vaRes.message,
        });
        if (vaRes.isValid) {
          // createActivityChannel
          const cacRes = await addActivityChannel({
            activity: vaRes.activity,
            firestore,
          });
          // response back okay or not will be explained in message.
          message = cacRes.message;
          if (cacRes?.activity?.title) {
            message += `, title: \n${cacRes.activity.title}`;
          }
        } else {
          message = vaRes.message;
        }
      }

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `👩‍💻  ${message}`,
        },
      });
    }
  }

  return res.json({});
}
