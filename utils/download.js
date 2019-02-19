const http = require('http')
const fs = require('fs')
// http.globalAgent = require("caw")(process.env.npm_config_proxy || process.env.http_proxy || process.env.HTTP_PROXY);

module.exports = async (url, path) => {
	const file = fs.createWriteStream(path)
	await new Promise((resolve, reject) => {
		http.get(url, (response) => {
			response.pipe(file)
			file.on('finish', () => {
				file.close((err) => {
					if (err) {
						return reject(err)
					}
					return resolve()
				})
			})
		}).on('error', async (err) => {
			await fs.promises.unlink(path)
			reject(err)
		})
	})
}
