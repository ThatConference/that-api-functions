import { Storage } from '@google-cloud/storage';
import envConfig from '../envConfig';

const bucketName = envConfig.googleBucket;
const basePath = envConfig.imageBasePath;

export function uploadFile({ filename, fileBuffer }) {
	if (!filename) throw new Error('Unable to write file, no filename provied');

	const storage = new Storage();
	const bucket = storage.bucket(bucketName);
	const fileObject = bucket.file(`${basePath}${filename}`);
	return fileObject.save(fileBuffer, {
		contentType: 'auto',
		gzip: 'auto',
		resumable: false,
	});
}
