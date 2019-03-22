const NWB = require('nwjs-builder')
const fs = require('fs').promises
const path = require('path')
const rimraf = require('../utils/rimraf')
const download = require('../utils/download')
const unzip = require('../utils/unzip')
const execute = require('../utils/execute')

/**
 * Identifies the current environment this bundle running: `dev`, `stage` or
 * `production`
 * @return {String}
 */
const getEnvironment = () => {
	return process.env.NODE_ENV || 'dev'
}

/**
 * Identifies what is the NWJS version that should be installed based on the
 * current environment.
 * @param {String} baseVersion - Base version number for NWJS
 * @return {String}
 */
const getNwjsVersion = (baseVersion) => {
	if (getEnvironment() === 'production') {
		return baseVersion
	} else {
		return `${baseVersion}-sdk`
	}
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
			return `DEV ${baseName}`
			break;
		case 'stage':
			return `STAGE ${baseName}`
			break;
		case 'production':
			return baseName
			break;
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
			return `${baseScheme}-dev`
			break;
		case 'stage':
			return `${baseScheme}-stage`
			break;
		case 'production':
			return baseScheme
			break;
	}
}

/**
 * Identifies what is the path for the package.json of the application, after
 * bundling and based in the current platform.
 * @param {String} platform - Platform to bundle for.
 * @param {String} baseName - Base executable/display name
 * @param {String} output - Absolute path of directory containing bundled app.
 * @return {String}
 */
const getBundledPackagePath = (platform, baseName, output) => {
	switch (platform) {
		case 'win32':
			return path.resolve(output, 'bundle', 'package.json')
			break;
		case 'darwin':
			return path.resolve(output, 'bundle', `${getExecutableName(baseName)}.app`, 'Contents', 'Resources', 'app.nw', 'package.json')
			break;
		case 'linux':
			return path.resolve(output, 'bundle', 'package.json')
			break;
	}
}

/**
 * Bundles a NWJS application from a `src` to an `output` directory. The final
 * bundle will live inside a folder `bundle` inside the `output` directory.
 * @param {String} src - Absolute path of directory containing app source code.
 * @param {String} output - Absolute path of directory to contain bundled app.
 * @return {Promise}
 */
const build = async (src, output) => {
	const appPkg = require(path.resolve(src, 'package.json'))
	// bundle source code
	await new Promise((resolve, reject) => {
		NWB.commands.nwbuild(
			src,
			{
				outputDir: output,
				version: getNwjsVersion(appPkg['nwjs-version']),
				outputName: 'bundle',
				executableName: getExecutableName(appPkg['executable-name']),
				sideBySide: true,
				macIcns: path.resolve(src, 'nwjs-assets', 'darwin', 'icon.icns')
				// Disavbled windows icon, see manaul resourcehacker call below
				// winIco         : path.resolve(PLATFORM_ASSETS_DIR, 'icon.ico'),
			},
			error => {
				if (error) {
					return reject(error)
				}
				return resolve()
			}
		)
	})
}

/**
 * Updates the bundled `package.json` manifest file on the bundled nwjs source
 * code. This action is responsible for updating the version and names that are
 * sensitive to the environment being built (dev, stage, production).
 * @param {String} platform - Platform to bundle for.
 * @param {String} src - Absolute path of directory containing app source code.
 * @param {String} output - Absolute path of directory containing bundled app.
 */
