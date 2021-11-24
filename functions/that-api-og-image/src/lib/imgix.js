import fetch from 'node-fetch';
import debug from 'debug';
import envConfig from '../envConfig';

const dlog = debug('that:api:og-image:imgix');
const imgixToken = envConfig.imgix.apiKey;
const { endpoint, baseUrl } = envConfig.imgix;
const { imageBasePath } = envConfig.google;

export function purgeImageCache({ filename }) {
	dlog('purgeImageCached called for %s', filename);

	const imageToPurge = `${baseUrl}/${imageBasePath}/${filename}`;
	dlog('imageToPurge:: %s', imageToPurge);

	const payload = {
		data: {
			type: 'purges',
			attributes: {
				url: imageToPurge,
			},
		},
	};
	const options = {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${imgixToken}`,
			'Content-Type': 'application/vnd.api+json',
		},
		body: JSON.stringify(payload),
	};

	return fetch(`${endpoint}/purge`, options);
}
