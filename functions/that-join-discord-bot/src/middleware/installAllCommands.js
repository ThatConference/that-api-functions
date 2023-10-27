/**
 * Installs slash commands to servers
 * overwritting all the bot's commands with the ones below
 */
import debug from 'debug';
import { installGlobalCommands } from '../lib/discord/fetchDiscordApi';
import { botCommands } from '../lib/discord/botCommands';

const dlog = debug('that:api:functions:join-bot:installCommandsMw');

export async function installAllCommands(req, res, next) {
  dlog('installAllCommands called');
  let r;
  try {
    r = await installGlobalCommands(botCommands);
  } catch (err) {
    next(err);
  }

  res.json({ result: 'ok', r });
}
