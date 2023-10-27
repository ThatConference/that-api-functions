/**
 * Remove old voice channels x hours after the Activity's start date.
 */
import debug from 'debug';
import dayjs from 'dayjs';
import { channels as channelsFn } from './discord';
import sessionStoreFn from '../dataSources/cloudFirestore/session';
import envConfig from '../envConfig';
import constants from '../constants';

const dlog = debug('that:api:functions:join-bot:remove-expired-channels');
const { guildId } = envConfig.discord.beta;

export async function removeExpiredChannels({ firestore }) {
  dlog('removeExpiredChannels called');
  const result = {
    status: null,
    message: '',
    channelResults: null,
  };
  const channels = channelsFn();
  const voiceChannels = await channels.getAllVoiceChannels({ guildId });
  if (voiceChannels.status === 200 && voiceChannels?.payload?.length > 0) {
    const { payload } = voiceChannels;
    dlog('Looking for sessions with %d voice channels', payload.length);
    // check channels
    const sessionStore = sessionStoreFn(firestore);
    const sessionPromises = [];
    payload.forEach(p => {
      sessionPromises.push(sessionStore.findByDiscordChannelId(p.id));
    });
    const sessionChannels = await Promise.all(sessionPromises);
    dlog('sessionChannel count: %d', sessionChannels.length);
    const removeChannelPromises = [];
    sessionChannels.forEach(([sc]) => {
      if (sc) {
        if (
          dayjs().diff(dayjs(sc.startTime), 'minute') >
            constants.THAT_JOIN.MIN_AFTER_ACTIVITY_REMOVE_CHANNEL ||
          sc.status !== 'ACCEPTED'
        ) {
          removeChannelPromises.push(
            channels.deleteChannelById(sc.discord.channelId),
          );
        }
      }
    });
    dlog('channels to be removed: %d', removeChannelPromises.length);
    const removedChannelResults = await Promise.all(removeChannelPromises);
    result.status = 200;
    result.message = 'Ok';
    result.channelResults = removedChannelResults.map(r => ({
      status: r.status,
      statusText: r.statusText,
      channelId: r?.payload?.id ?? '',
      channelName: r?.payload?.name ?? '',
    }));
  } else {
    // no voice channels to check
    result.status = 200;
    result.message = 'Ok';
    result.channelResults = [];
  }

  return result;
}

// get all voice channels
// Look up each channelId in sessions and determine if it can be deleted
// - now > x hours + startTime
// when true, delete
