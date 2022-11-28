function configMissing(configKey) {
  throw new Error(`missing required .env setting for ${configKey}`);
}

const requiredConfig = () => ({
  // security: {
  //   jwksUri: process.env.AUTH0_JWKS_URI || configMissing('AUTH0_JWKS_URI'),
  //   audience: process.env.AUTH0_AUDIENCE || configMissing('AUTH0_AUDIENCE'),
  //   issuer: process.env.AUTH0_ISSUER || configMissing('AUTH0_ISSUER'),
  //   jwksCache: process.env.JWKS_CACHE,
  //   jwksRateLimit: process.env.JWKS_RATE_LIMIT,
  //   jwksRpm: process.env.JWKS_RPM,
  // },
  that: {
    apiGateway: process.env.API_GATEWAY || configMissing('API_GATEWAY'),
  },
});

export default requiredConfig();
