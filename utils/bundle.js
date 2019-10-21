const NWB = require('nwjs-builder')
const path = require('path')
const fs = require('fs').promises

/**
* Identifies the current environment this bundle running: `dev`, `stage` or
* `production`
* @return {String}
*/
const getEnvironment = () => process.env.NODE_ENV || 'dev'

/**
* Identifies what is the NWJS version that should be installed based on the
* current environment.
* @param {String} baseVersion - Base version number for NWJS
* @return {String}
*/
const getNwjsVersion = (baseVersion) => {
	if (getEnvironment() === 'production') {
		return baseVersion
	}
	return `${baseVersion}-sdk`
}

/**
* Identifies what is the executable/display name for the application based on
* current environment.
* @param {String} baseName - Base executable/display name
* @return {String}
*/
const getExecutableName = (baseName) => {
	switch (getEnvironment()) {
		case 'dev':
		default:
			return `DEV ${baseName}`
		case 'stage':
			return `STAGE ${baseName}`
		case 'production':
			return baseName
	}
}

/**
* Identifies what is url scheme to be registered based on current environment.
* @param {String} baseScheme - Base url scheme
* @return {String}
*/
const getUrlScheme = (baseScheme) => {
	switch (getEnvironment()) {
		case 'dev':
		default:
			return `${baseScheme}-dev`
		case 'stage':
			return `${baseScheme}-stage`
		case 'production':
			return baseScheme
	}
}

/**
* Updates the bundled `package.json` manifest file on the bundled nwjs source
* code. This action is responsible for updating names and urls that are
* sensitive to the environment being built (dev, stage, production).
* @param {String} dist - Absolute path of distribution directory
* @return {Promise}
*/
const updatePackageManifest = async (outputPackagePath) => {
	const outputPackage = require(outputPackagePath)
	// Rewrite `autoupdate` url
	outputPackage.autoupdate = outputPackage.autoupdate[getEnvironment()]
	// Rewrite `display-name` and `executable-name`
	outputPackage['display-name'] = getExecutableName(outputPackage['display-name'])
	outputPackage['executable-name'] = getExecutableName(outputPackage['executable-name'])
	// Rewrite `url-scheme`
	outputPackage['url-scheme'] = getUrlScheme(outputPackage['url-scheme'])
	// Rewrite `nwjs-version`
	outputPackage['nwjs-version'] = getNwjsVersion(outputPackage['nwjs-version'])
	return fs.writeFile(
		outputPackagePath,
		JSON.stringify(outputPackage, null, '\t')
	)
}

/**
 * Returns the absolute path of the bundled app `package.json`.
 * @param {String} dist - Absolute path of distribution directory.
 * @return {String}
 */
const getWin32PackagePath = (dist) => path.resolve(dist, 'bundle', 'package.json')

/**
 * Returns the absolute path where the `package.json` should be on bundled app.
 * @param {String} dist - Absolute path of directory where app will be bundled
 *  and packaged.
 * @param {Object} pkg - Source codes's `package.json` object.
 * @return {String}
 */
const getDarwinPackagePath = (dist, pkg) => path.resolve(
	dist,
	'bundle',
	`${getExecutableName(pkg['executable-name'])}.app`,
	'Contents',
	'Resources',
	'app.nw',
	'package.json'
)

/**
* Returns the NWJS Builder platform which is different from the Node standards
* it's used everywhere else (it actually merges platform and architecture)
* @param {String} nodePlatform - Nodejs platform.
* @param {String} nodeArch - Nodejs architecture.
* @return {String}
*/
const getNWBPlatform = (nodePlatform, nodeArch) => {
	let nwbPlatform = ''
	switch (nodePlatform) {
		case 'darwin':
			nwbPlatform += 'osx'
			break
		case 'win32':
			nwbPlatform += 'win'
			break
		case 'linux':
			nwbPlatform += 'linux'
			break
		default:
			break
	}
	switch (nodeArch) {
		case 'ia32':
			nwbPlatform += '32'
			break
		case 'x64':
			nwbPlatform += '64'
			break
		default:
			break
	}
	return nwbPlatform
}

/**
* Bundles a NWJS application from a `src` to an `dist` directory. The final
* bundle will live inside a folder `bundle` inside the `dist` directory.
* @param {String} src - Absolute path of directory containing app source code.
* @param {String} dist - Absolute path of directory to contain bundled app.
* @param {String} nwbPlatform - NWJS Builder platform string
 * @param {Object} pkg - Source codes's `package.json` object.
* @return {Promise}
*/
const bundle = async (src, dist, nwbPlatform, pkg) =>
	// bundle source code
	new Promise((resolve, reject) => {
		NWB.commands.nwbuild(
			src,
			{
				platforms      : nwbPlatform,
				outputDir      : dist,
				version        : getNwjsVersion(pkg['nwjs-version']),
				outputName     : 'bundle',
				executableName : getExecutableName(pkg['executable-name']),
				sideBySide     : true,
				macIcns        : path.resolve(src, 'nwjs-assets', 'darwin', 'icon.icns')
				// Disabled windows icon, see manaul resourcehacker call below
				// winIco: path.resolve(PLATFORM_ASSETS_DIR, 'icon.ico'),
			},
			error => {
				if (error) {
					return reject(error)
				}
				return resolve()
			}
		)
	})


module.exports = {
	getEnvironment,
	getNwjsVersion,
	getExecutableName,
	getUrlScheme,
	updatePackageManifest,
	getWin32PackagePath,
	getDarwinPackagePath,
	getNWBPlatform,
	bundle
}
