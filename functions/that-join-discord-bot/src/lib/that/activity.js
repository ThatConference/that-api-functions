import debug from 'debug';
import * as Sentry from '@sentry/node';
import dayjs from 'dayjs';
import sessionStoreFn from '../../dataSources/cloudFirestore/session';
import isUrl from '../isUrl';

const dlog = debug('that:api:functions:join-bot:activity');

export async function validateActivity({
  sessionId,
  firestore,
  allowAllSessionTypes = false,
}) {
  dlog('validateActivity %s', sessionId);
  const result = {
    isValid: false,
    returnStatus: null,
    message: '',
    activity: null,
  };
  if (!sessionId) {
    result.message = `sessionId is a required parameter`;
    return result;
  }
  Sentry.setTag('sessionId', sessionId);
  const now = dayjs();
  const sessionStore = sessionStoreFn(firestore);
  const session = await sessionStore.get(sessionId);
  dlog('found session: %o', session);
  if (session) {
    if (session.status === 'ACCEPTED') {
      if (session.type === 'OPEN_SPACE' || allowAllSessionTypes === true) {
        if (dayjs(session?.startTime).isAfter(now)) {
          result.isValid = true;
          result.activity = session;
        } else {
          result.message = `Activity's start date is before now.`;
          result.returnStatus = 422;
        }
      } else {
        result.message = `Activity is not on line`;
        result.returnStatus = 422;
      }
    } else {
      result.message = `Activity isn't accepted: ${session.status}`;
      result.returnStatus = 422;
    }
  } else {
    result.message = `Activity not found`;
    result.returnStatus = 404;
  }

  return result;
}

export async function addDiscordInfo({
  sessionId,
  firestore,
  guildId,
  channelId,
  guildScheduledEventId = '',
  inviteUrl,
}) {
  dlog('addDiscordInfo to %s, %o', sessionId, {
    guildId,
    channelId,
    guildScheduledEventId,
    inviteUrl,
  });
  const result = {
    isOk: false,
    message: '',
    activity: null,
  };
  if (!guildId) result.message = `guildId is a required parameter`;
  if (!channelId) result.message = `channelId is a required parameter`;
  if (!inviteUrl) result.message = `inviteUrl is a required parameter`;
  if (inviteUrl && !isUrl(inviteUrl))
    result.message = `inviteUrl must be an http URI`;
  if (result.message.length > 0) return result;

  Sentry.setTag('sessionId', sessionId);
  Sentry.setContext('add discord info', {
    guildId,
    channelId,
    guildScheduledEventId,
    inviteUrl,
  });
  const sessionStore = sessionStoreFn(firestore);
  const session = await sessionStore.updateDiscordData({
    sessionId,
    discordData: {
      guildId,
      channelId,
      guildScheduledEventId,
      inviteUrl,
    },
  });

  if (session) {
    result.isOk = true;
    result.activity = session;
  } else {
    result.message = 'No Session object returned from update';
  }

  return result;
}
