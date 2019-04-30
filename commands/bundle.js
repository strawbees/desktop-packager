const fs = require('fs').promises
const path = require('path')
const {
	getDarwinPackagePath,
	updatePackageManifest,
	getNWBPlatform,
	bundle
} = require('../utils/bundle')


/**
* Bundles and adjust bundled source according with platform.
* @param {String} src - Absolute path of directory containing app source code.
* @param {String} dist - Absolute path of distribution directory.
* @param {String} platform - Platform to bundle for.
* @param {String} architecture - Architecture to bundle for.
*/
module.exports = async (src, dist, platform, architecture) => {
	// Source code `package.json` manifest object
	const pkg = require(path.resolve(src, 'package.json'))
	// NWB uses a different platform format that merges platform and architecture
	let nwbPlatform = getNWBPlatform(platform, architecture)
	await bundle(src, dist, nwbPlatform, pkg)

	// Each platform will require different steps after the bundle. Those extra
	// steps are separated into platform specific scripts
	if (platform == 'win32') {
		const packagePath = path.resolve(dist, 'bundle', 'package.json')
		await updatePackageManifest(packagePath)
		const bundleWin32 = require('./win32/bundle')
		await bundleWin32(dist)
	}
	if (platform == 'darwin') {
		// Bundling for macos is tricky because the generated path is not
		// predictable, it changes with environment and the `executable-name`
		// on its `package.json` because of that, we will always keep the
		// reference to the `package.json` present on `src`
		const packagePath = getDarwinPackagePath(dist, pkg)
		await updatePackageManifest(packagePath)
		const bundleDarwin = require('./darwin/bundle')
		await bundleDarwin(dist, pkg)
		// And because we want to make the "package" step for macos easier we'll
		// make a copy of the bundled, modified `package.json` on the root
		// of the "distribution" folder
		await fs.copyFile(
			packagePath, path.resolve(dist, 'bundle', 'package.json')
		)
	}
	if (platform == 'linux') {
		console.log('Nothing to do on linux')
	}
}
