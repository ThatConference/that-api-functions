export default {
  THAT_JOIN: {
    FIRESTORE: 'firestore',
    MIN_MINUTES_TO_ADD_CHANNEL: 30,
    MIN_AFTER_ACTIVITY_REMOVE_CHANNEL: 23 * 60,
  },
  DISCORD: {
    INVITE_SLUG: 'https://discord.gg',
    EVENT_ENTITY_TYPE: {
      STAGE_INSTANCE: 1,
      VOICE: 2,
      EXTERNAL: 3,
    },
    EVENT_PRIVACY_LEVEL: {
      GUILD_ONLY: 2,
    },
    CHANNEL_TYPE: {
      GUILD_TEXT: 0,
      DM: 1,
      GUILD_VOICE: 2,
      GROUP_DM: 3,
      GUILD_CATEGORY: 4,
      GUILD_ANNOUNCEMENT: 5,
    },
    APPLICATION_COMMAND_OPTION_TYPE: {
      SUB_COMMAND: 1,
      SUB_COMMAND_GROUP: 2,
      STRING: 3,
      INTEGER: 4,
      BOOLEAN: 5,
      USER: 6,
      CHANNEL: 7,
      ROLE: 8,
      MENTIONABLE: 9,
      NUMBER: 10,
      ATTACHEMENT: 11,
    },
  },
};
