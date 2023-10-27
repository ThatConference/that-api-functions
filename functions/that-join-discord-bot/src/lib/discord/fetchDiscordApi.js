/**
 * Interacting back with the Discord API
 */
import debug from 'debug';
import nodeFetch from 'node-fetch';
import fetchRetry from 'fetch-retry';
import config from '../../envConfig';

const dlog = debug('that:api:functions:join-bot:fetchDiscordApi');
const fetch = fetchRetry(nodeFetch, {
  retries: 5,
  retryDelay: (attempt, error, response) => {
    if (response?.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      if (retryAfter) {
        const delay = Number.parseInt(retryAfter, 10) * 1000;
        return delay > 0 ? delay : 1000;
      }
    }
    return 250 * (attempt + 1);
  },
  retryOn: (attempt, error, response) => {
    if (response?.status === 429 || response?.status >= 500 || error) {
      return true;
    }
    return false;
  },
});

const headers = {
  Authorization: `Bot ${config.discord.token}`,
  'Content-Type': 'application/json; charset=UTF-8',
  'User-Agent': `ThatJoinBot (${config.version})`,
};

export function discordRequest(endPoint, options) {
  dlog('discordRequest against %s, with options %o', endPoint, options);
  const url = `${config.discord.baseUrl}/${endPoint}`;
  const reqOptions = options;
  if (options.body) {
    reqOptions.body = JSON.stringify(reqOptions.body);
  }

  let status;
  let statusText;
  return (
    fetch(url, {
      headers,
      ...reqOptions,
    })
      .then(res => {
        status = res.status;
        statusText = res.statusText;
        if (status >= 200 && status < 500) {
          return res.json();
        }
        return statusText;
      })
      // Yes for 500 errors we're returning the status text
      // Many 400 erroros are needed due to responses from Discords API
      .then(payload => ({
        status,
        statusText,
        payload,
      }))
  );
}

export function installGlobalCommands(commands) {
  // API endpoint which overwrites global bot commands
  dlog('installGlobalCommands called');
  const endpoint = `applications/${config.discord.appId}/commands`;

  return discordRequest(endpoint, {
    method: 'PUT',
    body: commands,
  });
}
