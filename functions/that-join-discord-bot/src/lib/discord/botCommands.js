import constants from '../../constants';

const THAT_COMMAND = {
  name: 'that',
  description: 'Basic test command',
  type: 1,
};

// https://discord.com/developers/docs/interactions/application-commands
const ADD_ACTIVITY_COMMAND = {
  name: 'add-activity',
  description: 'Add a voice channel for an activity.',
  default_member_permissions: '16',
  options: [
    {
      type: constants.DISCORD.APPLICATION_COMMAND_OPTION_TYPE.STRING,
      name: 'activity_id',
      description:
        'Id of activity. Availble on THAT.us activity details in URL.',
      required: true,
      max_length: 50,
    },
  ],
};

export const botCommands = [THAT_COMMAND, ADD_ACTIVITY_COMMAND];
