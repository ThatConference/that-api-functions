function configMissing(configKey) {
  throw new Error(`missing required .env setting for ${configKey}`);
}

function requiredConfig() {
  return {
    auth0ClientId:
      process.env.AUTH0_CLIENT_ID || configMissing('AUTH0_CLIENT_ID'),
    auth0ClientSecret:
      process.env.AUTH0_CLIENT_SECRET || configMissing('AUTH0_CLIENT_SECRET'),
    auth0Audience:
      process.env.AUTH0_AUDIENCE || configMissing('AUTH0_AUDIENCE'),
    auth0Domain: process.env.AUTH0_DOMAIN || configMissing('AUTH0_DOMAIN'),
    that: {
      systemUpdatedBy:
        process.env.THAT_SYSTEM_UPDATED_BY ||
        configMissing('THAT_SYSTEM_UPDATED_BY'),
      apiGateway: process.env.API_GATEWAY || configMissing('API_GATEWAY'),
    },
    postmark: {
      apiToken:
        process.env.POSTMARK_API_TOKEN || configMissing('POSTMARK_API_TOKEN'),
      emailFrom: process.env.POSTMARK_EMAIL_FROM || 'hello@thatconference.com',
    },
  };
}

export default requiredConfig();
