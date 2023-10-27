import debug from 'debug';
import { discordRequest } from './fetchDiscordApi';
import constants from '../../constants';

const dlog = debug('that:api:functions:join-bot:channels');

const channelType = constants.DISCORD.CHANNEL_TYPE;

const channels = (fetchDiscord = discordRequest) => {
  dlog('channel instance created');

  function getChannelById(id) {
    dlog('getChannel %s', id);
    if (!id) throw new Error('channel id is a required parameter');
    const url = `/channels/${id}`;
    const options = { method: 'GET' };
    return fetchDiscord(url, options);
  }

  function getAllVoiceChannels({ guildId }) {
    dlog('getAllVoiceChannels for guildId %s', guildId);
    if (!guildId) throw new Error('guildId is a requied parameter');
    const url = `/guilds/${guildId}/channels`;
    const options = {
      method: 'GET',
    };
    return fetchDiscord(url, options).then(res => {
      const { status, payload } = res;
      if (status === 200) {
        return {
          ...res,
          payload: payload.filter(c => c.type === channelType.GUILD_VOICE),
        };
      }

      return res;
    });
  }

  function getAllCategoryChannels({ guildId }) {
    dlog('getAllCategoryChannels for guildId %s', guildId);
    if (!guildId) throw new Error('guildId is a requied parameter');
    const url = `/guilds/${guildId}/channels`;
    const options = {
      method: 'GET',
    };
    return fetchDiscord(url, options).then(res => {
      const { status, payload } = res;
      if (status === 200) {
        return {
          ...res,
          payload: payload.filter(ch => ch.type === channelType.GUILD_CATEGORY),
        };
      }

      return res;
    });
  }

  function getCategoryChannelByName({ guildId, name }) {
    dlog('getCategoryChannelByName in guild %s, with name %s', guildId, name);
    if (!guildId) throw new Error('guildId is a requied parameter');
    return getAllCategoryChannels({ guildId }).then(all => {
      const { status, payload } = all;
      if (status === 200) {
        return {
          ...all,
          payload: payload.filter(ch => ch.name === name),
        };
      }

      return all;
    });
  }

  function createVoiceChannel({ guildId, name, topic, parentId }) {
    dlog('createVoiceChannel in guild %s, %o', guildId, {
      name,
      topic,
      parentId,
    });
    if (!guildId) throw new Error('guildId is a requied parameter');
    if (!name) throw new Error('name is a required parameter');
    const url = `/guilds/${guildId}/channels`;
    const options = {
      method: 'POST',
      body: {
        type: channelType.GUILD_VOICE,
        name: name.slice(0, 99),
      },
    };
    if (topic) {
      options.body.topic = topic;
    }
    if (parentId) {
      options.body.parent_id = parentId;
    }

    return fetchDiscord(url, options);
  }

  function createChannelInvite({ channelId }) {
    dlog('createChannelInvite for channel %s', channelId);
    if (!channelId) throw new Error('channelId is a requied parameter');
    const url = `/channels/${channelId}/invites`;
    const options = {
      method: 'POST',
      body: {
        max_age: 0,
      },
    };

    return fetchDiscord(url, options);
  }

  function deleteChannelById(id) {
    dlog('deleting channel %s', id);
    const url = `/channels/${id}`;
    const options = {
      method: 'DELETE',
    };

    return fetchDiscord(url, options);
  }

  function channelExists(id) {
    dlog('checking if channel %s exists', id);
    return getChannelById(id).then(res => res.status === 200);
  }

  return {
    getChannelById,
    getAllVoiceChannels,
    getAllCategoryChannels,
    getCategoryChannelByName,
    createVoiceChannel,
    createChannelInvite,
    deleteChannelById,
    channelExists,
  };
};

export default channels;
