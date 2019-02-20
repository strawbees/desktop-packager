const path = require('path')
const fs = require('fs').promises
const execute = require('../utils/execute')

const assetsFolder = path.resolve(__dirname, '..', 'assets', 'win32')
const nsiTemplatePath = path.resolve(assetsFolder, 'installer.template.nsi')
const nsiFilePath = path.resolve(assetsFolder, 'installer.nsi')

const bakeNsiFile = async (appPkg, src, output) => {
	const template = (await fs.readFile(nsiTemplatePath)).toString()
		.split('{{APP_NAME}}').join(appPkg['display-name'])
		.split('{{APP_EXECUTABLE_NAME}}').join(appPkg['executable-name'])
		.split('{{APP_VERSION}}').join(appPkg.version)
		.split('{{APP_PUBLISHER}}').join(appPkg.publisher)
		.split('{{APP_URL_SCHEME}}').join(appPkg['url-scheme'])
		.split('{{SOURCE_PATH}}').join(src)
		.split('{{TEMP_BUILD_PATH}}').join(assetsFolder)
		.split('{{FINAL_BUILD_PATH}}').join(output)
	return  fs.writeFile(nsiFilePath, template)
}

const runNSIS = async () => {
	return new Promise((resolve, reject) => {
		execute(async ({ exec }) => {
			try {
				await exec(`makensis.exe /V4 ${nsiFilePath}`)
				resolve()
			} catch(err) {
				reject(err)
			}
		})
	})
}

module.exports = async (src, output, outputInstallerName) => {
	console.log('packaging for windows')
	const appPkg = require(path.resolve(src, 'package.json'))
	// This is defined inside `assets/win32/installer.template.nsi`
	const installerName = `${appPkg['executable-name']}-installer.exe`
	await bakeNsiFile(appPkg, src, output)
	await runNSIS()
	await fs.copyFile(
		path.resolve(assetsFolder, installerName),
		path.resolve(output, `${outputInstallerName}.exe`),
	)
}
