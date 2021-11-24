import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import debug from 'debug';
import responseTime from 'response-time';
import * as Sentry from '@sentry/node';

import template from './routes/template';
import envConfig from './envConfig';

let version;
(async () => {
	let p;
	try {
		// eslint-disable-next-line import/no-unresolved
		p = await import('./package.json');
	} catch {
		p = await import('../package.json');
	}
	version = p.version;
})();

const dlog = debug('that:api:og-image:index');
const defaultVersion = `that-api-og-image@${version}`;

const useSentry = async (req, res, next) => {
	Sentry.addBreadcrumb({
		category: 'that-api-og-image',
		message: 'og-image init',
		level: Sentry.Severity.Info,
	});

	next();
};

const app = express();

Sentry.init({
	dsn: envConfig.sentryDsn,
	environment: envConfig.sentryEnv,
	release: envConfig.sentryVersion || defaultVersion,
	debug: envConfig.isdev,
});

Sentry.configureScope(scope => {
	scope.setTag('thatApp', 'that-api-og-image');
});

function failure(err, req, res, next) {
	dlog(err);
	Sentry.captureException(err);
	console.error(err);

	res.status(500).json({ success: false, message: err });
}

export const handler = app
	.use(bodyParser.json())
	.use(bodyParser.urlencoded({ extended: true }))
	.use('*', cors())
	.use(responseTime())
	.use(useSentry)
	.get('/api/template/:name', template.get)
	.get('/og-image/api/template/:name', template.get)
	.use(failure);
