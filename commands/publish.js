const path = require('path')
const s3Publisher = require('@strawbees/s3-publisher')

/**
 * Publishes a specific version (platform x architecture) of a packaged app to
 * S3.
 * @param {String} src - Absolute path of directory containing all platform versions of the app.
 * @param {String} dist - Path on S3 Bucket (Prefix), that app will be published to.
 * @param {String} platform - Platform to publish for.
 * @param {String} architecture - Architecture to publish for.
 */
module.exports = async (src, dist, platform, architecture) => {
	console.log('publishing', src, dist, platform, architecture)
	// Absolute path of where the pakcaged app should be.
	const sourceFolder = path.resolve(src, platform, architecture)
	// S3 path of where the app will be deployed to.
	const outputFolder = `${dist ? `${dist}/` : ''}${platform}/${architecture}/`
	// publish
	await s3Publisher(
		process.env.S3_KEY,
		process.env.S3_SECRET,
		sourceFolder,
		outputFolder,
		process.env.S3_BUCKET,
		process.env.S3_REGION,
	)
}
