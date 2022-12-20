import debug from 'debug';
import * as Sentry from '@sentry/node';
import parseOaNotifications from '../lib/parseOaNotifications';
import formatOaNotifications from '../lib/formatOaNotifications';
import sendPostmarkMessages from '../lib/sendPostmarkMessages';
import { oaForFutureEvents } from '../queries';
import sendGraphReq from '../sendGraphReq';
import orderStore from '../dataSources/cloudFirestore/order';
import constants from '../constants';

const dlog = debug('that:api:ticklebot:ticketNotificationsMw');

export default async function ticketNotifications(req, res, next) {
  dlog('ticketNotifications middleware called');

  const query = oaForFutureEvents.graphQl;
  let eventsData;
  try {
    const { data } = await sendGraphReq({ query });
    eventsData = data;
  } catch (error) {
    return next(error);
  }
  const allEvents = eventsData?.communities?.community?.get?.events;
  if (allEvents === undefined || allEvents === null) {
    return next(
      new Error(
        'Query requesting events for ticketNotifications returned undefined or null.',
      ),
    );
  }
  const events = allEvents.filter(
    e => e?.admin?.orderAllocations?.length > 0 && e?.type !== 'DAILY',
  );
  // TODO: perhaps short-circuit out here is events.length is 0

  const { eventNotifications, counts } = parseOaNotifications({ events });

  const { postmarkMessages, validationMessages } = formatOaNotifications({
    eventNotifications,
  });

  // dlog('postmarkMessages:%O', postmarkMessages);
  // return res.json(postmarkMessages);

  let sentOrderAllocationIds;
  let messagesInError;

  try {
    ({ sentOrderAllocationIds, messagesInError } = await sendPostmarkMessages({
      postmarkMessages,
      validationMessages,
    }));
  } catch (error) {
    return next(error);
  }
  Sentry.withScope(scope => {
    scope.setTag('function', 'ticketNotifications MW');
    scope.setContext('sentOrderAllocationIds', sentOrderAllocationIds);
  });

  if (messagesInError.length > 0) {
    Sentry.withScope(scope => {
      scope.setContext('MessagesInError obj', messagesInError);
      scope.setContext(
        'MessagesInError string',
        JSON.stringify(messagesInError),
      );
      scope.setLevel('warning');
      Sentry.captureException(
        new Error(
          `ticketNotifications returned with ${messagesInError.length} messages in error`,
        ),
      );
    });
  }

  const firestore = req.app.get(constants.TICKLEBOT.FIRESTORE);
  let isSuccessful;
  try {
    isSuccessful = await orderStore(firestore).updateOrderAllocationBatch(
      sentOrderAllocationIds,
    );
  } catch (error) {
    return next(error);
  }
  if (!isSuccessful) {
    Sentry.withScope(scope => {
      scope.setLevel('error');
    });
    return next(
      new Error(
        'Firestore failed to update OrderAllocations after sending notifications',
      ),
    );
  }

  // output this shit
  return res.json({
    counts,
    eventNotifications,
    messageCount: postmarkMessages.length,
    sentOrderAllocationIds,
    messagesInError,
  });
}
