function configMissing(configKey) {
  throw new Error(`missing required .env setting for ${configKey}`);
}

const requiredConfig = () => ({
  stripe: {
    apiKey: process.env.STRIPE_API_KEY || configMissing('STRIPE_API_KEY'),
    endpointSecret:
      process.env.STRIPE_ENDPOINT_SECRET ||
      configMissing('STRIPE_ENDPOINT_SECRET'),
  },
  gcp: {
    stripeEventTopic:
      process.env.MESSAGE_TOPIC_STRIPE_EVENTS ||
      configMissing('MESSAGE_TOPIC_STRIPE_EVENTS'),
  },
});

export default requiredConfig();
