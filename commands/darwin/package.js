const path = require('path')
const fs = require('fs').promises
const execute = require('../../utils/execute')
const appdmg = require('appdmg')
const plist = require('plist')

const assetsFolder = path.resolve(__dirname, '..', '..', 'assets', 'darwin')
const dmgTemplatePath = path.resolve(assetsFolder, 'dmg.json.template')
const dmgConfigPath = path.resolve(assetsFolder, 'dmg.json')

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
	await bakeDmgConfig(src, appPkg)
	// Remove previous `.dmg` if it exists
	try {
		await fs.access(outputInstallerPath)
		await fs.unlink(outputInstallerPath)
	} catch(e) {
		// File does not exist
	}
	await createDmg(outputInstallerPath)
}
