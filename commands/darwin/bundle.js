const plist = require('plist')
const path = require('path')
const fs = require('fs').promises
const execute = require('../../utils/execute')
const chmod = require('../../utils/chmod')
const {
	getExecutableName,
	getUrlScheme
} = require('../../utils/bundle.js')

/**
 * MacOS specific bundle steps. This should be executed after NWJS bundle.
 * @param {String} dist - Absolute path of distribution folder.
 * @param {Object} pkg - Source code's `package.json` object.
 */
module.exports = async (dist, pkg) => {
	await fixSymbolicLinks(dist, pkg)
	await registerUrlScheme(dist, pkg)
 	await fixFolderPermissions(dist, pkg)
}

/**
 * Manually fix broken symbolic links created by NWJS on bundled app.
 * @param {String} dist - Absolute path of directory where app will be bundled
 *  and packaged.
 */
const fixSymbolicLinks = async (dist, pkg) => {
	// NWB transforms realtive symlinks into absolute ones, which totally breaks
	// the application when you run it from another machine. So for now, we will
	// just manually fix those symlinks
	const version = path.basename(await fs.readlink(path.join(
		dist,
		'bundle',
		`${getExecutableName(pkg['executable-name'])}.app`,
		'Contents',
		'Frameworks',
		'nwjs Framework.framework',
		'Versions',
		'Current'
	)))
	execute(async ({ exec }) => {
		await exec(`
			cd "$(find ${dist} -name "nwjs Framework.framework")"
			rm "Helpers" && ln -s "./Versions/Current/Helpers" "./Helpers"
			rm "Libraries" && ln -s "./Versions/Current/Libraries" "./Libraries"
			rm "nwjs Framework" && ln -s "./Versions/Current/nwjs Framework" "./nwjs Framework"
			rm "Resources" && ln -s "./Versions/Current/Resources" "./Resources"
			rm "XPCServices" && ln -s "./Versions/Current/XPCServices" "./XPCServices"
			cd Versions
			rm "Current" && ln -s "./${version}" "./Current"
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


const fixFolderPermissions = async (dist, pkg) => {
	const executableName = pkg['executable-name']
	const folderPath = path.resolve(
		dist,
		'bundle',
		`${getExecutableName(executableName)}.app`,
		'Contents',
		'Resources',
		'app.nw'
	)
	return chmod(folderPath, 0755)
}
