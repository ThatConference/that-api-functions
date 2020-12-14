import 'dotenv/config';
import debug from 'debug';

const dlog = debug('that:api:functions:brinks');
dlog('setting up');

export const handler = (data, context) => {
  dlog('handler called');
  dlog('data >  %O', data);
  dlog('context %O', context);
  const { message } = data;
  let messageData = '';
  if (message.data) {
    messageData = Buffer.from(message.data, 'base64').toString('utf8');
  } else {
    dlog('message.data > undefined');
  }

  if (messageData) {
    // check for message types here
    dlog('MESSAGE DATA > %O', messageData);
    dlog('THE CONTEXT >  %O', context);
  } else {
    dlog('no data in message.');
  }
};
