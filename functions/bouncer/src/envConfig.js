function configMissing(configKey) {
  throw new Error(`missing required .env setting for ${configKey}`);
}

const requiredConfig = () => ({
  stripe: {
    apiVersion: '2020-08-27',
    apiKey: process.env.STRIPE_API_KEY || configMissing('STRIPE_API_KEY'),
    apiSecretKey:
      process.env.STRIPE_PRIVATE_KEY || configMissing('STRIPE_PRIVATE_KEY'),
    signingSecret:
      process.env.STRIPE_SIGNING_SECRET ||
      configMissing('STRIPE_SIGNING_SECRET'),
  },
  gcp: {
    stripeEventTopic:
      process.env.MESSAGE_TOPIC_STRIPE_EVENTS ||
      configMissing('MESSAGE_TOPIC_STRIPE_EVENTS'),
  },
  security: {
    jwksUri: process.env.AUTH0_JWKS_URI || configMissing('AUTH0_JWKS_URI'),
    audience: process.env.AUTH0_AUDIENCE || configMissing('AUTH0_AUDIENCE'),
    issuer: process.env.AUTH0_ISSUER || configMissing('AUTH0_ISSUER'),
    jwksCache: process.env.JWKS_CACHE,
    jwksRateLimit: process.env.JWKS_RATE_LIMIT,
    jwksRpm: process.env.JWKS_RPM,
    thatRequestSigningKey:
      process.env.THAT_REQUEST_SIGNING_KEY ||
      configMissing('THAT_REQUEST_SIGNING_KEY'),
  },
});

export default requiredConfig();
