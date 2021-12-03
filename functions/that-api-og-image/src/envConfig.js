function configMissing(configKey) {
	throw new Error(`Missing required environment varable: ${configKey}`);
}

export default {
	isdev: process.env.NODE_ENV === 'development',
	port: process.env.PORT || configMissing('PORT'),

	thatDotUs: process.env.THAT_US || 'https://that.us',

	sentry: {
		env: process.env.THAT_ENVIRONMENT || configMissing('THAT_ENVIRONMENT'),
		dsn: process.env.SENTRY_DSN || configMissing('SENTRY_DSN'),
		version: process.env.SENTRY_VERSION || null,
	},
	google: {
		imageBucket:
			process.env.GOOGLE_BUCKET_NAME || configMissing('GOOGLE_BUCKET_NAME'),
		imageBasePath: process.env.IMAGE_BASE_PATH || 'og-image',
	},
	imgix: {
		apiKey: process.env.IMGIX_API_KEY || configMissing('IMGIX_API_KEY'),
		endpoint: 'https://api.imgix.com/api/v1',
		baseUrl: 'https://that.imgix.net',
	},

	defaultProfileImage:
		'https://images.that.tech/members/person-placeholder.jpg?auto=format&fit=facearea&facepad=10&mask=ellipse&h=250&w=250&q=50&dpr=2',
};
