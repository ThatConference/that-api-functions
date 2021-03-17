import constants from './constants';

function configMissing(configKey) {
  throw new Error(`missing required .env setting for ${configKey}`);
}

const requiredConfig = () => ({
  that: {
    messagingReadQueueRate:
      process.env.MESSAGING.READ_QUEUE_RATE ||
      constants.THAT.MESSAGING.MESSAGING.READ_QUEUE_RATE ||
      configMissing('MESSAGING.READ_QUEUE_RATE'),
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
    slackChannelOrder: process.env.SLACK_CHANNEL_ORDER || '#orders',
  },
  postmark: {
    apiToken:
      process.env.POSTMARK_API_TOKEN || configMissing('POSTMARK_API_TOKEN'),
    emailFrom: process.env.POSTMARK_EMAIL_FROM || 'hello@thatconference.com',
    transactionalStream:
      process.env.POSTMARK_TRANSACTIONAL_STREAM ||
      configMissing('POSTMARK_TRANSACTIONAL_STREAM'),
    broadcastStream:
      process.env.POSTMARK_BROADCAST_STREAM ||
      configMissing('POSTMARK_BROADCAST_STREAM'),
  },
});

export default requiredConfig();
