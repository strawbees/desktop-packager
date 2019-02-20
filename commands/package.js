const path = require('path')
const fs = require('fs').promises
const packageWindowsInstaller = require('./package-win32')
const packageDarwinDmg = require('./package-darwin')
const packageLinux = require('./package-linux')
const zipdir = require('../utils/zipdir')

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

module.exports = async (src, dist, platform, architecture) => {
	console.log('packaging', src, dist, platform, architecture)

	// Application package json
	const appPkg = require(path.resolve(src, 'package.json'))

	// Define the path where the packaged app (windows installer and dmg),
	// source and latest manifest will live.
	const outputFolder = path.resolve(dist, 'versions', platform, architecture)
	const outputInstallerName = `${appPkg['executable-name']}-${platform}-${architecture}-${appPkg.version}`
	const outputInstallerPath = `${path.resolve(outputFolder, outputInstallerName)}${addExtension(platform)}`
	const outputSourcePath = `${path.resolve(outputFolder, outputInstallerName)}-src.zip`
	const outputManifestPath = path.resolve(outputFolder, `latest.json`)

	// Make sure output folder exists
	await fs.mkdir(outputFolder, {recursive: true})

	// Package app according with platform
	if (platform == 'win32') {
		// Create windows installer
		packageWindowsInstaller(src, outputInstallerPath)
	}
	if (platform == 'darwin') {
		// Create macos dmg
		packageDarwinDmg(src, outputInstallerPath)
	}
	if (platform == 'linux') {
		// Zip bundled app to distribute
		packageLinux(src, outputInstallerPath)
	}

	// Zip the source code
	await zipdir(src, outputSourcePath,'')

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
