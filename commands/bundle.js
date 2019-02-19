const NWB = require('nwjs-builder')
const fs = require('fs').promises
const path = require('path')
const rimraf = require('../utils/rimraf')
const download = require('../utils/download')
const unzip = require('../utils/unzip')
const execute = require('../utils/execute')

const getPackage = async (src) => {
	// retrive the app package
	const pkgPath = path.resolve(src, 'package.json')
	const pkgFile = (await fs.readFile(pkgPath)).toString()
	return JSON.parse(pkgFile)
}

const build = async (src, output) => {
	const appPkg = getPackage(src)
	// bundle source code
	return new Promise((resolve, reject) => {
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

const resourceHacker = async (output) => {
	// NWB calls ResourceHacker internally (by using the node-resourcehacker
	// module). But as this module hasn't been updated to the new command line
	// arguments of ResourceHacker.exe, we will download our own binary and call
	// it manually
	// download and unzinp Resource Hacker
	await downloadResourceHacker()
	const appPkg = getPackage(output + '/bundle')
	execute(({ exec }) => {
		return exec(
			`"${path.resolve(__dirname, 'rh', 'ResourceHacker.exe')}" ` +
			`-open "${path.resolve(output, 'app', `${appPkg['executable-name']}.exe`)}" ` +
			`-save "${path.resolve(output, 'app', `${appPkg['executable-name']}.exe`)}" ` +
			'-action addoverwrite ' +
			`-res "${path.resolve(output, 'nwjs-assets', 'win32', 'icon.ico')}" ` +
			'-mask ICONGROUP, IDR_MAINFRAME'
		)
	})
}

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

const registerUrlSchemeDarwin = async (output) => {
	// Register the app url scheme, by modifying the Info.plist
	// eslint-disable-next-line global-require,import/no-extraneous-dependencies
	const plist = require('plist')
	const appPkg = getPackage(output)
	const plistPath = path.resolve(output, 'app', `${appPkg['executable-name']}.app`, 'Contents', 'Info.plist')
	const plistObject = plist.parse((await fs.readFile(plistPath, 'utf8')).toString())
	plistObject.CFBundleURLTypes.push({
		CFBundleURLName    : `${appPkg['executable-name']} URL`,
		CFBundleURLSchemes : [appPkg['url-scheme']]
	})
	await fs.writeFile(plistPath, plist.build(plistObject))
}

module.exports = async (src, output, platform, architecture) => {
	await build(src, output)
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
