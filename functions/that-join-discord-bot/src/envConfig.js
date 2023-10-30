// eslint-disable-next-line import/no-unresolved
import { version } from './package.json';

function configMissing(configKey) {
  throw new Error(`missing required .env setting for ${configKey}`);
}

export default {
  version,
  that: {
    environment:
      process.env.THAT_ENVIRONMENT ?? configMissing('THAT_ENVIRONMENT'),
    signingKey:
      process.env.THAT_REQUEST_SIGNING_KEY ??
      configMissing('THAT_REQUEST_SIGNING_KEY'),
    authCreds: process.env.AUTH_CREDS_LIST ?? configMissing('AUTH_CREDS_LIST'),
  },
  sentry: {
    dsn: process.env.SENTRY_DSN ?? configMissing('SENTRY_DSN'),
  },
  discord: {
    appId: process.env.APP_ID ?? configMissing('APP_ID'),
    token: process.env.DISCORD_TOKEN ?? configMissing('DISCORD_TOKEN'),
    publicKey: process.env.PUBLIC_KEY ?? configMissing('PUBLIC_KEY'),
    baseUrl: 'https://discord.com/api/v10',
    beta: {
      guildId: '1164973641679769650',
      categoryChannelId: '1166417863293276160',
    },
  },
};
