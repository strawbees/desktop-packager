const path = require('path')
const fs = require('fs').promises
const execute = require('../../utils/execute')
const download = require('../../utils/download')
const folderSize = require('../../utils/folderSize')

const assetsFolder = path.resolve(__dirname, '..', '..', 'assets', 'win32')
const nsiTemplatePath = path.resolve(assetsFolder, 'installer.template.nsi')
const nsiFilePath = path.resolve(assetsFolder, 'installer.nsi')

const downloadDriver = async (url, filename) => {
	const driverFolderPath = path.resolve(assetsFolder, 'drivers')
	try {
		await fs.mkdir(driverFolderPath)
	} catch (e) {
		// Folder already exists
	}
	await download(url, path.resolve(driverFolderPath, filename))
}

const calculateInstallationSize = async (src) =>
	await folderSize(src) / 1024 // in Kilobytes


const bakeNsiFile = async (appPkg, src) => {
	const driverInstaller = appPkg.driver ? appPkg.driver.filename : ''
	const template = (await fs.readFile(nsiTemplatePath)).toString()
		.split('{{APP_NAME}}').join(appPkg['display-name'])
		.split('{{APP_EXECUTABLE_NAME}}').join(appPkg['executable-name'])
		.split('{{APP_VERSION}}').join(appPkg.version)
		.split('{{APP_PUBLISHER}}').join(appPkg.publisher)
		.split('{{APP_URL_SCHEME}}').join(appPkg['url-scheme'])
		.split('{{APP_SIZE}}').join(await calculateInstallationSize(src))
		.split('{{SOURCE_PATH}}').join(src)
		.split('{{TEMP_BUILD_PATH}}').join(assetsFolder)
		.split('{{DRIVER_INSTALLER}}').join(driverInstaller)
	return fs.writeFile(nsiFilePath, template)
}

const runNSIS = async () => new Promise((resolve, reject) => {
	execute(async ({ exec }) => {
		try {
			await exec(`makensis.exe /V4 ${nsiFilePath}`)
			resolve()
		} catch (err) {
			reject(err)
		}
	})
})

module.exports = async (src, outputInstallerPath) => {
	console.log('packaging for windows')
	const appPkg = require(path.resolve(src, 'package.json'))
	if (appPkg.driver) {
		await downloadDriver(appPkg.driver.url, appPkg.driver.filename)
	}
	// This is defined inside `assets/win32/installer.template.nsi`
	const installerName = `${appPkg['executable-name']}-installer.exe`
	await bakeNsiFile(appPkg, src)
	await runNSIS()
	await fs.copyFile(
		path.resolve(assetsFolder, installerName),
		path.resolve(outputInstallerPath),
	)
}
