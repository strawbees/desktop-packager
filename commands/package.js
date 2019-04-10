const path = require('path')
const fs = require('fs').promises
const packageLinux = require('./package-linux')
const zipdir = require('../utils/zipdir')

/**
 * Return an extension for the final packaged binary based on `platform`.
 * @param {String} platform - Current packaging platform
 */
const addExtension = (platform) => {
	if (platform == 'win32') {
		return '.exe'
	}
	if (platform == 'darwin') {
		return '.dmg'
	}
	if (platform == 'linux') {
		return '.zip'
	}
}

/**
 * Packages a bundled NWJS app into an executable binary, compress the source
 * code for autoupdates and create a manifest pointing to binary and compressed
 * source. A directory structure will be created at the `output` to separate
 * files by `platform`, `architecture` and version.
 * @param {String} src - Absolute path of directory containing bundled app.
 * @param {String} dist - Absolute path of directory to contain packaged app,
 * compressed source and "latest" manifest file.
 * @param {String} platform - Platform to bundle for.
 * @param {String} architecture - Architecture to bundle for.
 */
module.exports = async (src, dist, platform, architecture) => {
	console.log('packaging', src, dist, platform, architecture)

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
	const outputManifestPath = path.resolve(outputFolder, `latest.json`)

	// Make sure output folder exists
	await fs.mkdir(outputFolder, {recursive: true})

	// Package app according with platform
	if (platform == 'win32') {
		const packageWindowsInstaller = require('./package-win32')
		// Create windows installer
		await packageWindowsInstaller(src, outputInstallerPath)
	}
	if (platform == 'darwin') {
		const packageDarwinDmg = require('./package-darwin')
		// Create macos dmg
		await packageDarwinDmg(
			src, // Folder containing bundled app
			appPkg, // Bundled manifest object (`package.json` of bundled app)
			outputInstallerPath // Final file path for `dmg`
		)
	}
	if (platform == 'linux') {
		// Zip bundled app to distribute
		await packageLinux(src, outputInstallerPath)
	}

	// Compress source code
	await zipdir(src, outputSourcePath, '')

	// Write latest manifest
	fs.writeFile(
		outputManifestPath,
		JSON.stringify({
			name: appPkg['display-name'],
			version: appPkg.version,
			createdAt: new Date(),
			installer: {
				path: `${outputInstallerName}${addExtension(platform)}`
			},
			src: {
				path: `${outputInstallerName}-src.zip`
			}
		})
	)
}
