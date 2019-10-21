const fs = require('fs')
const request = require('request')

module.exports = async (url, path) => {
	await new Promise((resolve, reject) => {
		const file = fs.createWriteStream(path)
		file.on('finish', () => {
			file.close(async (err) => {
				if (err) {
					await fs.promises.unlink(path)
					return reject(err)
				}
				return resolve()
			})
		})
		request.get(url)
			.on('error', async (err) => {
				await fs.promises.unlink(path)
				reject(err)
			})
			.pipe(file)
	})
}
