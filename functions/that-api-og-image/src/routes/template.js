import debug from 'debug';
import * as Sentry from '@sentry/node';
import { createScreenshot } from '../lib/chromium';
import { uploadFile } from '../lib/googleStorage';
import envConfig from '../envConfig';

const dlog = debug('that:api:og-image:api:template');

async function get({ _parsedUrl, params, query }, res) {
	dlog('get invoked');

	const { thatDotUs } = envConfig;
	const rawQueryString = _parsedUrl.search; // not good and should change
	const { name } = params;
	const { id } = query;

	try {
		const url = `${thatDotUs}/templates/${name}/${rawQueryString}`;

		const file = await createScreenshot(url);
		const filename = `${id}.png`;

		const result = await uploadFile({ filename, fileBuffer: file });
		dlog('Upload result:: %o', result);

		res.json({ success: true });
	} catch (e) {
		Sentry.captureException(e);
		console.error(e);

		res.status(500).json({ success: false, error: e.message });
	}
}

export default {
	get,
};
