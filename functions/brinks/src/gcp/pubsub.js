import debug from 'debug';

const dlog = debug('that:api:functions:brinks:pubsub');
function decodeMessage(encodedMessage) {
  dlog('decode message called');
  dlog('raw message %s', encodedMessage);
  const result = Buffer.from(encodedMessage, 'base64').toString('utf-8');
  return JSON.parse(result);
}

export { decodeMessage };
