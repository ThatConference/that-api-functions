import debug from 'debug';
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

		// res.statusCode = 200;
		// res.setHeader('Content-Type', `image/png`);
		// res.setHeader(
		// 	'Cache-Control',
		// 	`public, immutable, no-transform, s-maxage=900, max-age=900`,
		// );
		// res.end(file);
	} catch (e) {
		res.statusCode = 500;
		res.setHeader('Content-Type', 'text/html');
		res.end(`<h1>Internal Error</h1><p>${e.message}</p>`);

		console.error(e);
	}
}

export default {
	get,
};
