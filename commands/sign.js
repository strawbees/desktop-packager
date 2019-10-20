const path = require('path')
/**
 * Runs the platform specific scripts to perform code signing.
 * @param {String} file - Absolute path of file to be signed.
 * @param {String} platform - Which platform to perform code signing.
 */
module.exports = async (src, platform) => {
	console.log('signing', src, 'for', platform)

	// Bundled application package json
	const appPkg = require(path.resolve(src, 'package.json'))

	if (platform === 'win32') {
		const app = path.resolve(src, `${appPkg['executable-name']}.exe`)
		const signWindows = require('./win32/sign')
		await signWindows(app)
	} else if (platform === 'darwin') {
		const app = path.resolve(src, `${appPkg['executable-name']}.app`)
		const signDarwin = require('./darwin/sign')
		await signDarwin(app)
	}
}
