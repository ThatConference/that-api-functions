import chromium from 'chrome-aws-lambda';
import envConfig from './envConfig';

const userAgent = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36`;

export async function createScreenshot(url) {
	const { dev } = envConfig;

	chromium.font(
		'https://rawcdn.githack.com/ThatConference/that-api-og-image/0e790e048f1e12c8a087b40636a88d2ba97a5198/fonts/roboto/Roboto-Black.ttf',
	);
	chromium.font(
		'https://rawcdn.githack.com/ThatConference/that-api-og-image/0e790e048f1e12c8a087b40636a88d2ba97a5198/fonts/roboto/Roboto-Bold.ttf',
	);

	const browser = await chromium.puppeteer.launch({
		args: chromium.args,
		executablePath: await chromium.executablePath,
		headless: dev ? true : chromium.headless,
		ignoreHTTPSErrors: true,
	});

	// leaving for future reference - await page.setViewport({ width: 2048, height: 1170, deviceScaleFactor: 2 });
	await page.setViewport({ width: 1200, height: 630 });
	const page = await browser.newPage();
	await page.setUserAgent(userAgent);

	await page.goto(url, { waitUntil: 'networkidle2' });

	const ogElement = await page.$('#og-image');
	const buffer = await ogElement.screenshot();

	await browser.close();

	return buffer;
}
