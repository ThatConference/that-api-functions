function configMissing(configKey) {
  throw new Error(`missing required .env setting for ${configKey}`);
}

const requiredConfig = () => ({
  stripe: {
    apiKey: process.env.STRIPE_API_KEY || configMissing('STRIPE_API_KEY'),
    apiSecretKey:
      process.env.STRIPE_PRIVATE_KEY || configMissing('STRIPE_PRIVATE_KEY'),
    endpointSecret:
      process.env.STRIPE_ENDPOINT_SECRET ||
      configMissing('STRIPE_ENDPOINT_SECRET'),
  },
  gcp: {
    stripeEventTopic:
      process.env.MESSAGE_TOPIC_STRIPE_EVENTS ||
      configMissing('MESSAGE_TOPIC_STRIPE_EVENTS'),
  },
  that: {
    systemUpdatedBy:
      process.env.THAT_SYSTEM_UPDATED_BY ||
      configMissing('THAT_SYSTEM_UPDATED_BY'),
  },
});

export default requiredConfig();
