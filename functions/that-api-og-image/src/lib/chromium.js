import chromium from 'chrome-aws-lambda';
import envConfig from '../envConfig';

const userAgent = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36`;

export async function createScreenshot(url) {
	const { isdev } = envConfig;

	try {
		chromium.font(
			'https://rawcdn.githack.com/ThatConference/that-api-functions/og-image-fonts/functions/that-api-og-image/fonts/roboto/Roboto-Black.ttf',
		);
		chromium.font(
			'https://rawcdn.githack.com/ThatConference/that-api-functions/og-image-fonts/functions/that-api-og-image/fonts/roboto/Roboto-Bold.ttf',
		);
	} catch (e) {
		console.error('trouble loading fonts', e);
	}

	const browser = await chromium.puppeteer.launch({
		args: chromium.args,
		executablePath: await chromium.executablePath,
		headless: isdev ? true : chromium.headless,
		ignoreHTTPSErrors: true,
	});

	const page = await browser.newPage();
	// leaving for future reference:
	// await page.setViewport({ width: 2048, height: 1170, deviceScaleFactor: 2 });
	await page.setViewport({ width: 1200, height: 630 });
	await page.setUserAgent(userAgent);

	await page.goto(url, { waitUntil: 'networkidle2' });

	const ogElement = await page.$('#og-image');
	const buffer = await ogElement.screenshot();

	await browser.close();

	return buffer;
}
