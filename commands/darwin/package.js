const path = require('path')
const fs = require('fs').promises
const appdmg = require('appdmg')
const execute = require('../../utils/execute')

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

const notarize = async (bundlePath, outputInstallerPath, executableName, bundleIdentifier, developer, password, provider) => {
	// Zip for notarization
	const appPath = path.join(bundlePath, `${executableName}.app`)
	const zipPath = path.join(bundlePath, `${executableName}.zip`)
	await zipForNotarization(appPath, zipPath)

	// Send app for notarization and aquire a requestUUID
	const requestUUID = await uploadToNotarizationServer(zipPath, bundleIdentifier, developer, password, provider)
	console.log('The RequestUUID is: ', requestUUID)

	// Delete the zip
	try {
		await fs.access(zipPath)
		await fs.unlink(zipPath)
	} catch (e) {
		// File does not exist
	}

	// Poll information about the resquest
	let status = ''
	while (status !== 'Package Approved') {
		status = await fetchNotarizationStatus(requestUUID, developer, password)
		console.log('Package status:', status)
		if (status === 'Package Approved') {
			break
		}
		if (status === 'Package Invalid') {
			throw new Error('Could not notarize')
		}
		await new Promise((r) => setTimeout(r, 15000))
	}
}

const zipForNotarization = async (appPath, zipPath) => new Promise((resolve, reject) => {
	execute(async ({ exec }) => {
		try {
			await exec(`/usr/bin/ditto -c -k --keepParent "${appPath}" "${zipPath}"`)
			resolve()
		} catch (err) {
			reject(err)
		}
	})
})

const uploadToNotarizationServer = async (zipPath, bundleIdentifier, developer, password, provider) => new Promise((resolve, reject) => {
	execute(async ({ exec }) => {
		try {
			const { stdout } = await exec(`xcrun altool --notarize-app --primary-bundle-id "${bundleIdentifier}" --username "${developer}" --password "${password}" --asc-provider "${provider}" --file "${zipPath}"`)
			const firstUploadCheck = 'RequestUUID = '
			// Extract the RequestUUID
			if (stdout.indexOf(firstUploadCheck) !== -1) {
				let parts = stdout.split(firstUploadCheck)
				parts = parts[1].split('\n')
				resolve(parts[0])
				return
			}
			reject(new Error('Could not extract requestUUID'))
		} catch (err) {
			// Still try to extract the RequestUUID, in case we try to
			// upload the same application again
			const alreadyUploadedCheck = '"The software asset has already been uploaded. The upload ID is '
			if (err && err.stderr && err.stderr.indexOf(alreadyUploadedCheck) !== -1) {
				let parts = err.stderr.split(alreadyUploadedCheck)
				parts = parts[1].split('"')
				resolve(parts[0])
				return
			}
			reject(err)
		}
	})
})

const fetchNotarizationStatus = async (requestUUID, developer, password) => new Promise((resolve, reject) => {
	execute(async ({ exec }) => {
		try {
			const { stdout } = await exec(`xcrun altool --notarization-info "${requestUUID}"  --username "${developer}" --password "${password}"`)
			let parts = stdout.split('Status Message: ')
			if (parts.length === 1) {
				parts = stdout.split('Status: ')
			}
			parts = parts[1].split('\n')
			resolve(parts[0])
		} catch (err) {
			reject(err)
		}
	})
})

const staple = async (src, executableName) => {
	const appPath = path.join(src, `${executableName}.app`)

	return new Promise((resolve, reject) => {
		execute(async ({ exec }) => {
			try {
				await exec(`xcrun stapler staple "${appPath}"`)
				resolve()
			} catch (err) {
				reject(err)
			}
		})
	})
}

const createDmg = async (outputInstallerPath) => {
	// Remove previous `.dmg` if it exists
	try {
		await fs.access(outputInstallerPath)
		await fs.unlink(outputInstallerPath)
	} catch (e) {
		// File does not exist
	}
	return new Promise((resolve, reject) => {
		const dmg = appdmg({
			source : dmgConfigPath,
			target : outputInstallerPath
		})
		dmg.on('finish', resolve)
		dmg.on('error', reject)
	})
}

module.exports = async (src, appPkg, outputInstallerPath, notarizeFlag) => {
	console.log('packaging for darwin')
	await bakeDmgConfig(src, appPkg)
	if (notarizeFlag) {
		// Notarize
		await notarize(
			src,
			outputInstallerPath,
			appPkg['executable-name'],
			appPkg.nwjsBuilder.bundleIdentifier,
			process.env.APPLE_DEVELOPER_USERNAME,
			process.env.APPLE_DEVELOPER_PASSWORD,
			process.env.APPLE_DEVELOPER_PROVIDER
		)
		// staple the app after notarized
		await staple(src, appPkg['executable-name'])
	}
	// crate the dmg, ready to be published
	await createDmg(outputInstallerPath)
}
