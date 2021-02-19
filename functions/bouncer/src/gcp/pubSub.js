import debug from 'debug';
import { PubSub } from '@google-cloud/pubsub';
import envConfig from '../envConfig';

const dlog = debug('that:api:bouncer:pubsub');
const pubSubClient = new PubSub();

function sendMessage(message) {
  dlog('send message called');
  const topic = pubSubClient.topic(envConfig.gcp.stripeEventTopic);

  const messageSend = {
    data: message,
  };

  const messageBuffer = Buffer.from(JSON.stringify(messageSend), 'utf8');

  return topic.publish(messageBuffer).then(messageId => ({ messageId }));
}

export default {
  sendMessage,
};
