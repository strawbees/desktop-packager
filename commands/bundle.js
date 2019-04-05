const NWB = require('nwjs-builder')
const fs = require('fs').promises
const path = require('path')
const bundleWin32 = require('./bundle-win32')
const bundleDarwin = require('./bundle-darwin')

/**
 * Identifies the current environment this bundle running: `dev`, `stage` or
 * `production`
 * @return {String}
 */
const getEnvironment = () => {
	return process.env.NODE_ENV || 'dev'
}

/**
 * Returns the NWJS Builder platform which is different from the Node standards
 * it's used everywhere else (it actually merges platform and architecture)
 * @param {String} nodePlatform - Nodejs platform.
 * @param {String} nodeArch - Nodejs architecture.
 * @return {String}
 */
const getNWBPlatform = (nodePlatform, nodeArch) => {
  let nwbPlatform = '';
  switch(nodePlatform) {
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
  switch(nodeArch) {
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
 * Bundles a NWJS application from a `src` to an `dist` directory. The final
 * bundle will live inside a folder `bundle` inside the `dist` directory.
 * @param {String} src - Absolute path of directory containing app source code.
 * @param {String} dist - Absolute path of directory to contain bundled app.
 * @return {Promise}
 */
const build = async (src, dist, nwbPlatform) => {
	const appPkg = require(path.resolve(src, 'package.json'))
	// bundle source code
	await new Promise((resolve, reject) => {
		NWB.commands.nwbuild(
			src,
			{
        platforms: nwbPlatform,
				outputDir: dist,
				version: getNwjsVersion(appPkg['nwjs-version']),
				outputName: 'bundle',
				executableName: getExecutableName(appPkg['executable-name']),
				sideBySide: true,
				macIcns: path.resolve(src, 'nwjs-assets', 'darwin', 'icon.icns')
				// Disabled windows icon, see manaul resourcehacker call below
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
 * code. This action is responsible for updating names and urls that are
 * sensitive to the environment being built (dev, stage, production).
 * @param {String} outputPackagePath - Absolute path of bundled app's
 *  package.json.
 */
const updatePackageManifest = async (outputPackagePath) => {
  const outputPackage = require(outputPackagePath)
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
 * Bundles and adjust bundled source according with platform.
 * @param {String} src - Absolute path of directory containing app source code.
 * @param {String} dist - Absolute path of directory to contain bundled app.
 * @param {String} platform - Platform to bundle for.
 * @param {String} architecture - Architecture to bundle for.
 */
module.exports = async (src, dist, platform, architecture) => {
  // NWB uses a different platform format that merges platform and architecture
  let nwbPlatform = getNWBPlatform(platform, architecture)
  // Build app (bundle)
	await build(src, dist, nwbPlatform)

	if (platform == 'win32') {
    let bundledPackagePath = bundleWin32.getBundledPackagePath(dist)
    await updatePackageManifest(bundledPackagePath)
		await bundleWin32.resourceHacker(dist)
	}

	if (platform == 'darwin') {
    // The "source" package has important information such as `executable-name`.
    // Without knowing before hand the executable name, it's impossible to know
    // where the bundled `package.json` will be on macos.
    let srcPackagePath = path.resolve('./', 'src', 'package.json')
    let srcPackage = require(srcPackagePath)
    let bundledPackagePath = bundleDarwin.getBundledPackagePath(
      dist, getExecutableName(srcPackage['executable-name'])
    )
    await updatePackageManifest(bundledPackagePath)
		await bundleDarwin.fixSymbolicLinks(dist)
		await bundleDarwin.registerUrlSchemeDarwin(dist, bundledPackagePath)
	}

	if (platform == 'linux') {
		console.log('Nothing to do on linux')
	}
}