const updatePackageManifest = async (platform, src, output) => {
	const outputPackage = JSON.parse(await fs.readFile((path.resolve(src, 'package.json'))))
	const srcPackage = JSON.parse(await fs.readFile((path.resolve('./', 'package.json'))))
	const outputPackagePath = getBundledPackagePath(
		platform,
		outputPackage['display-name'],
		output
	)
	// Writes the version from `package.json` from current project running the
	// bundle cmmand to the one on the bundled app.
	outputPackage.version = srcPackage.version
	// Rewrite `autoupdate` url
	outputPackage['autoupdate'] = outputPackage['autoupdate'][getEnvironment()]
	// Rewrite `display-name` and `executable-name`
	outputPackage['display-name'] = getExecutableName(outputPackage['display-name'])
	outputPackage['executable-name'] = getExecutableName(outputPackage['executable-name'])
	// Rewrite `url-scheme`
	outputPackage['url-scheme'] = getUrlScheme(outputPackage['url-scheme'])
	// Rewrite `nwjs-version`
	outputPackage['nwjs-version'] = getNwjsVersion(outputPackage['nwjs-version'])

	await fs.writeFile(
		outputPackagePath,
		JSON.stringify(outputPackage, null, '\t')
	)
}

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
 * @param {String} src - Absolute path of directory containing bundled app.
 */
const resourceHacker = async (src) => {
	// NWB calls ResourceHacker internally (by using the node-resourcehacker
	// module). But as this module hasn't been updated to the new command line
	// arguments of ResourceHacker.exe, we will download our own binary and call
	// it manually
	// download and unzinp Resource Hacker
	await downloadResourceHacker()
	const appPkg = require(path.resolve(src, 'bundle', 'package.json'))
	execute(({ exec }) => {
		return exec(
			`"${path.resolve(__dirname, 'rh', 'ResourceHacker.exe')}" ` +
			`-open "${path.resolve(src, 'bundle', `${appPkg['executable-name']}.exe`)}" ` +
			`-save "${path.resolve(src, 'bundle', `${appPkg['executable-name']}.exe`)}" ` +
			'-action addoverwrite ' +
			`-res "${path.resolve(src, 'bundle', 'nwjs-assets', 'win32', 'icon.ico')}" ` +
			'-mask ICONGROUP, IDR_MAINFRAME'
		)
	})
}

/**
 * Manually fix broken symbolic links created by NWJS on bundled app.
 * @param {String} output - Absolute path of directory to contain bundled app.
 */
const fixSymbolicLinks = async (output) => {
	// NWB transforms realtive symlinks into absolute ones, which totally breaks
	// the application when you run it from another machine. So for now, we will
	// just manually fix those symlinks
	execute(async ({ exec }) => {
		await exec(`
			cd "$(find ${output} -name "nwjs Framework.framework")"
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
 * @param {String} src - Absolute path of directory containing app source code.
 * @param {String} output - Absolute path of directory to contain bundled app.
 */
const registerUrlSchemeDarwin = async (src, output) => {
	// Register the app url scheme, by modifying the Info.plist
	// eslint-disable-next-line global-require,import/no-extraneous-dependencies
	const plist = require('plist')
	const outputPackage = JSON.parse(await fs.readFile(path.resolve(src, 'package.json')))
	const appPkg = require(getBundledPackagePath(
		'darwin',
		outputPackage['display-name'],
		output
	))
	const plistPath = path.resolve(output, 'bundle', `${appPkg['executable-name']}.app`, 'Contents', 'Info.plist')
	const plistObject = plist.parse((await fs.readFile(plistPath, 'utf8')).toString())
	plistObject.CFBundleURLTypes.push({
		CFBundleURLName    : `${appPkg['executable-name']} URL`,
		CFBundleURLSchemes : [appPkg['url-scheme']]
	})
	await fs.writeFile(plistPath, plist.build(plistObject))
}

/**
 * Bundles and adjust bundled source according with platform.
 * @param {String} src - Absolute path of directory containing app source code.
 * @param {String} output - Absolute path of directory to contain bundled app.
 * @param {String} platform - Platform to bundle for.
 * @param {String} architecture - Architecture to bundle for.
 */
module.exports = async (src, output, platform, architecture) => {
	await build(src, output)
	await updatePackageManifest(platform, src, output)
	if (platform == 'win32') {
		await resourceHacker(output)
	}
	if (platform == 'darwin') {
		await fixSymbolicLinks(output)
		await registerUrlSchemeDarwin(src, output)
	}
	if (platform == 'linux') {
		console.log('Nothing to do on linux')
	}
}
