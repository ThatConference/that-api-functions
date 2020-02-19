function configMissing(configKey) {
  throw new Error(`missing required .env setting for ${configKey}`);
}

const requiredConfig = () => ({
  security: {
    jwksUri: process.env.AUTH0_JWKS_URI || configMissing('AUTH0_JWKS_URI'),
    audience: process.env.AUTH0_AUDIENCE || configMissing('AUTH0_AUDIENCE'),
    issuer: process.env.AUTH0_ISSUER || configMissing('AUTH0_ISSUER'),
  },
  google: {
    imageBucketName: process.env.GOOGLE_BUCKET_NAME || 'that-images',
  },
});

export default requiredConfig();
