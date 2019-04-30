/**
 * Runs the platform specific scripts to perform code signing.
 * @param {String} file - Absolute path of file to be signed.
 * @param {String} platform - Which platform to perform code signing.
 */
module.exports = async (file, platform) => {
	console.log('signing', file, 'for', platform)
	if (platform === 'win32') {
		const signWindows = require('./sign-win32.js')
		await signWindows(file)
	} else if (platform === 'darwin') {
		const signDarwin = require('./sign-darwin.js')
		await signDarwin(file)
	}
}
