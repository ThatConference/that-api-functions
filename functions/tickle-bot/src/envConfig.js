function configMissing(configKey) {
  throw new Error(`missing required .env setting for ${configKey}`);
}

function requiredConfig() {
  return {
    apiGateway: process.env.API_GATEWAY || configMissing('API_GATEWAY'),
    auth0ClientId:
      process.env.AUTH0_CLIENT_ID || configMissing('AUTH0_CLIENT_ID'),
    auth0ClientSecret:
      process.env.AUTH0_CLIENT_SECRET || configMissing('AUTH0_CLIENT_SECRET'),
    auth0Audience:
      process.env.AUTH0_AUDIENCE || configMissing('AUTH0_AUDIENCE'),
    auth0Domain: process.env.AUTH0_DOMAIN || configMissing('AUTH0_DOMAIN'),
  };
}

export default requiredConfig();
