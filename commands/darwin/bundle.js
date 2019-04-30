const plist = require('plist')
const path = require('path')
const fs = require('fs').promises
const execute = require('../../utils/execute')
const {
	getExecutableName,
	getUrlScheme
} = require('../../utils/bundle.js')

/**
 * MacOS specific bundle steps. This should be executed after NWJS bundle.
 * @param {String} dist - Absolute path of distribution folder.
 * @param {Object} pkg - Source codes's `package.json` object.
 */
module.exports = async (dist, pkg) => {
	await fixSymbolicLinks(dist)
	await registerUrlScheme(dist, pkg)
}

/**
 * Manually fix broken symbolic links created by NWJS on bundled app.
 * @param {String} dist - Absolute path of directory where app will be bundled
 *  and packaged.
 */
const fixSymbolicLinks = async (dist) => {
	// NWB transforms realtive symlinks into absolute ones, which totally breaks
	// the application when you run it from another machine. So for now, we will
	// just manually fix those symlinks
	execute(async ({ exec }) => {
		await exec(`
			cd "$(find ${dist} -name "nwjs Framework.framework")"
			rm "Versions/Current" && ln -s "./A" "./Versions/Current"
			rm "Helpers" && ln -s "./Versions/Current/Helpers"
			rm "Internet Plug-Ins" && ln -s "./Versions/Current/Internet Plug-Ins"
			rm "Libraries" && ln -s "./Versions/Current/Libraries"
			rm "nwjs Framework" && ln -s "./Versions/Current/nwjs Framework"
			rm "Resources" && ln -s "./Versions/Current/Resources"
			rm "XPCServices" && ln -s "./Versions/Current/XPCServices"
		`)
	})
}

/**
 * Register URL Scheme on OSX by updating `Info.plist` file.
 * @param {String} dist - Absolute path for distribution directory.
 * @param {Object} pkg - Source codes's `package.json` object.
 * @return {Promise}
 */
const registerUrlScheme = async (dist, pkg) => {
	const executableName = pkg['executable-name']
	// Register the app url scheme, by modifying the Info.plist
	const plistPath = path.resolve(
		dist,
		'bundle',
		`${getExecutableName(executableName)}.app`,
		'Contents',
		'Info.plist'
	)
	const plistFile = await fs.readFile(plistPath, 'utf8')
	const plistObject = plist.parse(plistFile.toString())
	plistObject.CFBundleURLTypes.push({
		CFBundleURLName: `${getExecutableName(executableName)} URL`,
		CFBundleURLSchemes: [getUrlScheme(pkg['url-scheme'])]
	})
	return fs.writeFile(plistPath, plist.build(plistObject))
}
