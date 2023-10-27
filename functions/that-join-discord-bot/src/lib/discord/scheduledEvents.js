import debug from 'debug';
import dayjs from 'dayjs';
import { discordRequest } from './fetchDiscordApi';
import constants from '../../constants';

const dlog = debug('that:api:functions:join-bot:scheduled-events');
const eventEntityType = constants.DISCORD.EVENT_ENTITY_TYPE;
const eventPrivacyLevel = constants.DISCORD.EVENT_PRIVACY_LEVEL;

const events = (fetchDiscord = discordRequest) => {
  dlog('scheduledEvents instance created');

  function getScheduledEventById({ guildId, eventId }) {
    dlog('getScheduledEventsById in guild %s id %s', guildId, eventId);
    if (!eventId) throw new Error('guildId is a requied parameter');
    if (!eventId) throw new Error('schedule event id is a required parameter');
    const url = `/guilds/${guildId}/scheduled-events/{eventId}?with_user_count=true`;
    const options = {
      method: 'GET',
    };

    return fetchDiscord(url, options);
  }

  function getAllScheduledEvents({ guildId }) {
    dlog('getAllScheduledEvents for guild %s', guildId);
    if (!guildId) throw new Error('guildId is a requied parameter');
    const url = `/guilds/${guildId}/scheduled-events`;
    const options = {
      method: 'GET',
    };

    return fetchDiscord(url, options);
  }

  function createScheduledEvent({
    guildId,
    channelId,
    name,
    startTime,
    description = '',
  }) {
    dlog('createScheduledEvent in guild %s, %o', guildId, {
      channelId,
      name,
      startTime,
      description,
    });
    if (!guildId) throw new Error('guildId is a requied parameter');
    if (!channelId) throw new Error('channelId is a required parameter');
    if (!name) throw new Error('name is a required parameter');
    if (!dayjs(startTime).isValid())
      throw new Error('startTime must be a valid date');
    const url = `/guilds/${guildId}/scheduled-events`;
    const options = {
      method: 'POST',
      body: {
        channel_id: channelId,
        name,
        scheduled_start_time: dayjs(startTime).format(),
        description,
        privacy_level: eventPrivacyLevel.GUILD_ONLY,
        entity_type: eventEntityType.VOICE,
      },
    };

    return fetchDiscord(url, options);
  }

  return {
    getScheduledEventById,
    getAllScheduledEvents,
    createScheduledEvent,
  };
};

export default events;
