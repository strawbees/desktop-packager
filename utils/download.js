const fs = require('fs')
const request = require('request')

module.exports = async (url, path) => {
	await new Promise((resolve, reject) => {
		request.get(url)
			.on('error', async (err) => {
				await fs.promises.unlink(path)
				reject(err)
			})
			.on('response', async (response) => {
				resolve()
			})
			.pipe(fs.createWriteStream(path))
	})
}
