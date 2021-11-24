function configMissing(configKey) {
	throw new Error(`Missing required environment varable: ${configKey}`);
}

export default {
	isdev: process.env.NODE_ENV === 'development',
	port: process.env.PORT || configMissing('PORT'),

	thatDotUs: process.env.THAT_US || 'https://that.us',

	googleBucket:
		process.env.GOOGLE_BUCKET_NAME || configMissing('GOOGLE_BUCKET_NAME'),
	imageBasePath: process.env.IMAGE_BASE_PATH || 'og-image',

	sentryEnv: process.env.THAT_ENVIRONMENT || configMissing('THAT_ENVIRONMENT'),
	sentryDsn: process.env.SENTRY_DSN || configMissing('SENTRY_DSN'),
	sentryVersion: process.env.SENTRY_VERSION || configMissing('SENTRY_VERSION'),

	defaultProfileImage:
		'https://images.that.tech/members/person-placeholder.jpg?auto=format&fit=facearea&facepad=10&mask=ellipse&h=250&w=250&q=50&dpr=2',
};
