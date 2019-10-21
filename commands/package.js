const path = require('path')
const fs = require('fs').promises
const zipdir = require('../utils/zipdir')

/**
 * Packages a bundled NWJS app into an executable binary, compress the source
 * code for autoupdates and create a manifest pointing to binary and compressed
 * source. A directory structure will be created at the `output` to separate
 * files by `platform`, `architecture` and version.
 * @param {String} src - Absolute path of directory containing bundled app.
 * @param {String} dist - Absolute path of distribution directory.
 * @param {String} platform - Platform to bundle for.
 * @param {String} architecture - Architecture to bundle for.
 * @param {Boolean} notarizeFlag - If the app should be sent for notarization.
 */
module.exports = async (src, dist, platform, architecture, notarizeFlag) => {
	console.log('packaging', src, dist, platform, architecture, notarizeFlag)

	// Bundled application package json
	const appPkg = require(path.resolve(src, 'package.json'))
	// Absolute path of where the files generated should be.
	const outputFolder = path.resolve(dist, 'versions', platform, architecture)
	// Base name for files to be generated without extension
	const outputInstallerName = `${appPkg['executable-name']}-${platform}-${architecture}-${appPkg.version}`
	// Absolute path of where should the packaged binary be located
	const outputInstallerPath = `${path.resolve(outputFolder, outputInstallerName)}${addExtension(platform)}`
	// Absolute path of where should the compressed source code be located
	const outputSourcePath = `${path.resolve(outputFolder, outputInstallerName)}-src.zip`
	// Absolute path of where should the manifest file be located
	const outputManifestPath = path.resolve(outputFolder, 'latest.json')

	// Make sure output folder exists
	await fs.mkdir(outputFolder, { recursive : true })

	// Package app according with platform
	if (platform === 'win32') {
		const packageWindowsInstaller = require('./win32/package')
		await packageWindowsInstaller(src, outputInstallerPath)
	}
	if (platform === 'darwin') {
		const packageDarwinDmg = require('./darwin/package')
		await packageDarwinDmg(
			src, // Folder containing bundled app
			appPkg, // Bundled manifest object (`package.json` of bundled app)
			outputInstallerPath, // Final file path for `dmg`,
			notarizeFlag
		)
	}
	if (platform === 'linux') {
		// Zip bundled app to distribute
		// const packageLinux = require('./darwin/linux')
		// await packageLinux(src, outputInstallerPath)
	}

	await compressSource(src, outputSourcePath)
	await createManifest(
		outputManifestPath,
		appPkg['display-name'],
		appPkg.version,
		`${outputInstallerName}${addExtension(platform)}`,
		`${outputInstallerName}-src.zip`,
	)
}

/**
 * Return an extension for the final packaged binary based on `platform`.
 * @param {String} platform - Current packaging platform
 */
const addExtension = (platform) => {
	if (platform === 'win32') {
		return '.exe'
	}
	if (platform === 'darwin') {
		return '.dmg'
	}
	if (platform === 'linux') {
		return '.zip'
	}
	return '.zip'
}

/**
 * Compress source code to use in auto updates
 * @param {String} src - Source code path.
 * @param {String} outputSourcePath - Where should the compressed file be created
 */
const compressSource = (src, outputSourcePath) =>
	zipdir(src, outputSourcePath, '')

const createManifest = (outputManifestPath, name, version, installerName, srcName) => {
	// Write latest manifest
	fs.writeFile(
		outputManifestPath,
		JSON.stringify({
			name,
			version,
			createdAt : new Date(),
			installer : {
				path : installerName
			},
			src : {
				path : srcName
			}
		})
	)
}
