const AdmZip = require('adm-zip')

module.exports = async (src, dst) => new Promise((resolve, reject) => {
	const zip = new AdmZip(src)
	zip.extractAllToAsync(dst, true, (error) => {
		if (error) {
			return reject(error)
		}
		return resolve()
	})
})
