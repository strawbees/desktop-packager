const NWB = require('nwjs-builder')
const fs = require('fs').promises
const path = require('path')
const rimraf = require('../utils/rimraf')
const download = require('../utils/download')
const unzip = require('../utils/unzip')
const execute = require('../utils/execute')

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
				outputDir      : output,
				version        : appPkg['nwjs-version'],
				outputName     : 'bundle',
				executableName : appPkg['executable-name'],
				sideBySide     : true,
				macIcns        : path.resolve(src, 'nwjs-assets', 'darwin', 'icon.icns')
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
 * Writes the version from `package.json` from `src` to the `package.json` on
 * `output`.
 * @param {String} src - Absolute path of directory containing app source code.
 * @param {String} output - Absolute path of directory containing bundled app.
 * @return {Promise}
 */
const writeVersion = async (src, output) => {
	const srcPackagePath = path.resolve(src, 'package.json')
	const outputPackagePath = path.resolve(output, 'bundle', 'package.json')
	const srcPackage = require(srcPackagePath)
	const outputPackage = require(outputPackagePath)
	outputPackage.version = srcPackage.version
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
 * @param {String} output - Absolute path of directory containing bundled app.
 * @return {Promise}
 */
const resourceHacker = async (output) => {
	// NWB calls ResourceHacker internally (by using the node-resourcehacker
	// module). But as this module hasn't been updated to the new command line
	// arguments of ResourceHacker.exe, we will download our own binary and call
	// it manually
	// download and unzinp Resource Hacker
	await downloadResourceHacker()
	const appPkg = require(path.resolve(output, 'bundle', 'package.json'))
	execute(({ exec }) => {
		return exec(
			`"${path.resolve(__dirname, 'rh', 'ResourceHacker.exe')}" ` +
			`-open "${path.resolve(output, 'bundle', `${appPkg['executable-name']}.exe`)}" ` +
			`-save "${path.resolve(output, 'bundle', `${appPkg['executable-name']}.exe`)}" ` +
			'-action addoverwrite ' +
			`-res "${path.resolve(output, 'bundle', 'nwjs-assets', 'win32', 'icon.ico')}" ` +
			'-mask ICONGROUP, IDR_MAINFRAME'
		)
	})
}

/**
 * Manually fix broken symbolic links created by NWJS on bundled app.
 * @param {String} output - Absolute path of directory containing bundled app.
 */
const fixSymbolicLinks = async (output) => {
	// NWB transforms realtive symlinks into absolute ones, which totally breaks
	// the application when you run it from another machine. So for now, we will
	// just manually fix those symlinks
	execute(async ({ exec }) => {
		await exec(`
			cd "$(find . -name "nwjs Framework.framework")"
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
 * @param {String} output - Absolute path of directory containing bundled app.
 */
const registerUrlSchemeDarwin = async (output) => {
	// Register the app url scheme, by modifying the Info.plist
	// eslint-disable-next-line global-require,import/no-extraneous-dependencies
	const plist = require('plist')
	const appPkg = require(path.resolve(output, 'package.json'))
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
	await writeVersion(src, output)
	if (platform == 'win32') {
		await resourceHacker(output)
	}
	if (platform == 'darwin') {
		await fixSymbolicLinks(output)
		await registerUrlSchemeDarwin(output)
	}
	if (platform == 'linux') {
		console.log('Nothing to do on linux')
	}
}
