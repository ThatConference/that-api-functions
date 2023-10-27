import debug from 'debug';
import * as Sentry from '@sentry/node';
import dayjs from 'dayjs';
import eventStoreFn from '../dataSources/cloudFirestore/event';
import sessionStoreFn from '../dataSources/cloudFirestore/session';
import { addChannelDetails } from './addActivityChannelAction';
import envConfig from '../envConfig';

const dlog = debug('that:api:functions:join-bot:activities-batch');

export async function addFutureActivityChannels({ firestore }) {
  dlog('addFutureActivityChannels called');

  const result = {
    status: null,
    message: '',
    activityResults: null,
  };
  const eventStore = eventStoreFn(firestore);
  const eventRecords = await eventStore.getActiveIdsEndingInFuture();

  if (eventRecords?.length > 0) {
    dlog('getting sessions from %d events', eventRecords.length);
    const eventIds = eventRecords.map(e => e.id);
    Sentry.setContext('event ids', { eventIds });
    const sessionStore = sessionStoreFn(firestore);
    const activities = await sessionStore.getAcceptedForEvents(eventIds);
    if (activities?.length > 0) {
      dlog('activity count returned: %d', activities.length);
      /**
       * startTime >= 23 hours && <= 48 hours
       * validate is OPEN_SPACE
       * Doesn't already have a discord channel assigned (session.discord.channelId)
       */
      const startRange = dayjs().add(23, 'hour');
      const stopRange = dayjs().add(48, 'hour');
      const addActivities = activities.filter(
        a =>
          dayjs(a.startTime).isAfter(startRange) &&
          dayjs(a.startTime).isBefore(stopRange) &&
          a.type === 'OPEN_SPACE' &&
          a?.discord?.channelId === undefined,
      );
      if (addActivities?.length > 0) {
        // add the activities to discord
        Sentry.setContext('Add Activities', {
          activityIds: addActivities.map(r => r.id),
        });
        dlog('we have %d activities to add to discord', addActivities.length);
        const { guildId } = envConfig.discord.beta;
        const promiseCollection = [];

        for (let i = 0; i < addActivities.length; i += 1) {
          const activity = addActivities[i];
          activity.discord = { guildId };
          const addChannelFn = addChannelDetails({ activity, firestore });
          promiseCollection.push(addChannelFn);
        }

        dlog('running promise all on %d promises', promiseCollection.length);
        const channelCreateResults = await Promise.all(promiseCollection);
        // write-out promise results to send back
        result.status = 200;
        result.message =
          'All processed without exceptions. Review activityResults for completion status';
        result.activityResults = channelCreateResults.map(r => {
          const ar = {
            status: r.status,
            message: r.message,
          };
          if (r.activity) {
            ar.title = r.activity?.title;
          }
          return ar;
        });
      } else {
        // no activities to add, nothing to do.
        result.status = 200;
        result.message = 'no activities available to add';
      }
    } else {
      // no sessions, nothing to do.
      result.status = 200;
      result.message = 'no activities available to add';
    }
  } else {
    // no eventIds to process
    result.status = 200;
    result.message = 'no events available to add';
  }

  return result;
}
