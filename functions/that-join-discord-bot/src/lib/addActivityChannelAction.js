/* eslint-disable no-use-before-define */
/**
 * Perfoms checks and creates channels, invites, etc.
 */
import debug from 'debug';
import dayjs from 'dayjs';
import {
  channels as channelsFn,
  scheduledEvents as scheduledEventsFn,
} from './discord';
import { addDiscordInfo } from './that/activity';
import constants from '../constants';
import envConfig from '../envConfig';

const dlog = debug('that:api:functions:join-bot:addActivityChannelAction');

function okAddGuildScheduledEvent(startTime) {
  const chkStart = dayjs(startTime).subtract(
    constants.THAT_JOIN.MIN_MINUTES_TO_ADD_CHANNEL,
    'minute',
  );

  return chkStart.isAfter(dayjs());
}

export async function addActivityChannel({ activity, firestore }) {
  dlog('addActivityChannel called');

  const channels = channelsFn();
  const result = {
    status: null,
    message: '',
  };
  const { discord: discordData = {} } = activity;
  if (discordData?.channelId) {
    const chRes = await channels.getChannelById(discordData.channelId);
    dlog('channel check response: %o', chRes);
    if (chRes.status === 200) {
      const { name } = chRes.payload;
      result.status = 200;
      result.message = `Channel already exists, named: ${name}`;
      return result;
    }
  }

  const createfrom = activity;
  createfrom.discord = { guildId: envConfig.discord.beta.guildId };

  return addChannelDetails({ activity: createfrom, firestore });
}

export async function addChannelDetails({ activity, firestore }) {
  const result = {
    status: null,
    message: '',
  };
  const {
    startTime,
    discord: discordData,
    title,
    shortDescription = '',
    id: sessionId,
  } = activity;

  if (!discordData?.guildId) {
    return {
      status: 400,
      message: 'no guildId provided at actvity.discord.guildId',
    };
  }

  const channels = channelsFn();
  const scheduledEvents = scheduledEventsFn();

  if (dayjs(startTime).isAfter(dayjs())) {
    // create voice channel
    const vcRes = await channels.createVoiceChannel({
      guildId: discordData.guildId,
      name: title,
      topic: shortDescription.slice(0, 1023),
      parentId: envConfig.discord.beta.categoryChannelId,
    });
    if ([200, 201].includes(vcRes.status)) {
      discordData.channelId = vcRes.payload.id;
      // create invite to channel
      const inRes = await channels.createChannelInvite({
        channelId: discordData.channelId,
      });
      if ([200, 201].includes(inRes.status)) {
        discordData.inviteUrl = `${constants.DISCORD.INVITE_SLUG}/${inRes.payload.code}`;
        // add guild scheduled event
        dlog('check startTime to add scheduled event');
        if (okAddGuildScheduledEvent(startTime)) {
          // create scheduled event
          const schRes = await scheduledEvents.createScheduledEvent({
            guildId: discordData.guildId,
            channelId: discordData.channelId,
            name: title,
            startTime,
            description: shortDescription,
          });
          if ([200, 201].includes(schRes.status)) {
            discordData.guildScheduledEventId = schRes.payload.id;
          }
        }
        // update session with discordData
        const addInfoResult = await addDiscordInfo({
          firestore,
          sessionId,
          guildId: discordData.guildId,
          channelId: discordData.channelId,
          guildScheduledEventId: discordData.guildScheduledEventId,
          inviteUrl: discordData.inviteUrl,
        });
        if (addInfoResult.isOk) {
          result.status = 200;
          result.message = `Voice channel created successfully`;
          result.activity = addInfoResult.activity;
        } else {
          result.status = 500;
          result.message = `issue saving activity: ${addInfoResult.message}`;
        }
        // done return result
      } else {
        // failure creating channel invite
        result.status = 500;
        result.message = `unable to create channel invite. Activity update not attempted`;
      }
    } else {
      // report failed channel creation
      result.status = 500;
      result.message = `unable to create voice channel. Activity update not attempted`;
    }
  } else {
    // respond activity start is in past
    result.status = 422;
    result.message = `activity started in the past, a voice channel will not be created`;
  }

  return result;
}

/**
 * is there discordData.channelId?
 *   if Yes check if channel still exists
 *     if yes, done
 *
 *   if channel doesn't exist
 *    is activity > now?
 *      create channel
 *    is activity 30? min > now
 *      create event
 *
 *  create voice channel
 *  create channel invite
 *  create guild scheduled event
 *  write this data back to session document
 *  reply back to caller
 */
