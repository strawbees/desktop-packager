const path = require('path')
const fs = require('fs').promises
const execute = require('../utils/execute')
const appdmg = require('appdmg')
const plist = require('plist')

const assetsFolder = path.resolve(__dirname, '..', 'assets', 'darwin')
const dmgTemplatePath = path.resolve(assetsFolder, 'dmg.json.template')
const dmgConfigPath = path.resolve(assetsFolder, 'dmg.json')

/**
 * Register URL Scheme on OSX by updating `Info.plist` file.
 */
const registerUrlScheme = async (src, appPkg) => {
	// Register the app url scheme, by modifying the Info.plist
	const plistPath = path.resolve(
		src,
		`${appPkg['executable-name']}.app`,
		'Contents',
		'Info.plist'
	)
	const plistFile = await fs.readFile(plistPath, 'utf8')
	const plistObject = plist.parse(plistFile.toString())
	plistObject.CFBundleURLTypes.push({
		CFBundleURLName    : `${appPkg['executable-name']} URL`,
		CFBundleURLSchemes : [appPkg['url-scheme']]
	})
	await fs.writeFile(plistPath, plist.build(plistObject))
}

const bakeDmgConfig = async (src, appPkg) => {
	const templateFile = await fs.readFile(dmgTemplatePath)
	const template = templateFile.toString()
		.split('{{APP_NAME}}').join(appPkg['display-name'].substring(0, 27))
		.split('{{APP_EXECUTABLE_NAME}}').join(appPkg['executable-name'])
		.split('{{ASSETS_FOLDER}}').join(
			path.resolve(
				src,
				`${appPkg['executable-name']}.app`,
				'Contents',
				'Resources',
				'app.nw',
				'nwjs-assets',
				'darwin'
			)
		)
		.split('{{RELATIVE_BUILD_PATH}}').join(src)
	return fs.writeFile(dmgConfigPath, template)
}

const createDmg = async (outputInstallerPath) => {
	return new Promise((resolve, reject) => {
		const dmg = appdmg({
			source: dmgConfigPath,
			target: outputInstallerPath
		})
		dmg.on('finish', resolve)
		dmg.on('error', reject)
	})
}

module.exports = async (src, appPkg, outputInstallerPath) => {
	console.log('packaging for darwin')
	await registerUrlScheme(src, appPkg)
	await bakeDmgConfig(src, appPkg)
	await createDmg(outputInstallerPath)
}
