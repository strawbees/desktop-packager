const path = require('path')
const fs = require('fs').promises
const execute = require('../utils/execute')

const assetsFolder = path.resolve(__dirname, '..', 'assets', 'darwin')
const dmgTemplatePath = path.resolve(assetsFolder, 'dmg.json.template')
const dmgConfigPath = path.resolve(assetsFolder, 'dmg.json')
const dmgPath = path.resolve(assetsFolder, 'dmg.json')

const bakeDmgConfig = async (appPkg) => {
	const template = (await fs.readFile(dmgTemplatePath)).toString()
		.split('{{APP_NAME}}').join(appPkg['display-name'].substring(0, 27))
		.split('{{APP_EXECUTABLE_NAME}}').join(appPkg['executable-name'])
		.split('{{APP_VERSION}}').join(appPkg.version)
		.split('{{APP_PUBLISHER}}').join(appPkg.publisher)
		.split('{{APP_URL_SCHEME}}').join(appPkg['url-scheme'])
		.split('{{RELATIVE_BUILD_PATH}}').join(path.relative(assetsFolder, assetsFolder))
	return fs.writeFile(dmgConfigPath, template)
}

const createDmg = async (outputInstallerPath) => {
	return new Promise((resolve, reject) => {
		// eslint-disable-next-line import/no-extraneous-dependencies, global-require
		const appdmg = require('appdmg')
		const dmg = appdmg({
			source : dmgConfigPath,
			target : outputInstallerPath
		})
		dmg.on('finish', resolve)
		dmg.on('error', reject)
	})
}

const registerUrlScheme = async (src, appPkg) => {
	// Register the app url scheme, by modifying the Info.plist
	// eslint-disable-next-line global-require,import/no-extraneous-dependencies
	const plist = require('plist')
	const plistPath = path.resolve(src, `${appPkg['executable-name']}.app`, 'Contents', 'Info.plist')
	const plistObject = plist.parse((await fs.readFile(plistPath, 'utf8')).toString())
	plistObject.CFBundleURLTypes.push({
		CFBundleURLName    : `${appPkg['executable-name']} URL`,
		CFBundleURLSchemes : [appPkg['url-scheme']]
	})
	return fs.writeFile(plistPath, plist.build(plistObject))
}

module.exports = async (src, outputInstallerPath) => {
	console.log('package darwin')
	const appPkg = require(path.resolve(src, 'package.json'))
	await registerUrlScheme(src, appPkg)
	await bakeDmgConfig(appPkg)
	await createDmg(outputInstallerPath)
}
