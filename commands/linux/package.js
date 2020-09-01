const zipdir = require('../../utils/zipdir')

module.exports = async (src, outputInstallerPath) => {
	console.log('packaging for linux')
	await zipdir(src, outputInstallerPath)
}
