const path = require('path')
const fs = require('fs').promises
const execute = require('../utils/execute')
const unzip = require('../utils/unzip')
const download = require('../utils/download')
const rimraf = require('../utils/rimraf')

/**
 * Downloads Resource Hacker to the same directory where this file is located
 * on a folder called `rh`
 */
const downloadResourceHacker = async () => {
	await rimraf(path.resolve(__dirname, 'rh'))
	await fs.mkdir(path.resolve(__dirname, 'rh'))
	await download(
		process.env.RESOURCE_HACKER_URL || 'http://www.angusj.com/resourcehacker/resource_hacker.zip',
		path.resolve(__dirname, 'rh', 'rh.zip')
	)
	await unzip(
		path.resolve(__dirname, 'rh', 'rh.zip'),
		path.resolve(__dirname, 'rh')
	)
}

/**
 * Download and run Resource Hacker to change icon of bundled executable.
 * @param {String} dist - Absolute path of directory where app will be bundled
 *  and packaged.
 */
const resourceHacker = async (dist) => {
	// NWB calls ResourceHacker internally (by using the node-resourcehacker
	// module). But as this module hasn't been updated to the new command line
	// arguments of ResourceHacker.exe, we will download our own binary and call
	// it manually
	// download and unzinp Resource Hacker
	await downloadResourceHacker()
	const appPkg = require(path.resolve(dist, 'bundle', 'package.json'))
	execute(({ exec }) => {
		return exec(
			`"${path.resolve(__dirname, 'rh', 'ResourceHacker.exe')}" ` +
			`-open "${path.resolve(dist, 'bundle', `${appPkg['executable-name']}.exe`)}" ` +
			`-save "${path.resolve(dist, 'bundle', `${appPkg['executable-name']}.exe`)}" ` +
			'-action addoverwrite ' +
			`-res "${path.resolve(dist, 'bundle', 'nwjs-assets', 'win32', 'icon.ico')}" ` +
			'-mask ICONGROUP, IDR_MAINFRAME'
		)
	})
}

/**
 * Returns the absolute path where the `package.json` should be on bundled app.
 * @param {String} dist - Absolute path of directory where app will be bundled
 *  and packaged.
 * @return {String}
 */
const getBundledPackagePath = (dist) => {
    return path.resolve(dist, 'bundle', 'package.json')
}

module.exports = {
  downloadResourceHacker,
  resourceHacker,
  getBundledPackagePath
}
