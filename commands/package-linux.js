const zipdir = require('../utils/zipdir')

module.exports = async (src, outputInstallerPath) => {
	console.log('package linux')
	zipdir(src, outputInstallerPath)
}
