function configMissing(configKey) {
  throw new Error(`missing required .env setting for ${configKey}`);
}

const requiredConfig = () => ({
  stripe: {
    apiKey: process.env.STRIPE_API_KEY || configMissing('STRIPE_API_KEY'),
    apiSecretKey:
      process.env.STRIPE_PRIVATE_KEY || configMissing('STRIPE_PRIVATE_KEY'),
  },
  that: {
    systemUpdatedBy:
      process.env.THAT_SYSTEM_UPDATED_BY ||
      configMissing('THAT_SYSTEM_UPDATED_BY'),
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
    slackChannelOrder: process.env.SLACK_CHANNEL_ORDER || '#orders',
    isTestSlackNotifications:
      JSON.parse(process.env.TEST_SLACK_NOTIFICATIONS) || false,
  },
  postmark: {
    apiToken:
      process.env.POSTMARK_API_TOKEN || configMissing('POSTMARK_API_TOKEN'),
    emailFrom: process.env.POSTMARK_EMAIL_FROM || 'hello@thatconference.com',
  },
});

export default requiredConfig();
